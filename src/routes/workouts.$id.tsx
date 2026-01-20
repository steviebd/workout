import { createFileRoute, useParams, useRouter } from '@tanstack/react-router';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './__root';
import { type Workout } from '@/lib/db/schema';
import { type WorkoutExerciseWithDetails } from '@/lib/db/workout';
import { trackEvent } from '@/lib/posthog';
import { useToast } from '@/components/ToastProvider';


interface WorkoutExercise {
   id: string;
   exerciseId: string;
   name: string;
   muscleGroup: string | null;
   orderIndex: number;
   sets: WorkoutSet[];
   notes: string | null;
 }

interface WorkoutSet {
    id: string;
    workoutExerciseId: string;
    setNumber: number;
    weight: number | null;
    reps: number | null;
    rpe: number | null;
    isComplete: boolean;
    completedAt: string | null;
    createdAt: string | null;
  }

interface Exercise {
   id: string;
   name: string;
   muscleGroup: string | null;
 }

interface NewWorkoutExerciseResponse {
   id: string;
   notes: string | null;
 }

interface ApiError {
   message?: string;
 }

function WorkoutSession() {
  const auth = useAuth();
  const router = useRouter();
  const params = useParams({ from: '/workouts/$id' });
  const toast = useToast();
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showIncompleteSetsConfirm, setShowIncompleteSetsConfirm] = useState(false);
    const fetchedRef = useRef(false);
    const redirectingRef = useRef(false);

    const handleUpdateSet = useCallback(async (
      exerciseId: string,
      setId: string,
      updates: Partial<WorkoutSet>
    ) => {
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates)
      ) as Record<string, number | null>;

      if (cleanUpdates.weight !== null && cleanUpdates.weight < 0) return;
      if (cleanUpdates.reps !== null && cleanUpdates.reps < 0) return;
      if (cleanUpdates.rpe !== null && cleanUpdates.rpe < 0) return;

      try {
        const res = await fetch(`/api/workouts/sets/${setId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(cleanUpdates),
        });

        if (res.ok) {
          setExercises(
            exercises.map((e) =>
              e.exerciseId === exerciseId
                ? {
                    ...e,
                    sets: e.sets.map((s: WorkoutSet) =>
                      s.id === setId ? { ...s, ...cleanUpdates } : s
                    ),
                  }
                : e
            )
          );
        }
      } catch (err) {
        console.error('Failed to update set:', err);
        setError('Failed to update set');
      }
    }, [exercises]);

    const addSetToBackend = useCallback(async (
       workoutExerciseId: string,
       setNumber: number,
       weight?: number | null,
       reps?: number | null,
       rpe?: number | null
     ) => {
      const res = await fetch('/api/workouts/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          workoutExerciseId,
          setNumber,
          weight,
          reps,
          rpe,
        }),
      });

      return res.ok;
    }, []);

     const toggleExerciseExpanded = useCallback((exerciseId: string) => {
      const newExpanded = new Set(expandedExercises);
      if (newExpanded.has(exerciseId)) {
        newExpanded.delete(exerciseId);
      } else {
        newExpanded.add(exerciseId);
      }
      setExpandedExercises(newExpanded);
    }, [expandedExercises]);

    const handleAddSet = useCallback(async (exerciseId: string) => {
     const exercise = exercises.find((e) => e.exerciseId === exerciseId);
     if (!exercise) return;

     const setNumber = exercise.sets.length + 1;

     try {
       const res = await fetch('/api/workouts/sets', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         credentials: 'include',
         body: JSON.stringify({
           workoutExerciseId: exercise.id,
           setNumber,
         }),
       });

         if (res.ok) {
           const newSet: WorkoutSet = await res.json();
           setExercises(
             exercises.map((e) =>
               e.exerciseId === exerciseId
                 ? { ...e, sets: [...e.sets, newSet] }
                 : e
             )
           );
         }
     } catch (err) {
       console.error('Failed to add set:', err);
     }
   }, [exercises]);

   const handleCompleteSet = useCallback(async (exerciseId: string, setId: string) => {
     console.log('handleCompleteSet called:', { exerciseId, setId });
     try {
       const body = {
         isComplete: true,
         completedAt: new Date().toISOString(),
       };
       console.log('Sending complete request:', body);
       
       const res = await fetch(`/api/workouts/sets/${setId}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         credentials: 'include',
         body: JSON.stringify(body),
       });

       console.log('Complete response:', res.ok, res.status);
       const result = await res.json();
       console.log('Complete result:', result);

         if (res.ok) {
           const exercise = exercises.find((e) => e.exerciseId === exerciseId);
           const set = exercise?.sets.find((s: WorkoutSet) => s.id === setId);
           void trackEvent('set_logged', {
             workout_id: workoutId,
             exercise_id: exerciseId,
             exercise_name: exercise?.name,
             set_id: setId,
             set_number: set?.setNumber,
             weight: set?.weight,
             reps: set?.reps,
             rpe: set?.rpe,
           });
          setExercises(
            exercises.map((e) =>
              e.exerciseId === exerciseId
                ? {
                    ...e,
                     sets: e.sets.map((s) =>
                      s.id === setId
                        ? { ...s, isComplete: true, completedAt: new Date().toISOString() }
                        : s
                    ),
                  }
                : e
            )
          );
        }
     } catch (err) {
       console.error('Failed to complete set:', err);
       setError('Failed to complete set');
     }
    }, [exercises, workoutId]);

   const handleDeleteSet = useCallback(async (exerciseId: string, setId: string) => {
    try {
      const res = await fetch(`/api/workouts/sets/${setId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        const exercise = exercises.find((e) => e.exerciseId === exerciseId);
        if (!exercise) return;

         const updatedSets = exercise.sets.filter((s) => s.id !== setId);
        const reorderedSets = updatedSets.map((s, i) => ({ ...s, setNumber: i + 1 }));

        setExercises(
          exercises.map((e) =>
            e.exerciseId === exerciseId ? { ...e, sets: reorderedSets } : e
          )
        );
      }
    } catch (err) {
      console.error('Failed to delete set:', err);
      setError('Failed to delete set');
    }
  }, [exercises]);

   const handleToggleExercise = useCallback((exerciseId: string) => {
     toggleExerciseExpanded(exerciseId);
   }, [toggleExerciseExpanded]);

   const handleToggleClick = useCallback((e: React.MouseEvent) => {
     const exerciseId = (e.currentTarget as HTMLElement).getAttribute('data-exercise-id');
     if (exerciseId) {
       handleToggleExercise(exerciseId);
     }
   }, [handleToggleExercise]);

   const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
     if (e.key === 'Enter' || e.key === ' ') {
       const exerciseId = (e.currentTarget as HTMLElement).getAttribute('data-exercise-id');
       if (exerciseId) {
         toggleExerciseExpanded(exerciseId);
         e.preventDefault();
       }
     }
   }, [toggleExerciseExpanded]);









    const handleRemoveExercise = useCallback(async (exerciseId: string) => {
      try {
        const res = await fetch(`/api/workouts/${workoutId}/exercises?exerciseId=${exerciseId}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (res.ok) {
          setExercises(exercises.filter((e) => e.exerciseId !== exerciseId));
        }
      } catch (err) {
        console.error('Failed to remove exercise:', err);
        setError('Failed to remove exercise');
      }
    }, [exercises, workoutId]);





    const handleAddExercise = useCallback(async (exercise: Exercise) => {
        const orderIndex = exercises.length;

        try {
          const res = await fetch(`/api/workouts/${workoutId}/exercises`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              exerciseId: exercise.id,
              orderIndex,
            }),
          });

           if (res.ok) {
             const newExerciseData: NewWorkoutExerciseResponse = await res.json();

            const lastWorkoutSetsRes = await fetch(`/api/exercises/${exercise.id}/last-workout-sets`, {
              credentials: 'include',
            });

            let lastSetData: Array<{ setNumber: number; weight: number | null; reps: number | null; rpe: number | null }> = [];
            if (lastWorkoutSetsRes.ok) {
              const lastWorkoutSetsData: { sets?: Array<{ setNumber: number; weight: number | null; reps: number | null; rpe: number | null }> } = await lastWorkoutSetsRes.json();
              lastSetData = lastWorkoutSetsData.sets ?? [];
            }

            const workoutExercise: WorkoutExercise = {
              id: newExerciseData.id,
              exerciseId: exercise.id,
              name: exercise.name,
              muscleGroup: exercise.muscleGroup,
              orderIndex,
              sets: [],
              notes: newExerciseData.notes ?? null,
            };

            const updatedExercises = [...exercises, workoutExercise];
            setExercises(updatedExercises);
            setExpandedExercises(new Set([...expandedExercises, exercise.id]));

            if (lastSetData.length > 0) {
              for (const setData of lastSetData) {
                await addSetToBackend(newExerciseData.id, setData.setNumber, setData.weight, setData.reps, setData.rpe);
                workoutExercise.sets.push({
                  id: crypto.randomUUID(),
                  workoutExerciseId: newExerciseData.id,
                  setNumber: setData.setNumber,
                  weight: setData.weight ?? null,
                  reps: setData.reps ?? null,
                  rpe: setData.rpe ?? null,
                  isComplete: false,
                  completedAt: null,
                  createdAt: null,
                });
              }
            } else {
              await addSetToBackend(newExerciseData.id, 1, null, null, null);
              workoutExercise.sets.push({
                id: crypto.randomUUID(),
                workoutExerciseId: newExerciseData.id,
                setNumber: 1,
                weight: null,
                reps: null,
                rpe: null,
                isComplete: false,
                completedAt: null,
                createdAt: null,
              });
            }
          }
        } catch (err) {
          console.error('Failed to add exercise:', err);
          setError('Failed to add exercise');
        }

         setShowExerciseSelector(false);
         setExerciseSearch('');
       }, [exercises, expandedExercises, workoutId, addSetToBackend]);

    const filteredExercises = availableExercises.filter((exercise) =>
      exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase()) &&
      !exercises.some((e) => e.exerciseId === exercise.id)
    );



    const handleAddExerciseClickShared = useCallback((e: React.MouseEvent) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      const exercise = filteredExercises.find(ex => ex.id === id);
      if (exercise) {
        void handleAddExercise(exercise);
      }
    }, [filteredExercises, handleAddExercise]);

   const handleSaveNotes = useCallback(async () => {
     if (!workoutId) return;

     try {
       const res = await fetch(`/api/workouts/${workoutId}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         credentials: 'include',
         body: JSON.stringify({ notes }),
       });

       if (res.ok) {
         setEditingNotes(false);
       }
     } catch (err) {
       console.error('Failed to save notes:', err);
       setError('Failed to save notes');
     }
   }, [workoutId, notes]);

    const completeWorkout = useCallback(async () => {
      if (!workoutId) {
        console.error('completeWorkout: workoutId is undefined');
        setError('Workout ID is missing');
        return;
      }

      console.log('completeWorkout: Starting with workoutId:', workoutId);
      setCompleting(true);
      setError(null);

      try {
        const res = await fetch(`/api/workouts/${workoutId}/complete`, {
          method: 'PUT',
          credentials: 'include',
        });

        console.log('completeWorkout: API response status:', res.status);

        if (!res.ok) {
          const data: ApiError = await res.json();
          console.error('completeWorkout: API error:', data);
          const errorMsg = data.message ?? 'Failed to complete workout';
          setError(errorMsg);
          toast.error(errorMsg);
          return;
        }

        await res.json();
        const totalSets = exercises.reduce((acc, e) => acc + e.sets.length, 0);
        const completedSets = exercises.reduce((acc, e) => acc + e.sets.filter((s: WorkoutSet) => s.isComplete).length, 0);
        void trackEvent('workout_completed', {
          workout_id: workoutId,
          workout_name: workoutName,
          total_sets: totalSets,
          completed_sets: completedSets,
          exercise_count: exercises.length,
        });
        console.log('completeWorkout: Workout completed successfully, redirecting to:', `/workouts/${workoutId}/summary`);
        toast.success('Workout completed successfully!');
        setTimeout(() => {
          window.location.href = `/workouts/${workoutId}/summary`;
        }, 1000);
      } catch (err) {
        console.error('completeWorkout: Error:', err);
        const errorMsg = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMsg);
        toast.error(errorMsg);
        setCompleting(false);
      }
    }, [workoutId, exercises, workoutName, toast]);

    const handleCompleteWorkout = useCallback(async () => {
     if (!workoutId) return;

     const incompleteSetsCount = exercises.reduce((acc, e) => {
       return acc + e.sets.filter((s: WorkoutSet) => !s.isComplete).length;
     }, 0);

     if (incompleteSetsCount > 0) {
       setShowIncompleteSetsConfirm(true);
       return;
     }

     await completeWorkout();
   }, [workoutId, exercises, completeWorkout]);

   const handleDiscardWorkout = useCallback(async () => {
     if (!workoutId) return;

     try {
       const res = await fetch(`/api/workouts/${workoutId}`, {
         method: 'DELETE',
         credentials: 'include',
       });

       if (res.ok) {
         window.location.href = '/workouts/new';
       }
     } catch (err) {
       console.error('Failed to discard workout:', err);
       setError('Failed to discard workout');
     }
   }, [workoutId]);

   const handleCompleteWorkoutClick = useCallback(async () => {
     await handleCompleteWorkout();
   }, [handleCompleteWorkout]);

    const handleDiscardClick = useCallback(() => {
     setShowDiscardConfirm(true);
   }, []);

   const handleDiscardBackClick = useCallback(() => {
     setShowDiscardConfirm(false);
   }, []);



   const handleSaveNotesClick = useCallback(async () => {
     await handleSaveNotes();
   }, [handleSaveNotes]);

   const handleEditNotesClick = useCallback(() => {
     setEditingNotes(true);
   }, []);

   const handleCancelNotesClick = useCallback(() => {
     setEditingNotes(false);
   }, []);

   const handleAddExerciseClick = useCallback(() => {
     setShowExerciseSelector(true);
   }, []);

   const handleCloseExerciseSelector = useCallback(() => {
     setShowExerciseSelector(false);
     setExerciseSearch('');
   }, []);

   const handleDiscardConfirmClick = useCallback(async () => {
     await handleDiscardWorkout();
   }, [handleDiscardWorkout]);

      const handleIncompleteSetsContinueClick = useCallback(async () => {
        setShowIncompleteSetsConfirm(false);
        await completeWorkout();
      }, [completeWorkout]);

      const handleIncompleteSetsBackClick = useCallback(() => {
        setShowIncompleteSetsConfirm(false);
      }, []);

   const handleCompleteWorkoutClickWrapped = useCallback(() => {
     void handleCompleteWorkoutClick();
   }, [handleCompleteWorkoutClick]);

   const handleAddExerciseClickWrapped = useCallback(() => {
     void handleAddExerciseClick();
   }, [handleAddExerciseClick]);

   const handleRemoveExerciseClick = useCallback((e: React.MouseEvent) => {
     e.stopPropagation();
     const exerciseId = (e.currentTarget as HTMLElement).getAttribute('data-exercise-id');
     if (exerciseId) {
       void handleRemoveExercise(exerciseId);
     }
   }, [handleRemoveExercise]);

   const handleCompleteSetClick = useCallback((e: React.MouseEvent) => {
     e.stopPropagation();
     e.preventDefault();
     const exerciseId = (e.currentTarget as HTMLElement).getAttribute('data-exercise-id');
     const setId = (e.currentTarget as HTMLElement).getAttribute('data-set-id');
     if (exerciseId && setId) {
       void handleCompleteSet(exerciseId, setId);
     }
   }, [handleCompleteSet]);

   const handleDeleteSetClick = useCallback((e: React.MouseEvent) => {
     e.stopPropagation();
     e.preventDefault();
     const exerciseId = (e.currentTarget as HTMLElement).getAttribute('data-exercise-id');
     const setId = (e.currentTarget as HTMLElement).getAttribute('data-set-id');
     if (exerciseId && setId) {
       void handleDeleteSet(exerciseId, setId);
     }
   }, [handleDeleteSet]);

   const handleAddSetClick = useCallback((e: React.MouseEvent) => {
     const exerciseId = (e.currentTarget as HTMLElement).getAttribute('data-exercise-id');
     if (exerciseId) {
       void handleAddSet(exerciseId);
     }
   }, [handleAddSet]);

   const handleSaveNotesClickWrapped = useCallback(() => {
     void handleSaveNotesClick();
   }, [handleSaveNotesClick]);

    const handleAddExerciseClickSharedWrapped = useCallback((e: React.MouseEvent) => {
      void handleAddExerciseClickShared(e);
    }, [handleAddExerciseClickShared]);

    const handleDiscardConfirmClickWrapped = useCallback(() => {
      void handleDiscardConfirmClick();
    }, [handleDiscardConfirmClick]);

    const handleIncompleteSetsContinueClickWrapped = useCallback(() => {
      void handleIncompleteSetsContinueClick();
    }, [handleIncompleteSetsContinueClick]);

    const _handleIncompleteSetsBackClickWrapped = useCallback(() => {
      void handleIncompleteSetsBackClick();
    }, [handleIncompleteSetsBackClick]);





      const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
         const exerciseIdAttr = e.currentTarget.getAttribute('data-exercise-id');
         const setIdAttr = e.currentTarget.getAttribute('data-set-id');
         if (!exerciseIdAttr || !setIdAttr) return;
         const exerciseId = exerciseIdAttr;
         const setId = setIdAttr;
         const field = e.currentTarget.getAttribute('data-field') as 'weight' | 'reps' | 'rpe';
         const value = e.target.value;
         if (field === 'weight' || field === 'reps') {
           const num = value === '' ? null : (field === 'reps' ? parseInt(value, 10) : parseFloat(value));
           void handleUpdateSet(exerciseId, setId, { [field]: num });
         } else {
            const num = value === '' ? null : parseFloat(value);
            if (value === '' || (num !== null && num >= 1 && num <= 10)) {
             void handleUpdateSet(exerciseId, setId, { rpe: num });
           }
         }
       }, [handleUpdateSet]);

    const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNotes(e.target.value);
    }, []);

    const handleExerciseSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setExerciseSearch(e.target.value);
    }, []);

  useEffect(() => {
    if (!auth.loading && !auth.user && !redirectingRef.current) {
      redirectingRef.current = true;
      window.location.href = '/auth/signin';
    }
   }, [auth.loading, auth.user]);

   async function fetchExercises() {
     try {
       const res = await fetch('/api/exercises', {
         credentials: 'include',
       });

       if (res.ok) {
         const data: Exercise[] = await res.json();
         setAvailableExercises(data);
       }
     } catch (err) {
       console.error('Failed to fetch exercises:', err);
     }
   }

   const loadWorkout = useCallback(async () => {
     const {id} = params;
     if (!id) return;
     setWorkoutId(id);

     try {
       const res = await fetch(`/api/workouts/${id}`, {
         credentials: 'include',
       });

       if (res.ok) {
         const data: Workout = await res.json();
         setWorkoutName(data.name);
         setStartedAt(data.startedAt);
         setNotes(data.notes ?? '');

         if (data.completedAt && !redirectingRef.current) {
           console.log('Workout: Detected completed workout, redirecting to summary');
           redirectingRef.current = true;
           await router.navigate({ to: `/workouts/${id}/summary`, replace: true });
           return;
         }

         const exerciseData = await fetch(`/api/workouts/${id}/exercises`, {
           credentials: 'include',
         });

         if (exerciseData.ok) {
           const exercisesData: WorkoutExerciseWithDetails[] = await exerciseData.json();
           const flattenedExercises = exercisesData.map((e) => ({
             id: e.id,
             exerciseId: e.exerciseId,
             orderIndex: e.orderIndex,
             notes: e.notes,
             name: e.exercise?.name ?? '',
             muscleGroup: e.exercise?.muscleGroup ?? null,
             sets: e.sets as WorkoutSet[],
           }));
           setExercises(flattenedExercises);

           const initialExpanded = new Set<string>();
           flattenedExercises.forEach((e) => initialExpanded.add(e.exerciseId));
           setExpandedExercises(initialExpanded);
         }
       } else {
         setError('Workout not found');
       }
     } catch (err) {
       console.error('Failed to load workout:', err);
       setError('Failed to load workout');
     }


     void fetchExercises();
   }, [params, router]);

   useEffect(() => {
     if (!auth.loading && auth.user && params.id && !fetchedRef.current) {
       fetchedRef.current = true;
       void loadWorkout();
     }
    }, [auth.loading, auth.user, params.id, loadWorkout]);






  const totalSetsCount = exercises.reduce((acc, e) => acc + e.sets.length, 0);

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (auth.loading) {
    return (
	<div className={'min-h-screen flex items-center justify-center'}>
		<Loader2 className={'animate-spin text-blue-600'} size={32} />
	</div>
    );
  }

  if (error && !exercises.length) {
    return (
	<div className={'min-h-screen bg-gray-50 p-8'}>
		<div className={'max-w-4xl mx-auto'}>
			<div className={'bg-red-50 border border-red-200 rounded-lg p-4'}>
				<p className={'text-red-600'}>{error}</p>
				<a className={'text-blue-600 hover:text-blue-700 mt-2 inline-block'} href={'/workouts/new'}>
					{'Start a new workout'}
				</a>
			</div>
		</div>
	</div>
    );
  }

  return (
	<div className={'min-h-screen bg-gray-50'}>
		<div className={'bg-white border-b border-gray-200 sticky top-0 z-10'}>
			<div className={'max-w-4xl mx-auto px-4 sm:px-8 py-4'}>
				<div className={'flex items-center justify-between'}>
					<div>
						<h1 className={'text-xl font-bold text-gray-900'}>{workoutName}</h1>
						<div className={'flex items-center gap-4 text-sm text-gray-500 mt-1'}>
							<span className={'flex items-center gap-1'}>
								<Calendar size={14} />
								{new Date(startedAt).toLocaleDateString()}
							</span>
							<span className={'flex items-center gap-1'}>
								<Dumbbell size={14} />
								{formatDuration(startedAt)}
							</span>
						</div>
					</div>
					<div className={'flex items-center gap-2'}>
						<button
							className={'px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors'}
							onClick={handleDiscardClick}
						>
							{'Discard'}
						</button>
						<button
							className={'inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-green-400 disabled:cursor-not-allowed'}
							disabled={completing || totalSetsCount === 0}
							onClick={handleCompleteWorkoutClickWrapped}
						>
							{completing ? (
								<>
									<Loader2 className={'animate-spin'} size={18} />
									{'Saving...'}
								</>
                ) : (
	<>
		<Check size={18} />
		{'Complete Workout'}
	</>
                )}
						</button>
					</div>
				</div>
			</div>
		</div>

		<div className={'max-w-4xl mx-auto px-4 sm:px-8 py-6'}>
			{error ? <div className={'mb-4 p-4 bg-red-50 border border-red-200 rounded-lg'}>
				<p className={'text-sm text-red-600'}>{error}</p>
            </div> : null}

			<div className={'space-y-4'}>
				{exercises.length === 0 ? (
					<div className={'bg-white rounded-lg border border-gray-200 p-8 text-center'}>
						<p className={'text-gray-500 mb-4'}>{'No exercises added yet'}</p>
						<button
							className={'inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'}
							onClick={handleAddExerciseClickWrapped}
						>
							<Plus size={18} />
							{'Add Exercise'}
						</button>
					</div>
          ) : (
            exercises.map((exercise) => (
	<div className={'bg-white rounded-lg border border-gray-200 overflow-hidden'} key={exercise.exerciseId}>
        <div
          className={'flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors'}
          data-exercise-id={exercise.exerciseId}
          onClick={handleToggleClick}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
        >
			<div className={'flex items-center gap-3'}>
				{expandedExercises.has(exercise.exerciseId) ? (
					<ChevronUp className={'text-gray-400'} size={20} />
                    ) : (
	<ChevronDown className={'text-gray-400'} size={20} />
                    )}
				<div>
					<p className={'font-medium text-gray-900'}>{exercise.name}</p>
					{exercise.muscleGroup ? <p className={'text-sm text-gray-500'}>{exercise.muscleGroup}</p> : null}
				</div>
			</div>
			<div className={'flex items-center gap-2'}>
				<span className={'text-sm text-gray-500'}>
					{exercise.sets.filter((s: WorkoutSet) => s.isComplete).length}
					{'/'}
					{exercise.sets.length}
					{' '}
					{'sets'}
				</span>
                                <button
                                  className={'p-1 text-gray-400 hover:text-red-600'}
                                  data-exercise-id={exercise.exerciseId}
                                   onClick={handleRemoveExerciseClick}
                                >
					<X size={18} />
                                </button>
			</div>
        </div>

		{expandedExercises.has(exercise.exerciseId) ? <div className={'border-t border-gray-100 p-4'}>
			{exercise.sets.length > 0 ? <div className={'mb-4'}>
				<table className={'w-full'}>
					<thead>
						<tr className={'text-sm text-gray-500'}>
							<th className={'text-left py-2 font-medium'}>{'Set'}</th>
							<th className={'text-left py-2 font-medium w-24'}>{'kg'}</th>
							<th className={'text-left py-2 font-medium w-24'}>{'Reps'}</th>
							<th className={'text-left py-2 font-medium w-24'}>{'RPE'}</th>
							<th className={'text-left py-2 font-medium'}>{'Done'}</th>
							<th className={'text-right py-2 font-medium'} />
						</tr>
					</thead>
					<tbody>
						{exercise.sets.map((set: WorkoutSet) => (
							<tr className={'border-b border-gray-100 last:border-0'} key={set.id}>
								<td className={'py-2'}>
									<span
										className={`inline-flex items-center justify-center w-6 h-6 text-sm font-medium rounded ${
                                    set.isComplete ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                  }`}
									>
										{set.setNumber}
									</span>
								</td>
								<td className={'py-2'}>
									<input
										className={'w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'}
										data-exercise-id={exercise.exerciseId}
										data-field={'weight'}
										data-set-id={set.id}
										disabled={set.isComplete}
										inputMode={'decimal'}
										onChange={handleInputChange}
										pattern={'[0-9]*\\.?[0-9]*'}
										placeholder={'0'}
										type={'text'}
										value={set.weight ?? ''}
									/>
								</td>
								<td className={'py-2'}>
									<input
										className={'w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'}
										data-exercise-id={exercise.exerciseId}
										data-field={'reps'}
										data-set-id={set.id}
										disabled={set.isComplete}
										inputMode={'numeric'}
										onChange={handleInputChange}
										pattern={'[0-9]*'}
										placeholder={'0'}
										type={'text'}
										value={set.reps ?? ''}
									/>
								</td>
								<td className={'py-2'}>
									<input
										className={'w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'}
										data-exercise-id={exercise.exerciseId}
										data-field={'rpe'}
										data-set-id={set.id}
										disabled={set.isComplete}
										inputMode={'decimal'}
										onChange={handleInputChange}
										pattern={'[0-9]*\\.?[0-9]*'}
										placeholder={'-'}
										type={'text'}
										value={set.rpe ?? ''}
									/>
								</td>
								<td className={'py-2'}>
                                  <button
                                    className={`p-2 rounded-lg transition-colors ${
                                      set.isComplete
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
                                    }`}
                                    data-exercise-id={exercise.exerciseId}
                                    data-set-id={set.id}
                                    disabled={set.isComplete}
                                     onClick={handleCompleteSetClick}
                                  >
										<Check size={18} />
                                  </button>
								</td>
								<td className={'py-2 text-right'}>
                                  <button
                                    className={'p-1 text-gray-400 hover:text-red-600'}
                                    data-exercise-id={exercise.exerciseId}
                                    data-set-id={set.id}
                                     onClick={handleDeleteSetClick}
                                  >
										<Trash2 size={16} />
                                  </button>
								</td>
							</tr>
                            ))}
					</tbody>
				</table>
                               </div> : null}

          <button
            className={'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors'}
            data-exercise-id={exercise.exerciseId}
             onClick={handleAddSetClick}
          >
				<Plus size={16} />
				{'Add Set'}
          </button>
                                                </div> : null}
	</div>
            ))
          )}

				{exercises.length > 0 ? <button
					className={'w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2'}
					onClick={handleAddExerciseClickWrapped}
				>
					<Plus size={18} />
					{'Add Exercise'}
                            </button> : null}

				<div className={'bg-white rounded-lg border border-gray-200 p-4'}>
					<div className={'flex items-center justify-between mb-2'}>
						<label className={'text-sm font-medium text-gray-700'}>{'Workout Notes'}</label>
						{editingNotes ? (
							<div className={'flex items-center gap-2'}>
								<button
									className={'text-sm text-gray-500 hover:text-gray-700'}
									onClick={handleCancelNotesClick}
								>
									{'Cancel'}
								</button>
							<button
								className={'text-sm text-blue-600 hover:text-blue-700'}
								onClick={handleSaveNotesClickWrapped}
							>
								{'Save'}
							</button>
							</div>
              ) : (
	<button
		className={'text-sm text-blue-600 hover:text-blue-700'}
		onClick={handleEditNotesClick}
	>
		{'Edit'}
	</button>
              )}
					</div>
					{editingNotes ? (
						<textarea
							className={'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none'}
							onChange={handleNotesChange}
							placeholder={'Add notes about this workout...'}
							rows={3}
							value={notes}
						/>
            ) : (
	<p className={'text-gray-600 text-sm'}>
		{notes || 'No notes added'}
	</p>
            )}
				</div>
			</div>
		</div>

		{showExerciseSelector ? <div className={'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'}>
			<div className={'bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col'}>
				<div className={'flex items-center justify-between p-4 border-b'}>
					<h2 className={'text-lg font-semibold text-gray-900'}>{'Add Exercise'}</h2>
					<button
						className={'p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'}
					onClick={handleCloseExerciseSelector}
					>
						<X size={20} />
					</button>
				</div>

				<div className={'p-4 border-b'}>
					<div className={'relative'}>
						<Search className={'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'} size={18} />
						<input
							autoFocus={true}
							className={'w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'}
							onChange={handleExerciseSearchChange}
							placeholder={'Search exercises...'}
							type={'text'}
							value={exerciseSearch}
						/>
					</div>
				</div>

				<div className={'flex-1 overflow-y-auto p-4'}>
					{filteredExercises.length === 0 ? (
						<div className={'text-center py-8 text-gray-500'}>
							{'No exercises found'}
						</div>
              ) : (
	<div className={'space-y-2'}>
		{filteredExercises.map((exercise) => (
          <button
            className={'w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors'}
            data-id={exercise.id}
            key={exercise.id}
            onClick={handleAddExerciseClickSharedWrapped}
          >
				<div>
					<h3 className={'font-medium text-gray-900'}>{exercise.name}</h3>
						{exercise.muscleGroup ?
							<span className={'inline-block mt-1 px-2 py-0.5 text-xs font-medium text-blue-600 bg-blue-100 rounded-full'}>
								{exercise.muscleGroup}
							</span> : null}
				</div>
          </button>
                  ))}
	</div>
              )}
				</div>
			</div>
                          </div> : null}

		{showDiscardConfirm ? <div className={'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'}>
			<div className={'bg-white rounded-xl shadow-xl p-6 max-w-md'}>
				<h3 className={'text-lg font-semibold text-gray-900 mb-2'}>{'Discard Workout?'}</h3>
				<p className={'text-gray-600 mb-4'}>
					{'This will permanently delete this workout. This action cannot be undone.'}
				</p>
				<div className={'flex justify-end gap-3'}>
					<button
						className={'px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors'}
						onClick={handleDiscardBackClick}
					>
						{'Cancel'}
					</button>
					<button
						className={'px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors'}
						onClick={handleDiscardConfirmClickWrapped}
					>
						{'Discard Workout'}
					</button>
				</div>
			</div>
                        </div> : null}

		{showIncompleteSetsConfirm ? <div className={'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'}>
			<div className={'bg-white rounded-xl shadow-xl p-6 max-w-md'}>
				<h3 className={'text-lg font-semibold text-gray-900 mb-2'}>{'Incomplete Sets'}</h3>
				<p className={'text-gray-600 mb-4'}>
					{'You have sets that haven\'t been marked as complete. Are you sure you want to continue?'}
				</p>
				<div className={'flex justify-end gap-3'}>
					<button
						className={'px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors'}
						onClick={_handleIncompleteSetsBackClickWrapped}
					>
						{'Go Back'}
					</button>
					<button
						className={'px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors'}
						onClick={handleIncompleteSetsContinueClickWrapped}
					>
						{'Continue'}
					</button>
				</div>
			</div>
                               </div> : null}
	</div>
  );
}

export const Route = createFileRoute('/workouts/$id')({
  component: WorkoutSession,
});

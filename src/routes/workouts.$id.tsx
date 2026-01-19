import { createFileRoute, useParams, useRouter } from '@tanstack/react-router';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from './__root';
import {
  Plus,
  X,
  Search,
  Check,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Dumbbell,
  Calendar,
} from 'lucide-react';

interface WorkoutExercise {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string | null;
  orderIndex: number;
  sets: WorkoutSet[];
  notes?: string;
}

interface WorkoutSet {
  id: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  rpe?: number;
  isComplete: boolean;
  completedAt?: string;
}

interface Workout {
  id: string;
  name: string;
  templateId?: string;
  startedAt: string;
  completedAt?: string;
  notes?: string;
  exercises: WorkoutExercise[];
}

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
}

export const Route = createFileRoute('/workouts/$id')({
  component: WorkoutSession,
});

function WorkoutSession() {
  const auth = useAuth();
  const router = useRouter();
  const params = useParams({ from: '/workouts/$id' });
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [exercises, setExercises] = useState<any[]>([]);
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

  useEffect(() => {
    if (!auth.loading && !auth.user && !redirectingRef.current) {
      redirectingRef.current = true;
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  useEffect(() => {
    if (!auth.loading && auth.user && params.id && !fetchedRef.current) {
      fetchedRef.current = true;
      loadWorkout();
    }
  }, [auth.loading, auth.user, params.id]);

  // Reset redirectingRef when component unmounts or when params change
  useEffect(() => {
    return () => {
      redirectingRef.current = false;
    };
  }, [params.id]);

  async function loadWorkout() {
    const id = params.id;
    if (!id) return;
    setWorkoutId(id);

    try {
      const res = await fetch(`/api/workouts/${id}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json() as Workout;
        setWorkoutName(data.name);
        setStartedAt(data.startedAt);
        setNotes(data.notes || '');

        if (data.completedAt && !redirectingRef.current) {
          console.log('Workout: Detected completed workout, redirecting to summary');
          redirectingRef.current = true;
          router.navigate({ to: `/workouts/${id}/summary`, replace: true });
          return;
        }

        const exerciseData = await fetch(`/api/workouts/${id}/exercises`, {
          credentials: 'include',
        });

        if (exerciseData.ok) {
          const exercisesData = await exerciseData.json();
          const flattenedExercises = (exercisesData as unknown as Array<{
            id: string;
            exerciseId: string;
            orderIndex: number;
            notes?: string;
            exercise?: { id: string; name: string; muscleGroup: string | null };
            sets: Array<{
              id: string;
              setNumber: number;
              weight?: number;
              reps?: number;
              rpe?: number;
              isComplete: boolean;
              completedAt?: string;
            }>;
          }>).map((e) => ({
            id: e.id,
            exerciseId: e.exerciseId,
            orderIndex: e.orderIndex,
            notes: e.notes,
            name: e.exercise?.name ?? '',
            muscleGroup: e.exercise?.muscleGroup ?? null,
            sets: e.sets,
          }));
          setExercises(flattenedExercises as WorkoutExercise[]);

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

    fetchExercises();
  }

  async function fetchExercises() {
    try {
      const res = await fetch('/api/exercises', {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setAvailableExercises(data as Exercise[]);
      }
    } catch (err) {
      console.error('Failed to fetch exercises:', err);
    }
  }

  const filteredExercises = availableExercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase()) &&
    !exercises.some((e) => e.exerciseId === exercise.id)
  );

  const toggleExerciseExpanded = (exerciseId: string) => {
    const newExpanded = new Set(expandedExercises);
    if (newExpanded.has(exerciseId)) {
      newExpanded.delete(exerciseId);
    } else {
      newExpanded.add(exerciseId);
    }
    setExpandedExercises(newExpanded);
  };

  const handleAddExercise = async (exercise: Exercise) => {
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
        const newExerciseData = await res.json() as { id: string; notes?: string };

        const lastWorkoutRes = await fetch(`/api/exercises/${exercise.id}/last-workout`, {
          credentials: 'include',
        });

        let lastSetData = { weight: undefined as number | undefined, reps: undefined as number | undefined, rpe: undefined as number | undefined };
        if (lastWorkoutRes.ok) {
          const lastWorkoutData = await lastWorkoutRes.json() as { weight?: number; reps?: number; rpe?: number } | null;
          if (lastWorkoutData) {
            lastSetData = {
              weight: lastWorkoutData.weight,
              reps: lastWorkoutData.reps,
              rpe: lastWorkoutData.rpe,
            };
          }
        }

        const workoutExercise: WorkoutExercise = {
          id: newExerciseData.id,
          exerciseId: exercise.id,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          orderIndex,
          sets: [],
          notes: newExerciseData.notes,
        };

        const updatedExercises = [...exercises, workoutExercise];
        setExercises(updatedExercises as WorkoutExercise[]);
        setExpandedExercises(new Set([...expandedExercises, exercise.id]));

        if (lastSetData.weight || lastSetData.reps) {
          await addSetToBackend(newExerciseData.id, 1, lastSetData.weight, lastSetData.reps, lastSetData.rpe);
          workoutExercise.sets.push({
            id: crypto.randomUUID(),
            setNumber: 1,
            weight: lastSetData.weight,
            reps: lastSetData.reps,
            rpe: lastSetData.rpe,
            isComplete: false,
          });
        }
      }
    } catch (err) {
      console.error('Failed to add exercise:', err);
      setError('Failed to add exercise');
    }

    setShowExerciseSelector(false);
    setExerciseSearch('');
  };

  async function addSetToBackend(
    workoutExerciseId: string,
    setNumber: number,
    weight?: number,
    reps?: number,
    rpe?: number
  ) {
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
  }

  const handleRemoveExercise = async (exerciseId: string) => {
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
  };

  const handleAddSet = async (exerciseId: string) => {
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
          const newSet = await res.json();
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
      setError('Failed to add set');
    }
  };

  const handleUpdateSet = async (
    exerciseId: string,
    setId: string,
    updates: Partial<WorkoutSet>
  ) => {
    if (updates.weight !== undefined && updates.weight < 0) {
      return;
    }
    if (updates.reps !== undefined && updates.reps < 0) {
      return;
    }
    if (updates.rpe !== undefined && updates.rpe < 0) {
      return;
    }

    try {
      const res = await fetch(`/api/workouts/sets/${setId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        setExercises(
          exercises.map((e) =>
            e.exerciseId === exerciseId
              ? {
                  ...e,
                  sets: e.sets.map((s: WorkoutSet) =>
                    s.id === setId ? { ...s, ...updates } : s
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
  };

  const handleCompleteSet = async (exerciseId: string, setId: string) => {
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
        setExercises(
          exercises.map((e) =>
            e.exerciseId === exerciseId
              ? {
                  ...e,
                   sets: e.sets.map((s: WorkoutSet) =>
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
  };

  const handleDeleteSet = async (exerciseId: string, setId: string) => {
    try {
      const res = await fetch(`/api/workouts/sets/${setId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        const exercise = exercises.find((e) => e.exerciseId === exerciseId);
        if (!exercise) return;

         const updatedSets = exercise.sets.filter((s: WorkoutSet) => s.id !== setId);
        const reorderedSets = updatedSets.map((s: WorkoutSet, i: number) => ({ ...s, setNumber: i + 1 }));

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
  };

  const handleSaveNotes = async () => {
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
  };

  const handleCompleteWorkout = async () => {
    if (!workoutId) return;

    const incompleteSetsCount = exercises.reduce((acc, e) => {
      return acc + e.sets.filter((s: WorkoutSet) => !s.isComplete).length;
    }, 0);

    if (incompleteSetsCount > 0) {
      setShowIncompleteSetsConfirm(true);
      return;
    }

    await completeWorkout();
  };

  const completeWorkout = async () => {
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
        const data = await res.json();
        console.error('completeWorkout: API error:', data);
        throw new Error(data.message || 'Failed to complete workout');
      }

      const workoutWithExercises = await res.json();
      console.log('completeWorkout: Workout completed successfully, redirecting to:', `/workouts/${workoutId}/summary`);
      window.location.href = `/workouts/${workoutId}/summary`;
    } catch (err) {
      console.error('completeWorkout: Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCompleting(false);
    }
  };

  const handleDiscardWorkout = async () => {
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
  };

  const completedSetsCount = exercises.reduce((acc, e) => {
    return acc + e.sets.filter((s: WorkoutSet) => s.isComplete).length;
  }, 0);

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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !exercises.length) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
            <a href="/workouts/new" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
              Start a new workout
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{workoutName}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(startedAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Dumbbell size={14} />
                  {formatDuration(startedAt)}
                </span>
                <span>
                  {completedSetsCount}/{totalSetsCount} sets
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDiscardConfirm(true)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleCompleteWorkout}
                disabled={completing || totalSetsCount === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-green-400 disabled:cursor-not-allowed"
              >
                {completing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Complete Workout
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {exercises.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-gray-500 mb-4">No exercises added yet</p>
              <button
                onClick={() => setShowExerciseSelector(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={18} />
                Add Exercise
              </button>
            </div>
          ) : (
            exercises.map((exercise) => (
              <div key={exercise.exerciseId} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExerciseExpanded(exercise.exerciseId)}
                >
                  <div className="flex items-center gap-3">
                    {expandedExercises.has(exercise.exerciseId) ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{exercise.name}</p>
                      {exercise.muscleGroup && (
                        <p className="text-sm text-gray-500">{exercise.muscleGroup}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-sm text-gray-500">
                       {exercise.sets.filter((s: WorkoutSet) => s.isComplete).length}/{exercise.sets.length} sets
                     </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveExercise(exercise.exerciseId);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {expandedExercises.has(exercise.exerciseId) && (
                  <div className="border-t border-gray-100 p-4">
                    {exercise.sets.length > 0 && (
                      <div className="mb-4">
                        <table className="w-full">
                          <thead>
                            <tr className="text-sm text-gray-500">
                              <th className="text-left py-2 font-medium">Set</th>
                              <th className="text-left py-2 font-medium w-24">kg</th>
                              <th className="text-left py-2 font-medium w-24">Reps</th>
                              <th className="text-left py-2 font-medium w-24">RPE</th>
                              <th className="text-left py-2 font-medium">Done</th>
                              <th className="text-right py-2 font-medium"></th>
                            </tr>
                          </thead>
                          <tbody>
                             {exercise.sets.map((set: WorkoutSet) => (
                              <tr key={set.id} className="border-b border-gray-100 last:border-0">
                                <td className="py-2">
                                  <span className={`inline-flex items-center justify-center w-6 h-6 text-sm font-medium rounded ${
                                    set.isComplete ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {set.setNumber}
                                  </span>
                                </td>
                                <td className="py-2">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    pattern="[0-9]*\.?[0-9]*"
                                    value={set.weight ?? ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                        handleUpdateSet(exercise.exerciseId, set.id, {
                                          weight: val ? parseFloat(val) : undefined,
                                        });
                                      }
                                    }}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="0"
                                    disabled={set.isComplete}
                                  />
                                </td>
                                <td className="py-2">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={set.reps ?? ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === '' || /^\d+$/.test(val)) {
                                        handleUpdateSet(exercise.exerciseId, set.id, {
                                          reps: val ? parseInt(val, 10) : undefined,
                                        });
                                      }
                                    }}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="0"
                                    disabled={set.isComplete}
                                  />
                                </td>
                                <td className="py-2">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    pattern="[0-9]*\.?[0-9]*"
                                    value={set.rpe ?? ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                        const num = parseFloat(val);
                                        if (val === '' || (num >= 1 && num <= 10)) {
                                          handleUpdateSet(exercise.exerciseId, set.id, {
                                            rpe: val ? num : undefined,
                                          });
                                        }
                                      }
                                    }}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="-"
                                    disabled={set.isComplete}
                                  />
                                </td>
                                <td className="py-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleCompleteSet(exercise.exerciseId, set.id);
                                    }}
                                    disabled={set.isComplete}
                                    className={`p-2 rounded-lg transition-colors ${
                                      set.isComplete
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
                                    }`}
                                  >
                                    <Check size={18} />
                                  </button>
                                </td>
                                <td className="py-2 text-right">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleDeleteSet(exercise.exerciseId, set.id);
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-600"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <button
                      onClick={() => handleAddSet(exercise.exerciseId)}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Plus size={16} />
                      Add Set
                    </button>
                  </div>
                )}
              </div>
            ))
          )}

          {exercises.length > 0 && (
            <button
              onClick={() => setShowExerciseSelector(true)}
              className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Add Exercise
            </button>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Workout Notes</label>
              {editingNotes ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingNotes(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Edit
                </button>
              )}
            </div>
            {editingNotes ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                placeholder="Add notes about this workout..."
              />
            ) : (
              <p className="text-gray-600 text-sm">
                {notes || 'No notes added'}
              </p>
            )}
          </div>
        </div>
      </div>

      {showExerciseSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Add Exercise</h2>
              <button
                onClick={() => {
                  setShowExerciseSelector(false);
                  setExerciseSearch('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  placeholder="Search exercises..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {filteredExercises.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No exercises found
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredExercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => handleAddExercise(exercise)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">{exercise.name}</h3>
                        {exercise.muscleGroup && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                            {exercise.muscleGroup}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDiscardConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Discard Workout?</h3>
            <p className="text-gray-600 mb-4">
              This will permanently delete this workout. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscardWorkout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Discard Workout
              </button>
            </div>
          </div>
        </div>
      )}

      {showIncompleteSetsConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Incomplete Sets</h3>
            <p className="text-gray-600 mb-4">
              You have sets that haven't been marked as complete. Are you sure you want to continue?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowIncompleteSetsConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  setShowIncompleteSetsConfirm(false);
                  completeWorkout();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

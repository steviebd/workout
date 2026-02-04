'use client';

import { createFileRoute, useParams, useRouter } from '@tanstack/react-router';
import {
  Calendar,
  Check,
  ChevronLeft,
  Dumbbell,
  Loader2,
  Plus,
  Search,
} from 'lucide-react';
import { useCallback, useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from './__root';
import { type Workout } from '@/lib/db/schema';
import { type WorkoutExerciseWithDetails } from '@/lib/db/workout';
import { trackEvent } from '@/lib/posthog';
import { getVideoTutorialByName, type VideoTutorial } from '@/lib/exercise-library';
import { useToast } from '@/components/ToastProvider';
import { ExerciseLogger } from '@/components/workouts/ExerciseLogger';
import { VideoTutorialModal } from '@/components/VideoTutorialModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/Drawer';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/AlertDialog';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import { useDateFormat } from '@/lib/context/DateFormatContext';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '~/components/ui/Skeleton';

interface WorkoutExercise {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string | null;
  orderIndex: number;
  sets: WorkoutSet[];
  notes: string | null;
  isAmrap: boolean;
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

function WorkoutSession() {
  const auth = useAuth();
  const router = useRouter();
  const params = useParams({ from: '/workouts/$id' });
  const workoutId = params.id;
  const toast = useToast();
  const { formatDate } = useDateFormat();
  const queryClient = useQueryClient();

  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showIncompleteSetsConfirm, setShowIncompleteSetsConfirm] = useState(false);
  const [selectedTutorial, setSelectedTutorial] = useState<{ tutorial: VideoTutorial; exerciseName: string } | null>(null);

  const { data: workout, isLoading: workoutLoading, error: workoutError } = useQuery<Workout>({
    throwOnError: false,
    queryKey: ['workout', workoutId],
    queryFn: async () => {
      if (!workoutId) throw new Error('No workout ID');
      const res = await fetch(`/api/workouts/${workoutId}`, { credentials: 'include' });
      if (!res.ok) {
        let errorData: { error?: string } = { error: 'Workout not found' };
        try {
          errorData = await res.json();
        } catch {
          // Use default error message
        }
        throw new Error(errorData.error ?? 'Workout not found');
      }
      return res.json();
    },
    enabled: !!workoutId && !!auth.user,
    retry: false,
  });

  const { data: exercises = [] } = useQuery<WorkoutExercise[]>({
    queryKey: ['workout-exercises', workoutId],
    queryFn: async () => {
      if (!workoutId) return [];
      const res = await fetch(`/api/workouts/${workoutId}/exercises`, { credentials: 'include' });
      if (!res.ok) return [];
      const data: WorkoutExerciseWithDetails[] = await res.json();
      return data.map((e) => ({
        id: e.id,
        exerciseId: e.exerciseId,
        orderIndex: e.orderIndex,
        notes: e.notes,
        name: e.exercise?.name ?? '',
        muscleGroup: e.exercise?.muscleGroup ?? null,
        sets: e.sets as WorkoutSet[],
        isAmrap: e.isAmrap,
      }));
    },
    enabled: !!workoutId && !!auth.user,
  });

  const { data: availableExercises = [], isLoading: availableExercisesLoading } = useQuery<Exercise[]>({
    queryKey: ['exercises'],
    queryFn: async () => {
      const res = await fetch('/api/exercises', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!auth.user,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  useEffect(() => {
    if (workout?.completedAt && workoutId) {
      void router.navigate({ to: `/workouts/${workoutId}/summary`, replace: true });
    }
  }, [workout?.completedAt, workoutId, router]);

  const updateSetMutation = useMutation({
    mutationFn: async ({ setId, updates }: { setId: string; updates: Partial<WorkoutSet> }) => {
      const res = await fetch(`/api/workouts/sets/${setId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update set');
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workout-exercises', workoutId] });
    },
  });

  const addSetMutation = useMutation({
    mutationFn: async ({ workoutExerciseId, setNumber, weight, reps, rpe }: { workoutExerciseId: string; setNumber: number; weight?: number | null; reps?: number | null; rpe?: number | null }) => {
      const res = await fetch('/api/workouts/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workoutExerciseId, setNumber, weight, reps, rpe }),
      });
      if (!res.ok) throw new Error('Failed to add set');
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workout-exercises', workoutId] });
    },
  });

  const addExerciseMutation = useMutation({
    mutationFn: async ({ exerciseId, orderIndex }: { exerciseId: string; orderIndex: number }) => {
      const res = await fetch(`/api/workouts/${workoutId}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ exerciseId, orderIndex }),
      });
      if (!res.ok) throw new Error('Failed to add exercise');
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workout-exercises', workoutId] });
    },
  });

  const completeWorkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/workouts/${workoutId}/complete`, {
        method: 'PUT',
        credentials: 'include',
      });
       if (!res.ok) {
         let errorData: { message?: string } = { message: 'Failed to complete workout' };
         try {
           errorData = await res.json();
         } catch {
           // Use default error message
         }
         throw new Error(errorData.message ?? 'Failed to complete workout');
       }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });
      void queryClient.invalidateQueries({ queryKey: ['workout-exercises', workoutId] });
      void queryClient.invalidateQueries({ queryKey: ['streak'] });
    },
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/workouts/${workoutId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete workout');
    },
    onSuccess: () => {
      void router.navigate({ to: '/workouts', replace: true });
    },
  });

  const saveNotesMutation = useMutation({
    mutationFn: async (notesValue: string) => {
      const res = await fetch(`/api/workouts/${workoutId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes: notesValue }),
      });
      if (!res.ok) throw new Error('Failed to save notes');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });
    },
  });

  const filteredExercises = useMemo(() =>
    availableExercises.filter((exercise) =>
      exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase()) &&
      !exercises.some((e) => e.exerciseId === exercise.id)
    ), [availableExercises, exerciseSearch, exercises]);

  const handleUpdateSet = useCallback((_exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => {
    updateSetMutation.mutate({ setId, updates });
  }, [updateSetMutation]);

  const handleAddSet = useCallback((_exerciseId: string, _currentSets: Array<{ id: string; reps: number; weight: number; completed: boolean }>) => {
    const exercise = exercises.find(e => e.exerciseId === _exerciseId);
    if (!exercise) return;
    const setNumber = exercise.sets.length + 1;
    const lastSet = exercise.sets[exercise.sets.length - 1];
    addSetMutation.mutate({
      workoutExerciseId: exercise.id,
      setNumber,
      weight: lastSet?.weight ?? null,
      reps: lastSet?.reps ?? null,
      rpe: null,
    });
  }, [exercises, addSetMutation]);

  const handleAddExercise = useCallback((exercise: Exercise) => {
    const orderIndex = exercises.length;
    addExerciseMutation.mutate({ exerciseId: exercise.id, orderIndex });
    setShowExerciseSelector(false);
    setExerciseSearch('');
  }, [exercises, addExerciseMutation]);

  const handleAddExerciseClick = useCallback(() => {
    setShowExerciseSelector(true);
  }, []);

  const handleAddExerciseClickShared = useCallback((e: React.MouseEvent) => {
    const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
    const exercise = filteredExercises.find(ex => ex.id === id);
    if (exercise) {
      handleAddExercise(exercise);
    }
  }, [filteredExercises, handleAddExercise]);

  const handleSaveNotes = useCallback(() => {
    saveNotesMutation.mutate(notes);
    setEditingNotes(false);
  }, [saveNotesMutation, notes]);

  const handleCompleteWorkout = useCallback(() => {
    const incompleteSetsCount = exercises.reduce((acc, e) => {
      return acc + e.sets.filter((s) => !s.isComplete).length;
    }, 0);

    if (incompleteSetsCount > 0) {
      setShowIncompleteSetsConfirm(true);
      return;
    }

    completeWorkoutMutation.mutate(undefined, {
      onSuccess: () => {
        const totalSets = exercises.reduce((acc, e) => acc + e.sets.length, 0);
        const completedSets = exercises.reduce((acc, e) => acc + e.sets.filter((s) => s.isComplete).length, 0);
        void trackEvent('workout_completed', {
          workout_id: workoutId,
          workout_name: workout?.name ?? '',
          total_sets: totalSets,
          completed_sets: completedSets,
          exercise_count: exercises.length,
        });
        toast.success('Workout completed successfully!');

        const is1RMTest = workout?.name === '1RM Test' && workout?.programCycleId;
        const redirectUrl = is1RMTest
          ? `/programs/cycle/${workout?.programCycleId}/1rm-test`
          : `/workouts/${workoutId}/summary`;

        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1000);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to complete workout');
      },
    });
  }, [exercises, completeWorkoutMutation, workout, workoutId, toast]);

  const handleDiscardWorkout = useCallback(() => {
    deleteWorkoutMutation.mutate();
  }, [deleteWorkoutMutation]);

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  }, []);

  const handleExerciseSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setExerciseSearch(e.target.value);
  }, []);

  const handleIncompleteSetsContinue = useCallback(() => {
    setShowIncompleteSetsConfirm(false);
    handleCompleteWorkout();
  }, [handleCompleteWorkout]);

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

  if (auth.loading || workoutLoading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-7 w-32" />
        </div>
        <Skeleton className="h-6 w-48 mx-auto mb-2" />
        <div className="flex items-center justify-center gap-4 mb-6">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
        <div className="fixed bottom-[68px] left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </main>
    );
  }

  if (workoutError || !workout) {
    return (
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <a href="/workouts" className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </a>
          <h1 className="text-xl font-bold">Workout</h1>
        </div>
        <ErrorState
          title="Workout Not Found"
          description={workoutError instanceof Error ? workoutError.message : 'Workout not found'}
          onGoHome={() => { window.location.href = '/'; }}
          onGoBack={() => { window.history.back(); }}
        />
      </main>
    );
  }

  return (
    <>
      <header className="bg-card border-b border-border py-4">
        <div className="max-w-lg mx-auto px-4 text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{workout.name}</h1>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mt-2">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              {formatDate(workout.startedAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Dumbbell size={14} />
              {formatDuration(workout.startedAt)}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md sm:max-w-lg md:max-w-xl px-3 py-4 pb-36 sm:px-4 sm:py-6">
        {Boolean(updateSetMutation.isError) && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">Failed to update set</p>
          </div>
        )}

        <div className="space-y-4">
          {exercises.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No exercises added yet</p>
              <Button onClick={handleAddExerciseClick}>
                <Plus size={18} />
                Add Exercise
              </Button>
            </Card>
          ) : (
            exercises.map((exercise) => {
              const videoTutorial = getVideoTutorialByName(exercise.name);
              return (
                <ExerciseLogger
                  key={exercise.id}
                  exercise={{
                    id: exercise.exerciseId,
                    name: exercise.name,
                    muscleGroup: exercise.muscleGroup ?? '',
                    isAmrap: exercise.isAmrap,
                  }}
                  sets={exercise.sets.map((set) => ({
                    id: set.id,
                    reps: set.reps ?? 0,
                    weight: set.weight ?? 0,
                    completed: set.isComplete,
                  }))}
                  onSetsUpdate={(newSets) => {
                    for (let i = 0; i < newSets.length && i < exercise.sets.length; i++) {
                      const newSet = newSets[i];
                      const oldSet = exercise.sets[i];
                      const hasChanges =
                        newSet.weight !== (oldSet.weight ?? 0) ||
                        newSet.reps !== (oldSet.reps ?? 0) ||
                        newSet.completed !== oldSet.isComplete;
                      if (hasChanges) {
                        handleUpdateSet(exercise.exerciseId, newSet.id, {
                          weight: newSet.weight,
                          reps: newSet.reps,
                          isComplete: newSet.completed,
                        });
                      }
                    }
                  }}
                  onAddSet={async (exerciseId, currentSets) => {
                    await handleAddSet(exerciseId, currentSets);
                  }}
                  videoTutorial={videoTutorial ?? null}
                />
              );
            })
          )}

          {exercises.length > 0 ? (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={handleAddExerciseClick}
            >
              <Plus size={18} />
              Add Exercise
            </Button>
          ) : null}

          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Workout Notes</span>
              {editingNotes ? (
                <div className="flex items-center gap-2">
                  <button
                    className="text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingNotes(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="text-sm text-primary hover:text-primary"
                    onClick={handleSaveNotes}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  className="text-sm text-primary hover:text-primary"
                  onClick={() => setEditingNotes(true)}
                >
                  Edit
                </button>
              )}
            </div>
            {editingNotes ? (
              <textarea
                className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                onChange={handleNotesChange}
                placeholder="Add notes about this workout..."
                rows={3}
                value={notes}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                {notes ?? workout.notes ?? 'No notes added'}
              </p>
            )}
          </div>
        </div>
      </main>

      <Drawer open={showExerciseSelector} onOpenChange={setShowExerciseSelector}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add Exercise</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                autoFocus={true}
                className="pl-10"
                onChange={handleExerciseSearchChange}
                placeholder="Search exercises..."
                type="text"
                value={exerciseSearch}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {availableExercisesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredExercises.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No exercises found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredExercises.map((exercise) => (
                  <button
                    className="w-full text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/10 transition-colors"
                    data-id={exercise.id}
                    key={exercise.id}
                    onClick={handleAddExerciseClickShared}
                  >
                    <div>
                      <h3 className="font-medium text-foreground">{exercise.name}</h3>
                      {exercise.muscleGroup ? (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-primary bg-primary/10 rounded-full">
                          {exercise.muscleGroup}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Workout?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-muted-foreground mb-4">
            This will permanently delete this workout. This action cannot be undone.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDiscardConfirm(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleDiscardWorkout}
            >
              Discard Workout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showIncompleteSetsConfirm} onOpenChange={setShowIncompleteSetsConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Incomplete Sets</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-muted-foreground mb-4">
            {'You have sets that haven\'t been marked as complete. Are you sure you want to continue?'}
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowIncompleteSetsConfirm(false)}>
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={handleIncompleteSetsContinue}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedTutorial ? (
        <VideoTutorialModal
          videoTutorial={selectedTutorial.tutorial}
          exerciseName={selectedTutorial.exerciseName}
          open={!!selectedTutorial}
          onOpenChange={() => setSelectedTutorial(null)}
        />
      ) : null}

      <div className="fixed bottom-[68px] left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 z-40">
        <div className="mx-auto max-w-lg flex items-center justify-between gap-2">
          <button
            className="px-3 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors text-sm font-medium"
            onClick={() => setShowDiscardConfirm(true)}
          >
            Discard
          </button>
          <button
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm'
            )}
            disabled={completeWorkoutMutation.isPending || totalSetsCount === 0}
            onClick={handleCompleteWorkout}
          >
            {completeWorkoutMutation.isPending ? (
              <>
                <Loader2 className="animate-spin h-4 w-4" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Complete
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export const Route = createFileRoute('/workouts/$id')({
  component: WorkoutSession,
});

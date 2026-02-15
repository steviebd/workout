'use client';

import { createFileRoute, useParams } from '@tanstack/react-router';
import {
  Calendar,
  Check,
  ChevronLeft,
  Dumbbell,
  Loader2,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { getVideoTutorialByName, type VideoTutorial } from '@/lib/exercise-library';
import { useDateFormat } from '@/lib/context/DateFormatContext';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '~/components/ui/Skeleton';
import { ExerciseLogger } from '@/components/workouts/ExerciseLogger';
import { VideoTutorialModal } from '@/components/VideoTutorialModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/Drawer';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/AlertDialog';
import { Input } from '@/components/ui/Input';

function WorkoutSession() {
  const params = useParams({ from: '/workouts/$id' });
  const workoutId = params.id;
  const { formatDate } = useDateFormat();

  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showIncompleteSetsConfirm, setShowIncompleteSetsConfirm] = useState(false);
  const [selectedTutorial, setSelectedTutorial] = useState<{ tutorial: VideoTutorial; exerciseName: string } | null>(null);

  const {
    workout,
    workoutLoading,
    workoutError,
    exercises,
    availableExercises,
    availableExercisesLoading,
    totalSetsCount,
    formatDuration,
    updateSetMutation,
    completeWorkoutMutation,
    handleUpdateSet,
    handleAddSet,
    handleAddExercise,
    handleCompleteWorkout,
    handleDiscardWorkout,
    handleSaveNotes,
  } = useWorkoutSession({ workoutId });

  const filteredExercises = useMemo(() =>
    availableExercises.filter((exercise) =>
      exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase()) &&
      !exercises.some((e) => e.exerciseId === exercise.id)
    ), [availableExercises, exerciseSearch, exercises]);

  const handleAddExerciseClick = () => {
    setShowExerciseSelector(true);
  };

  const handleAddExerciseClickShared = (e: React.MouseEvent) => {
    const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
    const exercise = filteredExercises.find(ex => ex.id === id);
    if (exercise) {
      handleAddExercise(exercise);
      setShowExerciseSelector(false);
      setExerciseSearch('');
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  const handleExerciseSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExerciseSearch(e.target.value);
  };

  const handleNotesSave = () => {
    handleSaveNotes(notes);
    setEditingNotes(false);
  };

  const handleIncompleteSetsContinue = () => {
    setShowIncompleteSetsConfirm(false);
    completeWorkoutMutation.mutate(undefined, {
      onSuccess: () => {
        const is1RMTest = workout?.name === '1RM Test' && workout?.programCycleId;
        const redirectUrl = is1RMTest
          ? `/programs/cycle/${workout?.programCycleId}/1rm-test`
          : `/workouts/${workoutId}/summary`;

        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1000);
      },
    });
  };

  if (workoutLoading) {
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
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 z-50 md:pb-safe">
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
      <header className="bg-card border-b border-border py-4 px-4">
        <div className="max-w-lg mx-auto text-center">
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

      <main className="mx-auto max-w-lg px-3 py-4 pb-28 sm:px-4 sm:py-6 sm:pb-32">
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
                    onClick={handleNotesSave}
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
          <AlertDialogDescription>
            This will permanently delete this workout. This action cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDiscardConfirm(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
          <AlertDialogDescription>
            You have sets that haven&apos;t been marked as complete. Are you sure you want to continue?
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowIncompleteSetsConfirm(false)}>
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-success text-success-foreground hover:bg-success/90"
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

      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 z-50 safe-area-pb">
        <div className="mx-auto max-w-lg flex items-center justify-between gap-3">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => setShowDiscardConfirm(true)}
          >
            <X className="h-4 w-4" />
            Discard
          </Button>
          <Button
            className="flex-1"
            disabled={completeWorkoutMutation.isPending || totalSetsCount === 0}
            onClick={() => {
              const incompleteSetsCount = exercises.reduce((acc, e) => {
                return acc + e.sets.filter((s) => !s.isComplete).length;
              }, 0);

              if (incompleteSetsCount > 0) {
                setShowIncompleteSetsConfirm(true);
                return;
              }

              handleCompleteWorkout();
            }}
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
          </Button>
        </div>
      </div>
    </>
  );
}

export const Route = createFileRoute('/workouts/$id')({
  component: WorkoutSession,
});

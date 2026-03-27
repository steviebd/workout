import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router';
import {
  Calendar,
  ChevronLeft,
  Dumbbell,
  Loader2,
  Plus,
  Save,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { useDateFormat } from '@/lib/context/UserPreferencesContext';
import { cn } from '@/lib/cn';
import { ExerciseLogger } from '@/components/workouts/ExerciseLogger';
import { ExerciseSelector } from '@/components/exercise/ExerciseSelector';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

function EditWorkout() {
  const params = useParams({ from: '/workouts/$id_/edit' });
  const navigate = useNavigate();
  const workoutId = params.id;
  const { formatDate } = useDateFormat();

  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const {
    workout,
    workoutLoading,
    workoutError,
    exercises,
    availableExercises,
    availableExercisesLoading,
    formatDuration,
    handleUpdateSet,
    handleAddSet,
    handleDeleteSet,
    handleAddExercise,
    handleSaveNotes,
  } = useWorkoutSession({ workoutId });

  useEffect(() => {
    if (workout?.notes !== undefined) {
      setNotes(workout.notes ?? '');
    }
  }, [workout?.notes]);

  const filteredExercises = useMemo(() =>
    availableExercises.filter((exercise) =>
      exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase()) &&
      !exercises.some((e) => e.exerciseId === exercise.id)
    ), [availableExercises, exerciseSearch, exercises]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  const handleSaveNotesClick = () => {
    handleSaveNotes(notes);
    setEditingNotes(false);
  };

  const handleEditNotesClick = () => {
    setEditingNotes(true);
  };

  const handleCancelNotesClick = () => {
    setEditingNotes(false);
  };

  const handleAddExerciseClick = () => {
    setShowExerciseSelector(true);
  };

  const handleAddExerciseWrapper = (exercise: { id: string; name: string; muscleGroup: string | null }) => {
    handleAddExercise(exercise);
    setShowExerciseSelector(false);
    setExerciseSearch('');
  };

  const handleSaveWorkout = () => {
    void navigate({ to: '/progress' });
  };

  if (workoutLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (workoutError || !workout) {
    return (
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <a href="/progress" className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </a>
          <h1 className="text-xl font-bold">Edit Workout</h1>
        </div>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">Workout Not Found</h2>
          <p className="text-muted-foreground mb-6">{workoutError instanceof Error ? workoutError.message : 'Workout not found'}</p>
          <Button asChild={true} className="w-full">
            <a href="/progress">Back to History</a>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">{workout.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(workout.startedAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Dumbbell size={14} />
                  {formatDuration(workout.startedAt)}
                </span>
              </div>
            </div>
            <button
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              onClick={handleSaveWorkout}
            >
              <Save size={18} />
              Save
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-lg px-4 py-6 pb-24">
        <div className="space-y-4">
          {exercises.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No exercises in this workout</p>
              <Button onClick={handleAddExerciseClick}>
                <Plus size={18} />
                Add Exercise
              </Button>
            </Card>
          ) : (
            exercises.map((exercise) => (
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
                onDeleteSet={handleDeleteSet}
              />
            ))
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
                    onClick={handleCancelNotesClick}
                  >
                    Cancel
                  </button>
                  <button
                    className="text-sm text-primary hover:text-primary"
                    onClick={handleSaveNotesClick}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  className="text-sm text-primary hover:text-primary"
                  onClick={handleEditNotesClick}
                >
                  Edit
                </button>
              )}
            </div>
            {editingNotes ? (
              <textarea
                className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none resize-none"
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

      <ExerciseSelector
        exercises={availableExercisesLoading ? [] : filteredExercises}
        onAddExercise={handleAddExerciseWrapper}
        onOpenChange={setShowExerciseSelector}
        searchValue={exerciseSearch}
        onSearchChange={setExerciseSearch}
        selectedExerciseIds={exercises.map((e) => e.exerciseId)}
        open={showExerciseSelector}
      />
    </>
  );
}

export const Route = createFileRoute('/workouts/$id_/edit')({
  component: EditWorkout,
});

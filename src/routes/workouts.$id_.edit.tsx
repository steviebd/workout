'use client';

import { createFileRoute, useParams } from '@tanstack/react-router';
import {
  Calendar,
  ChevronLeft,
  Dumbbell,
  Loader2,
  Plus,
  Save,
  Search,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './__root';
import { type Workout } from '@/lib/db/schema';
import { type WorkoutExerciseWithDetails } from '@/lib/db/workout';
import { useToast } from '@/components/ToastProvider';
import { ExerciseLogger } from '@/components/workouts/ExerciseLogger';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { useDateFormat } from '@/lib/context/DateFormatContext';
import { cn } from '@/lib/cn';

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

interface NewWorkoutExerciseResponse {
  id: string;
  notes: string | null;
}

function EditWorkout() {
  const auth = useAuth();
  const params = useParams({ from: '/workouts/$id_/edit' });
  const toast = useToast();
  const { formatDate } = useDateFormat();
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const fetchedRef = useRef(false);

  const filteredExercises = availableExercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase()) &&
    !exercises.some((e) => e.exerciseId === exercise.id)
  );

  const handleUpdateSet = useCallback(async (
    exerciseId: string,
    setId: string,
    updates: Partial<WorkoutSet>
  ) => {
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates)
    ) as Record<string, number | null | boolean>;

    if (cleanUpdates.weight !== null && (cleanUpdates.weight as number) < 0) return;
    if (cleanUpdates.reps !== null && (cleanUpdates.reps as number) < 0) return;
    if (cleanUpdates.rpe !== null && (cleanUpdates.rpe as number) < 0) return;

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
      } else if (res.status === 404) {
        toast.error('Set not found. Please refresh and try again.');
      }
    } catch (err) {
      console.error('Failed to update set:', err);
      setError('Failed to update set');
      toast.error('Failed to update set');
    }
  }, [exercises, toast]);

  const addSetToBackend = useCallback(async (
    workoutExerciseId: string,
    setNumber: number,
    weight?: number | null,
    reps?: number | null,
    rpe?: number | null
  ): Promise<WorkoutSet | null> => {
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

    if (res.ok) {
      const newSet: WorkoutSet = await res.json();
      return newSet;
    }

    return null;
  }, []);

  const handleAddSet = useCallback(async (
    exerciseId: string,
    _currentSets: Array<{ id: string; reps: number; weight: number; completed: boolean }>
  ) => {
    const exercise = exercises.find(e => e.exerciseId === exerciseId);
    if (!exercise) return;
    
    const setNumber = exercise.sets.length + 1;
    const lastSet = exercise.sets[exercise.sets.length - 1];
    
    const newSet = await addSetToBackend(exercise.id, setNumber, lastSet.weight, lastSet.reps, null);
    
    if (newSet) {
      setExercises(prev => prev.map(e => {
        if (e.exerciseId === exerciseId) {
          return {
            ...e,
            sets: [...e.sets, newSet]
          };
        }
        return e;
      }));
    }
  }, [exercises, addSetToBackend]);

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

        const workoutExercise: WorkoutExercise = {
          id: newExerciseData.id,
          exerciseId: exercise.id,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          orderIndex,
          sets: [],
          notes: newExerciseData.notes ?? null,
          isAmrap: false,
        };

        const newSet = await addSetToBackend(newExerciseData.id, 1, null, null, null);
        if (newSet) {
          workoutExercise.sets.push(newSet);
        }

        setExercises([...exercises, workoutExercise]);
      }
    } catch (err) {
      console.error('Failed to add exercise:', err);
      setError('Failed to add exercise');
    }

    setShowExerciseSelector(false);
    setExerciseSearch('');
  }, [exercises, workoutId, addSetToBackend]);

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
        toast.success('Notes saved');
      }
    } catch (err) {
      console.error('Failed to save notes:', err);
      setError('Failed to save notes');
    }
  }, [workoutId, notes, toast]);

  const handleSaveWorkout = useCallback(async () => {
    if (!workoutId) return;

    setSaving(true);
    setError(null);

    try {
      toast.success('Workout saved successfully');
      window.location.href = '/progress';
    } catch (err) {
      console.error('Failed to save workout:', err);
      setError('Failed to save workout');
    } finally {
      setSaving(false);
    }
  }, [workoutId, toast]);

  const handleExerciseSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setExerciseSearch(e.target.value);
  }, []);

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
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

  const handleAddExerciseClickWrapped = useCallback(() => {
    void handleAddExerciseClick();
  }, [handleAddExerciseClick]);

  const handleAddExerciseClickSharedWrapped = useCallback((e: React.MouseEvent) => {
    void handleAddExerciseClickShared(e);
  }, [handleAddExerciseClickShared]);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
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
            isAmrap: e.isAmrap,
          }));
          setExercises(flattenedExercises);
        }
      } else {
        let errorData: { error?: string } = {};
        try {
          errorData = await res.json();
        } catch {
        }
        console.error('Failed to fetch workout:', errorData);
        setError(errorData.error ?? 'Workout not found');
        toast.error(errorData.error ?? 'Workout not found');
      }
    } catch (err) {
      console.error('Failed to load workout:', err);
      setError('Failed to load workout');
      toast.error('Failed to load workout');
    }

    void fetchExercises();
  }, [params, toast]);

  useEffect(() => {
    if (!auth.loading && auth.user && !fetchedRef.current) {
      fetchedRef.current = true;
      void loadWorkout();
    }
  }, [auth.loading, auth.user, loadWorkout]);

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
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (error && !exercises.length) {
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
          <p className="text-muted-foreground mb-6">{error}</p>
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
              <h1 className="text-xl font-bold text-foreground">{workoutName}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(startedAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Dumbbell size={14} />
                  {formatDuration(startedAt)}
                </span>
              </div>
            </div>
            <button
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              disabled={saving}
              onClick={() => { void handleSaveWorkout(); }}
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-lg px-4 py-6 pb-24">
        {error ? (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : null}

        <div className="space-y-4">
          {exercises.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No exercises in this workout</p>
              <Button onClick={handleAddExerciseClickWrapped}>
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
                      void handleUpdateSet(exercise.exerciseId, newSet.id, {
                        weight: newSet.weight,
                        reps: newSet.reps,
                        isComplete: newSet.completed,
                      });
                    }
                  }
                }}
                onAddSet={(exerciseId, currentSets) => handleAddSet(exerciseId, currentSets)}
              />
            ))
          )}

          {exercises.length > 0 ? (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={handleAddExerciseClickWrapped}
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
                    onClick={() => { void handleSaveNotesClick(); }}
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
                className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                onChange={handleNotesChange}
                placeholder="Add notes about this workout..."
                rows={3}
                value={notes}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                {notes || 'No notes added'}
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
            {filteredExercises.length === 0 ? (
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
                    onClick={handleAddExerciseClickSharedWrapped}
                  >
                    <div>
                      <h3 className="font-medium text-foreground">{exercise.name}</h3>
                      {exercise.muscleGroup ?
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-primary bg-primary/10 rounded-full">
                          {exercise.muscleGroup}
                        </span> : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export const Route = createFileRoute('/workouts/$id_/edit')({
  component: EditWorkout,
});

'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/routes/__root';
import { type Workout } from '@/lib/db/schema';
import { type WorkoutExerciseWithDetails } from '@/lib/db/workout';
import { trackEvent } from '@/lib/posthog';
import { useToast } from '@/components/ToastProvider';
import { UI } from '~/lib/constants';

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string | null;
  orderIndex: number;
  sets: WorkoutSet[];
  notes: string | null;
  isAmrap: boolean;
}

export interface WorkoutSet {
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

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
}

interface UseWorkoutSessionOptions {
  workoutId: string;
}

export function useWorkoutSession({ workoutId }: UseWorkoutSessionOptions) {
  const auth = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

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
    staleTime: UI.TIMING.QUERY_STALE_TIME_MS,
  });

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  useEffect(() => {
    if (workout?.completedAt && workoutId) {
      window.location.href = `/workouts/${workoutId}/summary`;
    }
  }, [workout?.completedAt, workoutId]);

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
      window.location.href = '/workouts';
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
  }, [exercises, addExerciseMutation]);

  const handleCompleteWorkout = useCallback(() => {
    const incompleteSetsCount = exercises.reduce((acc, e) => {
      return acc + e.sets.filter((s) => !s.isComplete).length;
    }, 0);

    if (incompleteSetsCount > 0) {
      return { incomplete: true };
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
        }, UI.TIMING.AUTOSAVE_DELAY_MS);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to complete workout');
      },
    });

    return { incomplete: false };
  }, [exercises, completeWorkoutMutation, workout, workoutId, toast]);

  const handleDiscardWorkout = useCallback(() => {
    deleteWorkoutMutation.mutate();
  }, [deleteWorkoutMutation]);

  const handleSaveNotes = useCallback((notesValue: string) => {
    saveNotesMutation.mutate(notesValue);
  }, [saveNotesMutation]);

  const filteredExercises = useMemo(() =>
    availableExercises.filter((exercise) =>
      exercise.name.toLowerCase().includes(''.toLowerCase()) &&
      !exercises.some((e) => e.exerciseId === exercise.id)
    ), [availableExercises, exercises]);

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

  return {
    workout,
    workoutLoading,
    workoutError,
    exercises,
    availableExercises,
    availableExercisesLoading,
    filteredExercises,
    totalSetsCount,
    formatDuration,
    updateSetMutation,
    addSetMutation,
    addExerciseMutation,
    completeWorkoutMutation,
    deleteWorkoutMutation,
    saveNotesMutation,
    handleUpdateSet,
    handleAddSet,
    handleAddExercise,
    handleCompleteWorkout,
    handleDiscardWorkout,
    handleSaveNotes,
  };
}

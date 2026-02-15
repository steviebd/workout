export * from './types';

import { useCallback, useEffect, useState, useRef } from 'react';
import { getActiveWorkoutWithDetails, getWorkoutExerciseLocalId } from './queries';
import type { ActiveWorkout, ActiveWorkoutExercise, ActiveWorkoutSet } from './types';
import { localDB, type LocalWorkout, type LocalWorkoutExercise, type LocalWorkoutSet } from '~/lib/db/local-db';
import { generateLocalId, now, queueOperation } from '~/lib/db/local-repository';
import { useAuth } from '@/routes/__root';

export function useActiveWorkout() {
  const { user } = useAuth();
  const [workout, setWorkout] = useState<ActiveWorkout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const workoutRef = useRef<ActiveWorkout | null>(null);

  useEffect(() => {
    workoutRef.current = workout;
  }, [workout]);

  const loadWorkout = useCallback(async () => {
    if (!user) {
      setWorkout(null);
      setIsLoading(false);
      return;
    }

    try {
      const loaded = await getActiveWorkoutWithDetails(user.id);
      setWorkout(loaded);
    } catch (err) {
      console.error('Failed to load workout from Dexie:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadWorkout();
  }, [loadWorkout]);

  const startWorkout = useCallback(async (data: Omit<ActiveWorkout, 'startedAt' | 'exercises'>) => {
    if (!user) return;

    const localId = generateLocalId();
    const newWorkout: LocalWorkout = {
      id: undefined,
      localId,
      workosId: user.id,
      templateId: data.templateId,
      name: data.name,
      startedAt: now(),
      completedAt: undefined,
      status: 'in_progress',
      notes: data.notes,
      serverId: undefined,
      syncStatus: 'pending',
      needsSync: true,
    };

    await localDB.transaction('rw', localDB.workouts, localDB.offlineQueue, async () => {
      await localDB.workouts.add(newWorkout);
      await queueOperation('create', 'workout', localId, newWorkout as unknown as Record<string, unknown>);
    });

    const active: ActiveWorkout = {
      id: localId,
      name: data.name,
      templateId: data.templateId,
      startedAt: newWorkout.startedAt.toISOString(),
      notes: data.notes,
      exercises: [],
    };

    setWorkout(active);
  }, [user]);

  const updateWorkout = useCallback(async (updates: Partial<ActiveWorkout>) => {
    if (!workout || !user) return;

    const dbUpdate: Partial<LocalWorkout> = {
      name: updates.name,
      notes: updates.notes,
      syncStatus: 'pending',
      needsSync: true,
    };

    await localDB.workouts.where('localId').equals(workout.id).modify(dbUpdate);
    await queueOperation('update', 'workout', workout.id, { ...updates, localId: workout.id });

    setWorkout((prev) => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
  }, [workout, user]);

  const addExercise = useCallback(async (exercise: Omit<ActiveWorkoutExercise, 'sets'>) => {
    if (!workout || !user) return;

    const localId = generateLocalId();
    const workoutExercise: LocalWorkoutExercise = {
      id: undefined,
      localId,
      workoutId: workout.id,
      exerciseId: exercise.exerciseId,
      order: exercise.orderIndex,
      notes: exercise.notes,
      serverId: undefined,
      syncStatus: 'pending',
      needsSync: true,
    };

    await localDB.transaction('rw', localDB.workoutExercises, localDB.offlineQueue, async () => {
      await localDB.workoutExercises.add(workoutExercise);
      await queueOperation('create', 'workout_exercise', localId, workoutExercise as unknown as Record<string, unknown>);
    });

    setWorkout((prev) => {
      if (!prev) return prev;
      const newExercise: ActiveWorkoutExercise = {
        ...exercise,
        sets: [],
      };
      return {
        ...prev,
        exercises: [...prev.exercises, newExercise].sort((a, b) => a.orderIndex - b.orderIndex),
      };
    });
  }, [workout, user]);

  const removeExercise = useCallback(async (exerciseId: string) => {
    if (!workout || !user) return;

    const weLocalId = await getWorkoutExerciseLocalId(workout.id, exerciseId);
    await localDB.transaction('rw', localDB.workoutExercises, localDB.workoutSets, localDB.offlineQueue, async () => {
      if (weLocalId) {
        const we = await localDB.workoutExercises.where('localId').equals(weLocalId).first();
        const sets = await localDB.workoutSets.where('workoutExerciseId').equals(weLocalId).toArray();
        for (const set of sets) {
          if (set.id !== undefined) {
            await localDB.workoutSets.update(set.id, { syncStatus: 'pending', needsSync: true });
          }
          await queueOperation('delete', 'workout_set', set.localId, { localId: set.localId });
        }
          if (we?.id !== undefined) {
            await localDB.workoutExercises.update(we.id, { syncStatus: 'pending', needsSync: true });
          }
        await queueOperation('delete', 'workout_exercise', weLocalId, { localId: weLocalId });
      }
    });

    setWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.filter((e) => e.exerciseId !== exerciseId),
      };
    });
  }, [workout, user]);

  const addSet = useCallback(async (exerciseId: string, lastSetData?: { weight?: number; reps?: number; rpe?: number }) => {
    if (!workout || !user) return;

    const weLocalId = await getWorkoutExerciseLocalId(workout.id, exerciseId);
    if (!weLocalId) return;

    const existingSets = await localDB.workoutSets.where('workoutExerciseId').equals(weLocalId).toArray();
    const newSetNumber = existingSets.length + 1;

    const newSet: LocalWorkoutSet = {
      id: undefined,
      localId: generateLocalId(),
      workoutExerciseId: weLocalId,
      order: newSetNumber,
      weight: lastSetData?.weight ?? 0,
      reps: lastSetData?.reps ?? 0,
      rpe: lastSetData?.rpe,
      completed: false,
      setNumber: newSetNumber,
      serverId: undefined,
      syncStatus: 'pending',
      needsSync: true,
    };

    await localDB.transaction('rw', localDB.workoutSets, localDB.offlineQueue, async () => {
      await localDB.workoutSets.add(newSet);
      await queueOperation('create', 'workout_set', newSet.localId, newSet as unknown as Record<string, unknown>);
    });

    setWorkout((prev) => {
      if (!prev) return prev;

      const exerciseIndex = prev.exercises.findIndex((e) => e.exerciseId === exerciseId);
      if (exerciseIndex === -1) return prev;

      const exercise = prev.exercises[exerciseIndex];
      const newSetUI: ActiveWorkoutSet = {
        id: newSet.localId,
        setNumber: newSetNumber,
        weight: lastSetData?.weight,
        reps: lastSetData?.reps,
        rpe: lastSetData?.rpe,
        isComplete: false,
      };

      const updatedExercises = [...prev.exercises];
      updatedExercises[exerciseIndex] = {
        ...exercise,
        sets: [...exercise.sets, newSetUI],
      };

      return { ...prev, exercises: updatedExercises };
    });
  }, [workout, user]);

  const updateSet = useCallback(async (exerciseId: string, setId: string, updates: Partial<ActiveWorkoutSet>) => {
    if (!workout || !user) return;

    const weLocalId = await getWorkoutExerciseLocalId(workout.id, exerciseId);
    if (!weLocalId) return;

    const set = await localDB.workoutSets.where('localId').equals(setId).first();
    if (!set) return;

    const dbUpdate: Partial<LocalWorkoutSet> = {
      weight: updates.weight ?? set.weight,
      reps: updates.reps ?? set.reps,
      rpe: updates.rpe ?? set.rpe,
      completed: updates.isComplete ?? set.completed,
      syncStatus: 'pending',
      needsSync: true,
    };

    await localDB.transaction('rw', localDB.workoutSets, localDB.offlineQueue, async () => {
      if (set.id !== undefined) {
        await localDB.workoutSets.update(set.id, dbUpdate);
      }
      await queueOperation('update', 'workout_set', setId, { ...updates, localId: setId });
    });

    setWorkout((prev) => {
      if (!prev) return prev;

      const exerciseIndex = prev.exercises.findIndex((e) => e.exerciseId === exerciseId);
      if (exerciseIndex === -1) return prev;

      const exercise = prev.exercises[exerciseIndex];
      const setIndex = exercise.sets.findIndex((s) => s.id === setId);
      if (setIndex === -1) return prev;

      const updatedExercises = [...prev.exercises];
      updatedExercises[exerciseIndex] = {
        ...exercise,
        sets: exercise.sets.map((s, i) =>
          i === setIndex ? { ...s, ...updates } : s
        ),
      };

      return { ...prev, exercises: updatedExercises };
    });
  }, [workout, user]);

  const completeSet = useCallback((exerciseId: string, setId: string) => {
    void updateSet(exerciseId, setId, {
      isComplete: true,
      completedAt: new Date().toISOString(),
    });
  }, [updateSet]);

  const deleteSet = useCallback(async (exerciseId: string, setId: string) => {
    if (!workout || !user) return;

    const set = await localDB.workoutSets.where('localId').equals(setId).first();
    if (!set) return;

    await localDB.transaction('rw', localDB.workoutSets, localDB.offlineQueue, async () => {
      if (set.id !== undefined) {
        await localDB.workoutSets.update(set.id, { syncStatus: 'pending', needsSync: true });
      }
      await queueOperation('delete', 'workout_set', setId, { localId: setId });
    });

    setWorkout((prev) => {
      if (!prev) return prev;

      const exerciseIndex = prev.exercises.findIndex((e) => e.exerciseId === exerciseId);
      if (exerciseIndex === -1) return prev;

      const exercise = prev.exercises[exerciseIndex];
      const updatedSets = exercise.sets.filter((s) => s.id !== setId);

      const updatedExercises = [...prev.exercises];
      updatedExercises[exerciseIndex] = {
        ...exercise,
        sets: updatedSets.map((s, i) => ({ ...s, setNumber: i + 1 })),
      };

      return { ...prev, exercises: updatedExercises };
    });
  }, [workout, user]);

  const reorderExercises = useCallback(async (exerciseOrders: Array<{ exerciseId: string; orderIndex: number }>) => {
    if (!workout || !user) return;

    const allWorkoutExercises = await localDB.workoutExercises
      .where('workoutId')
      .equals(workout.id)
      .toArray();

    const weByExerciseId = new Map(allWorkoutExercises.map(we => [we.exerciseId, we]));

    const updates: Array<{ id: number; order: number; localId: string }> = [];
    for (const order of exerciseOrders) {
      const we = weByExerciseId.get(order.exerciseId);
      if (we?.id !== undefined) {
        updates.push({ id: we.id, order: order.orderIndex, localId: we.localId });
      }
    }

    await localDB.transaction('rw', localDB.workoutExercises, localDB.offlineQueue, async () => {
      for (const update of updates) {
        await localDB.workoutExercises.update(update.id, {
          order: update.order,
          syncStatus: 'pending',
          needsSync: true,
        });
      }

      const operations = updates.map(update => ({
        operationId: generateLocalId(),
        type: 'update' as const,
        entity: 'workout_exercise' as const,
        localId: update.localId,
        data: { order: update.order, localId: update.localId },
        timestamp: now(),
        retryCount: 0,
        maxRetries: 3,
      }));
      await localDB.offlineQueue.bulkAdd(operations);
    });

    setWorkout((prev) => {
      if (!prev) return prev;

      const exerciseMap = new Map(prev.exercises.map((e) => [e.exerciseId, e]));
      const reorderedExercises = exerciseOrders
        .map((order) => exerciseMap.get(order.exerciseId))
        .filter((e): e is ActiveWorkoutExercise => e !== undefined)
        .map((e, i) => ({ ...e, orderIndex: i }));

      return { ...prev, exercises: reorderedExercises };
    });
  }, [workout, user]);

  const completeWorkout = useCallback(async () => {
    if (!workout || !user) return;

    await localDB.workouts.where('localId').equals(workout.id).modify({
      completedAt: now(),
      status: 'completed' as const,
      syncStatus: 'pending' as const,
      needsSync: true,
    });
    await queueOperation('update', 'workout', workout.id, { completedAt: now(), status: 'completed', localId: workout.id });

    setWorkout(null);
  }, [workout, user]);

  const deleteWorkoutInternal = useCallback(async () => {
    if (!workout || !user) return;

    const workoutRecord = await localDB.workouts.where('localId').equals(workout.id).first();
    if (!workoutRecord) {
      setWorkout(null);
      return;
    }

    await localDB.transaction('rw', localDB.workouts, localDB.workoutExercises, localDB.workoutSets, async () => {
      const exercises = await localDB.workoutExercises.where('workoutId').equals(workout.id).toArray();
      const weLocalIds = exercises.map(we => we.localId);

      if (weLocalIds.length > 0) {
        await localDB.workoutSets.where('workoutExerciseId').anyOf(weLocalIds).delete();
      }

      await localDB.workoutExercises.where('workoutId').equals(workout.id).delete();

      if (workoutRecord.id !== undefined) {
        await localDB.workouts.delete(workoutRecord.id);
      }
    });

    await queueOperation('delete', 'workout', workout.id, { localId: workout.id });

    setWorkout(null);
  }, [workout, user]);

  const clearWorkout = deleteWorkoutInternal;
  const discardWorkout = deleteWorkoutInternal;

  return {
    workout,
    isLoading,
    startWorkout,
    updateWorkout,
    addExercise,
    removeExercise,
    addSet,
    updateSet,
    completeSet,
    deleteSet,
    reorderExercises,
    clearWorkout,
    discardWorkout,
    completeWorkout,
  };
}

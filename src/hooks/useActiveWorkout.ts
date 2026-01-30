import { useCallback, useEffect, useState, useRef } from 'react';
import { localDB, type LocalWorkout, type LocalWorkoutExercise, type LocalWorkoutSet } from '~/lib/db/local-db';
import { useAuth } from '@/routes/__root';

export interface ActiveWorkoutExercise {
  exerciseId: string;
  name: string;
  muscleGroup: string | null;
  orderIndex: number;
  sets: ActiveWorkoutSet[];
  notes?: string;
}

export interface ActiveWorkoutSet {
  id: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  rpe?: number;
  isComplete: boolean;
  completedAt?: string;
}

export interface ActiveWorkout {
  id: string;
  name: string;
  templateId?: string;
  startedAt: string;
  notes?: string;
  exercises: ActiveWorkoutExercise[];
}

function generateLocalId(): string {
  return crypto.randomUUID();
}

function now(): Date {
  return new Date();
}

async function queueOperation(type: 'create' | 'update' | 'delete', entity: 'exercise' | 'template' | 'workout' | 'workout_exercise' | 'workout_set', localId: string, data: Record<string, unknown>): Promise<void> {
  const operation = {
    operationId: generateLocalId(),
    type,
    entity,
    localId,
    data,
    timestamp: now(),
    retryCount: 0,
    maxRetries: 3,
  };
  await localDB.offlineQueue.add(operation);
}

function mapLocalToActiveWorkout(
  localWorkout: LocalWorkout,
  exercises: Array<LocalWorkoutExercise & { sets: LocalWorkoutSet[] }>
): ActiveWorkout {
  const mappedExercises: ActiveWorkoutExercise[] = exercises
    .sort((a, b) => a.order - b.order)
    .map((we) => ({
      exerciseId: we.exerciseId,
      name: '',
      muscleGroup: null,
      orderIndex: we.order,
      sets: we.sets
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          id: s.localId,
          setNumber: s.setNumber,
          weight: s.weight,
          reps: s.reps,
          rpe: s.rpe ?? undefined,
          isComplete: s.completed,
          completedAt: s.completed ? new Date().toISOString() : undefined,
        })),
      notes: we.notes,
    }));

  return {
    id: localWorkout.localId,
    name: localWorkout.name,
    templateId: localWorkout.templateId,
    startedAt: localWorkout.startedAt.toISOString(),
    notes: localWorkout.notes,
    exercises: mappedExercises,
  };
}

async function getActiveWorkoutWithDetails(userId: string): Promise<ActiveWorkout | null> {
  const localWorkout = await localDB.workouts
    .where('userId').equals(userId)
    .and((w) => w.status === 'in_progress')
    .first();

  if (!localWorkout) return null;

  const workoutExercises = await localDB.workoutExercises
    .where('workoutId')
    .equals(localWorkout.localId)
    .toArray();

  const exercisesWithSets = await Promise.all(
    workoutExercises.map(async (we) => {
      const sets = await localDB.workoutSets
        .where('workoutExerciseId')
        .equals(we.localId)
        .toArray();
      return { ...we, sets };
    })
  );

  return mapLocalToActiveWorkout(localWorkout, exercisesWithSets);
}

async function getWorkoutExerciseLocalId(workoutLocalId: string, exerciseId: string): Promise<string | null> {
  const we = await localDB.workoutExercises
    .where('workoutId').equals(workoutLocalId)
    .and((e) => e.exerciseId === exerciseId)
    .first();
  return we?.localId ?? null;
}

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
      userId: user.id,
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

    await localDB.workouts.add(newWorkout);
    await queueOperation('create', 'workout', localId, newWorkout as unknown as Record<string, unknown>);

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

    await localDB.workoutExercises.add(workoutExercise);
    await queueOperation('create', 'workout_exercise', localId, workoutExercise as unknown as Record<string, unknown>);

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

    await localDB.workoutSets.add(newSet);
    await queueOperation('create', 'workout_set', newSet.localId, newSet as unknown as Record<string, unknown>);

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

    if (set.id !== undefined) {
      await localDB.workoutSets.update(set.id, dbUpdate);
    }
    await queueOperation('update', 'workout_set', setId, { ...updates, localId: setId });

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

    if (set.id !== undefined) {
      await localDB.workoutSets.update(set.id, { syncStatus: 'pending', needsSync: true });
    }
    await queueOperation('delete', 'workout_set', setId, { localId: setId });

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

    for (const order of exerciseOrders) {
      const weLocalId = await getWorkoutExerciseLocalId(workout.id, order.exerciseId);
      if (weLocalId) {
        const we = await localDB.workoutExercises.where('localId').equals(weLocalId).first();
        if (we?.id !== undefined) {
          await localDB.workoutExercises.update(we.id, {
            order: order.orderIndex,
            syncStatus: 'pending',
            needsSync: true,
          });
        }
        await queueOperation('update', 'workout_exercise', weLocalId, { order: order.orderIndex, localId: weLocalId });
      }
    }

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

  const clearWorkout = useCallback(async () => {
    if (!workout || !user) return;

    const workoutRecord = await localDB.workouts.where('localId').equals(workout.id).first();
    if (workoutRecord) {
      const exercises = await localDB.workoutExercises.where('workoutId').equals(workout.id).toArray();
      for (const we of exercises) {
        const sets = await localDB.workoutSets.where('workoutExerciseId').equals(we.localId).toArray();
        for (const set of sets) {
          if (set.id !== undefined) {
            await localDB.workoutSets.delete(set.id);
          }
        }
        if (we.id !== undefined) {
          await localDB.workoutExercises.delete(we.id);
        }
      }
      if (workoutRecord.id !== undefined) {
        await localDB.workouts.delete(workoutRecord.id);
      }
    }

    setWorkout(null);
  }, [workout, user]);

  const discardWorkout = useCallback(async () => {
    if (!workout || !user) return;

    const workoutRecord = await localDB.workouts.where('localId').equals(workout.id).first();
    if (workoutRecord) {
      const exercises = await localDB.workoutExercises.where('workoutId').equals(workout.id).toArray();
      for (const we of exercises) {
        const sets = await localDB.workoutSets.where('workoutExerciseId').equals(we.localId).toArray();
        for (const set of sets) {
          if (set.id !== undefined) {
            await localDB.workoutSets.delete(set.id);
          }
        }
        if (we.id !== undefined) {
          await localDB.workoutExercises.delete(we.id);
        }
      }
      if (workoutRecord.id !== undefined) {
        await localDB.workouts.delete(workoutRecord.id);
      }
    }

    setWorkout(null);
  }, [workout, user]);

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

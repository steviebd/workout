import { useCallback, useEffect, useRef, useState } from 'react';

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

const ACTIVE_WORKOUT_KEY = 'activeWorkout';
const SYNC_INTERVAL = 1000;

function loadWorkoutFromStorage(setWorkout: (workout: ActiveWorkout | null) => void, setIsLoading: (loading: boolean) => void) {
  try {
    const stored = localStorage.getItem(ACTIVE_WORKOUT_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ActiveWorkout;
      setWorkout(parsed);
    }
  } catch (err) {
    console.error('Failed to load workout from localStorage:', err);
  } finally {
    setIsLoading(false);
  }
}

function setupVisibilityListener(loadWorkoutFromStorageFn: () => void) {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      loadWorkoutFromStorageFn();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
}

function setupBeforeUnloadListener(workout: ActiveWorkout | null, saveWorkoutFn: () => void) {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (workout) {
      saveWorkoutFn();
      e.preventDefault();
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
}

function removeBeforeUnloadListener() {
  window.removeEventListener('beforeunload', () => {});
}

export function useActiveWorkout() {
  const [workout, setWorkout] = useState<ActiveWorkout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(0);
  const workoutRef = useRef<ActiveWorkout | null>(null);

  const saveWorkoutToStorage = useCallback((currentWorkout: ActiveWorkout | null) => {
    if (!currentWorkout) return;

    try {
      localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(currentWorkout));
      lastSyncRef.current = Date.now();
    } catch (err) {
      console.error('Failed to save workout to localStorage:', err);
    }
  }, []);

  useEffect(() => {
    workoutRef.current = workout;
  }, [workout]);

  useEffect(() => {
    const loadFn = () => loadWorkoutFromStorage(setWorkout, setIsLoading);
    const saveFn = () => saveWorkoutToStorage(workoutRef.current);
    
    loadFn();
    setupVisibilityListener(loadFn);
    setupBeforeUnloadListener(workout, saveFn);

    const timeout = syncTimeoutRef.current;
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      removeBeforeUnloadListener();
    };
  }, [saveWorkoutToStorage, workout]);

  const syncWorkout = useCallback(() => {
    if (!workout) return;

    const now = Date.now();
    if (now - lastSyncRef.current < SYNC_INTERVAL) return;

    setIsSyncing(true);
    saveWorkoutToStorage(workout);

    setTimeout(() => {
      setIsSyncing(false);
    }, 100);
  }, [workout, saveWorkoutToStorage]);

  const startWorkout = useCallback((data: Omit<ActiveWorkout, 'startedAt'>) => {
    const newWorkout: ActiveWorkout = {
      ...data,
      startedAt: new Date().toISOString(),
    };

    setWorkout(newWorkout);
    saveWorkoutToStorage(newWorkout);
  }, [saveWorkoutToStorage]);

  const updateWorkout = useCallback((updates: Partial<ActiveWorkout>) => {
    setWorkout((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      return updated;
    });
    syncWorkout();
  }, [syncWorkout]);

  const addExercise = useCallback((exercise: Omit<ActiveWorkoutExercise, 'sets'>) => {
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
    syncWorkout();
  }, [syncWorkout]);

  const removeExercise = useCallback((exerciseId: string) => {
    setWorkout((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        exercises: prev.exercises.filter((e) => e.exerciseId !== exerciseId),
      };
    });
    syncWorkout();
  }, [syncWorkout]);

  const addSet = useCallback((exerciseId: string, lastSetData?: { weight?: number; reps?: number; rpe?: number }) => {
    setWorkout((prev) => {
      if (!prev) return prev;

      const exerciseIndex = prev.exercises.findIndex((e) => e.exerciseId === exerciseId);
      if (exerciseIndex === -1) return prev;

      const exercise = prev.exercises[exerciseIndex];
      const newSetNumber = exercise.sets.length + 1;
      const newSet: ActiveWorkoutSet = {
        id: crypto.randomUUID(),
        setNumber: newSetNumber,
        weight: lastSetData?.weight,
        reps: lastSetData?.reps,
        rpe: lastSetData?.rpe,
        isComplete: false,
      };

      const updatedExercises = [...prev.exercises];
      updatedExercises[exerciseIndex] = {
        ...exercise,
        sets: [...exercise.sets, newSet],
      };

      return { ...prev, exercises: updatedExercises };
    });
    syncWorkout();
  }, [syncWorkout]);

  const updateSet = useCallback((exerciseId: string, setId: string, updates: Partial<ActiveWorkoutSet>) => {
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
        sets: exercise.sets.map((set, i) =>
          i === setIndex ? { ...set, ...updates } : set
        ),
      };

      return { ...prev, exercises: updatedExercises };
    });
    syncWorkout();
  }, [syncWorkout]);

  const completeSet = useCallback((exerciseId: string, setId: string) => {
    updateSet(exerciseId, setId, {
      isComplete: true,
      completedAt: new Date().toISOString(),
    });
  }, [updateSet]);

  const deleteSet = useCallback((exerciseId: string, setId: string) => {
    setWorkout((prev) => {
      if (!prev) return prev;

      const exerciseIndex = prev.exercises.findIndex((e) => e.exerciseId === exerciseId);
      if (exerciseIndex === -1) return prev;

      const exercise = prev.exercises[exerciseIndex];
      const updatedSets = exercise.sets.filter((s) => s.id !== setId);

      const updatedExercises = [...prev.exercises];
      updatedExercises[exerciseIndex] = {
        ...exercise,
        sets: updatedSets.map((set, i) => ({ ...set, setNumber: i + 1 })),
      };

      return { ...prev, exercises: updatedExercises };
    });
    syncWorkout();
  }, [syncWorkout]);

  const reorderExercises = useCallback((exerciseOrders: Array<{ exerciseId: string; orderIndex: number }>) => {
    setWorkout((prev) => {
      if (!prev) return prev;

      const exerciseMap = new Map(prev.exercises.map((e) => [e.exerciseId, e]));
      const reorderedExercises = exerciseOrders
        .map((order) => exerciseMap.get(order.exerciseId))
        .filter((e): e is ActiveWorkoutExercise => e !== undefined)
        .map((e, i) => ({ ...e, orderIndex: i }));

      return { ...prev, exercises: reorderedExercises };
    });
    syncWorkout();
  }, [syncWorkout]);

  const clearWorkout = useCallback(() => {
    setWorkout(null);
    try {
      localStorage.removeItem(ACTIVE_WORKOUT_KEY);
    } catch (err) {
      console.error('Failed to clear workout from localStorage:', err);
    }
  }, []);

  const discardWorkout = useCallback(() => {
    clearWorkout();
  }, [clearWorkout]);

  return {
    workout,
    isLoading,
    isSyncing,
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
    syncWorkout,
  };
}

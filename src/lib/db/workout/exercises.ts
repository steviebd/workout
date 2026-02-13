import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import {
  exercises,
  workoutExercises,
  workoutSets,
  workouts,
} from '../schema';
import { getDb } from '../index';
import type {
  DbOrTx,
  WorkoutExerciseWithDetails,
  ExerciseOrder,
  LastWorkoutSetData,
  WorkoutExercise,
  WorkoutSet,
} from './types';

/**
 * Retrieves all exercises in a workout with their sets
 * @param dbOrTx - D1 database instance or transaction
 * @param workoutId - The workout ID
 * @param workosId - The user's WorkOS ID for ownership validation
 * @returns Array of workout exercises with details and sets
 */
export async function getWorkoutExercises(
  dbOrTx: DbOrTx,
  workoutId: string,
  workosId: string
): Promise<WorkoutExerciseWithDetails[]> {
  const db = getDb(dbOrTx);

  const results = await db
    .select({
      id: workoutExercises.id,
      localId: workoutExercises.localId,
      workoutId: workoutExercises.workoutId,
      exerciseId: workoutExercises.exerciseId,
      orderIndex: workoutExercises.orderIndex,
      notes: workoutExercises.notes,
      isAmrap: workoutExercises.isAmrap,
      setNumber: workoutExercises.setNumber,
      exercise: {
        id: exercises.id,
        name: exercises.name,
        muscleGroup: exercises.muscleGroup,
      },
      sets: {
        id: workoutSets.id,
        localId: workoutSets.localId,
        workoutExerciseId: workoutSets.workoutExerciseId,
        setNumber: workoutSets.setNumber,
        weight: workoutSets.weight,
        reps: workoutSets.reps,
        rpe: workoutSets.rpe,
        isComplete: workoutSets.isComplete,
        completedAt: workoutSets.completedAt,
        createdAt: workoutSets.createdAt,
      },
    })
    .from(workoutExercises)

    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .leftJoin(workoutSets, eq(workoutExercises.id, workoutSets.workoutExerciseId))
    .where(and(
      eq(workoutExercises.workoutId, workoutId),
      eq(exercises.workosId, workosId),
      eq(exercises.isDeleted, false)
    ))
    .orderBy(workoutExercises.orderIndex, workoutSets.setNumber)
    .all();

  const exerciseMap = new Map<string, WorkoutExerciseWithDetails>();

  for (const row of results) {
    const existing = exerciseMap.get(row.id);
    const setData = row.sets as WorkoutSet | null;
    if (existing) {
      if (setData?.id) {
        existing.sets.push(setData);
      }
    } else {
      exerciseMap.set(row.id, {
        id: row.id,
        localId: row.localId,
        workoutId: row.workoutId,
        exerciseId: row.exerciseId,
        orderIndex: row.orderIndex,
        notes: row.notes,
        isAmrap: row.isAmrap ?? false,
        setNumber: row.setNumber,
        exercise: row.exercise,
        sets: setData?.id ? [setData] : [],
      });
    }
  }

  return Array.from(exerciseMap.values());
}

export async function createWorkoutExercise(
  dbOrTx: DbOrTx,
  workoutId: string,
  workosId: string,
  exerciseId: string,
  orderIndex: number,
  notes?: string,
  localId?: string,
  isAmrap?: boolean,
  setNumber?: number
): Promise<WorkoutExercise | null> {
  const db = getDb(dbOrTx);

  const workout = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.workosId, workosId)))
    .get();

  if (!workout) {
    return null;
  }

  const workoutExercise = await db
    .insert(workoutExercises)
    .values({
      workoutId,
      exerciseId,
      orderIndex,
      notes,
      localId,
      isAmrap: isAmrap ?? false,
      setNumber: setNumber ?? null,
    })
    .returning()
    .get();

  return workoutExercise;
}

export async function removeWorkoutExercise(
  dbOrTx: DbOrTx,
  workoutId: string,
  exerciseId: string,
  workosId: string
): Promise<boolean> {
  const db = getDb(dbOrTx);

  const workout = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.workosId, workosId)))
    .get();

  if (!workout) {
    return false;
  }

  const result = await db
    .delete(workoutExercises)
    .where(and(
      eq(workoutExercises.workoutId, workoutId),
      eq(workoutExercises.exerciseId, exerciseId)
    ))
    .run();

  return result.success;
}

export async function reorderWorkoutExercises(
  dbOrTx: DbOrTx,
  workoutId: string,
  exerciseOrders: ExerciseOrder[],
  workosId: string
): Promise<boolean> {
  const db = getDb(dbOrTx);

  const workout = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.workosId, workosId)))
    .get();

  if (!workout) {
    return false;
  }

  const updates = exerciseOrders.map(order =>
    db
      .update(workoutExercises)
      .set({ orderIndex: order.orderIndex })
      .where(and(
        eq(workoutExercises.workoutId, workoutId),
        eq(workoutExercises.exerciseId, order.exerciseId)
      ))
      .run()
  );

  await Promise.all(updates);

  return true;
}

/**
 * Retrieves the most recent workout data for an exercise
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @param exerciseId - The exercise ID
 * @returns Object with weight, reps, rpe, and completion date, or null if no prior workout
 */
export async function getLastWorkoutForExercise(
  dbOrTx: DbOrTx,
  workosId: string,
  exerciseId: string
) {
  const db = getDb(dbOrTx);

  const recentSet = await db
    .select({
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      rpe: workoutSets.rpe,
      completedAt: workoutSets.completedAt,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workouts.workosId, workosId),
      eq(workoutExercises.exerciseId, exerciseId),
      isNotNull(workoutSets.completedAt)
    ))
    .orderBy(desc(workoutSets.completedAt))
    .limit(1)
    .get();

  return recentSet ? {
    exerciseId,
    weight: recentSet.weight,
    reps: recentSet.reps,
    rpe: recentSet.rpe,
  } : null;
}

/**
 * Retrieves all sets from the most recent workout for an exercise
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @param exerciseId - The exercise ID
 * @returns Array of set data from the last workout, empty if no prior workout
 */
export async function getLastWorkoutSetsForExercise(
  dbOrTx: DbOrTx,
  workosId: string,
  exerciseId: string
): Promise<LastWorkoutSetData[]> {
  const db = getDb(dbOrTx);

  const recentWorkoutExercise = await db
    .select({
      workoutExerciseId: workoutExercises.id,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workouts.workosId, workosId),
      eq(workoutExercises.exerciseId, exerciseId),
      isNotNull(workoutSets.completedAt)
    ))
    .orderBy(desc(workouts.completedAt))
    .limit(1)
    .get();

  if (!recentWorkoutExercise) {
    return [];
  }

  const sets = await db
    .select({
      setNumber: workoutSets.setNumber,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      rpe: workoutSets.rpe,
    })
    .from(workoutSets)
    .where(eq(workoutSets.workoutExerciseId, recentWorkoutExercise.workoutExerciseId))
    .orderBy(workoutSets.setNumber)
    .all();

  return sets.map(set => ({
    setNumber: set.setNumber,
    weight: set.weight,
    reps: set.reps,
    rpe: set.rpe,
  }));
}

/**
 * Retrieves the most recent workout sets for multiple exercises
 * @param dbOrTx - D1 database instance or transaction
 * @param workosId - The user's WorkOS ID
 * @param exerciseIds - Array of exercise IDs to get sets for
 * @returns Map of exercise ID to array of last workout set data
 */
export async function getLastWorkoutSetsForExercises(
  dbOrTx: DbOrTx,
  workosId: string,
  exerciseIds: string[]
): Promise<Map<string, LastWorkoutSetData[]>> {
  if (exerciseIds.length === 0) {
    return new Map();
  }

  const db = getDb(dbOrTx);

  const recentWorkoutExercises = await db
    .select({
      exerciseId: workoutExercises.exerciseId,
      workoutExerciseId: workoutExercises.id,
      completedAt: workouts.completedAt,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workouts.workosId, workosId),
      inArray(workoutExercises.exerciseId, exerciseIds),
      isNotNull(workoutSets.completedAt)
    ))
    .orderBy(desc(workouts.completedAt))
    .all();

  if (recentWorkoutExercises.length === 0) {
    return new Map();
  }

  const latestWeByExercise = new Map<string, string>();
  for (const rwe of recentWorkoutExercises) {
    if (!latestWeByExercise.has(rwe.exerciseId)) {
      latestWeByExercise.set(rwe.exerciseId, rwe.workoutExerciseId);
    }
  }

  const workoutExerciseIds = [...latestWeByExercise.values()];

  const sets = await db
    .select({
      workoutExerciseId: workoutSets.workoutExerciseId,
      setNumber: workoutSets.setNumber,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      rpe: workoutSets.rpe,
    })
    .from(workoutSets)
    .where(inArray(workoutSets.workoutExerciseId, workoutExerciseIds))
    .orderBy(workoutSets.setNumber)
    .all();

  const setsByWe = new Map<string, LastWorkoutSetData[]>();
  for (const s of sets) {
    const arr = setsByWe.get(s.workoutExerciseId) ?? [];
    arr.push({
      setNumber: s.setNumber,
      weight: s.weight,
      reps: s.reps,
      rpe: s.rpe,
    });
    setsByWe.set(s.workoutExerciseId, arr);
  }

  const result = new Map<string, LastWorkoutSetData[]>();
  for (const exerciseId of exerciseIds) {
    const weId = latestWeByExercise.get(exerciseId);
    result.set(exerciseId, weId ? (setsByWe.get(weId) ?? []) : []);
  }

  return result;
}

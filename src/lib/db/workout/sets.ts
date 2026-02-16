import { and, eq } from 'drizzle-orm';
import {
  workoutExercises,
  workoutSets,
  workouts,
} from '../schema';
import { getDb } from '../index';
import type {
  DbOrTx,
  WorkoutSet,
  NewWorkoutSet,
} from './types';

export async function createWorkoutSet(
  dbOrTx: DbOrTx,
  workoutExerciseId: string,
  workosId: string,
  setNumber: number,
  weight?: number,
  reps?: number,
  rpe?: number,
  localId?: string
): Promise<WorkoutSet | null> {
  const db = getDb(dbOrTx);

  const exerciseWithOwnership = await db
    .select({
      exerciseId: workoutExercises.id,
    })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workoutExercises.id, workoutExerciseId),
      eq(workouts.workosId, workosId)
    ))
    .get();

  if (!exerciseWithOwnership) {
    return null;
  }

  const workoutSet = await db
    .insert(workoutSets)
    .values({
      workoutExerciseId,
      setNumber,
      weight,
      reps,
      rpe,
      isComplete: false,
      localId,
    })
    .returning()
    .get();

  return workoutSet;
}

export async function updateWorkoutSet(
  dbOrTx: DbOrTx,
  setId: string,
  workosId: string,
  data: Partial<NewWorkoutSet>
): Promise<WorkoutSet | null> {
  const db = getDb(dbOrTx);

  const setWithOwnership = await db
    .select({
      setId: workoutSets.id,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workoutSets.id, setId),
      eq(workouts.workosId, workosId)
    ))
    .get();

  if (!setWithOwnership) {
    return null;
  }

  const updated = await db
    .update(workoutSets)
    .set(data)
    .where(eq(workoutSets.id, setId))
    .returning()
    .get();

        
  return updated ?? null;
}

/**
 * Marks a workout set as complete with completion timestamp
 * @param db - D1 database instance
 * @param setId - The set ID to complete
 * @param workosId - The user's WorkOS ID for ownership validation
 * @returns The completed set, or null if not found
 */
export async function completeWorkoutSet(
  dbOrTx: DbOrTx,
  setId: string,
  workosId: string
): Promise<WorkoutSet | null> {
  return updateWorkoutSet(dbOrTx, setId, workosId, {
    isComplete: true,
    completedAt: new Date().toISOString(),
  });
}

/**
 * Deletes a workout set permanently
 * @param db - D1 database instance
 * @param setId - The set ID to delete
 * @param workosId - The user's WorkOS ID for ownership validation
 * @returns True if the operation succeeded, false if not found
 */
export async function deleteWorkoutSet(
  dbOrTx: DbOrTx,
  setId: string,
  workosId: string
): Promise<boolean> {
  const db = getDb(dbOrTx);

  const setWithOwnership = await db
    .select({
      setId: workoutSets.id,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workoutSets.id, setId),
      eq(workouts.workosId, workosId)
    ))
    .get();

  if (!setWithOwnership) {
    return false;
  }

  const result = await db
    .delete(workoutSets)
    .where(eq(workoutSets.id, setId))
    .run();

  return result.success;
}

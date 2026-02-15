import { eq, and } from 'drizzle-orm';
import { workoutSets, workoutExercises, workouts } from '../db/schema';
import { createDb } from '../db';

type DrizzleDb = ReturnType<typeof createDb>;

export interface SetOwnershipCheckResult {
  isValid: boolean;
  setId?: string;
  error?: string;
}

export async function validateWorkoutExerciseOwnership(
  dbOrTx: DrizzleDb,
  workoutExerciseId: string,
  workosId: string
): Promise<SetOwnershipCheckResult> {
  const db = dbOrTx;

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
    return {
      isValid: false,
      error: 'Workout exercise not found or does not belong to you',
    };
  }

  return {
    isValid: true,
  };
}

export async function validateWorkoutSetOwnership(
  dbOrTx: DrizzleDb,
  localId: string,
  workosId: string
): Promise<SetOwnershipCheckResult> {
  const db = dbOrTx;

  const setWithOwnership = await db
    .select({
      setId: workoutSets.id,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workoutSets.localId, localId),
      eq(workouts.workosId, workosId)
    ))
    .get();

  if (!setWithOwnership) {
    return {
      isValid: false,
      error: 'Workout set not found or does not belong to you',
    };
  }

  return {
    isValid: true,
    setId: setWithOwnership.setId,
  };
}

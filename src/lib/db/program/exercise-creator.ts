import { and, eq } from 'drizzle-orm';
import { exercises } from '../schema';
import { getDb, type DbOrTx } from '../index';

/**
 * Finds an existing exercise or creates a new one for a workout
 * @param dbOrTx - D1 database instance or transaction
 * @param workosId - The user's WorkOS ID
 * @param exerciseName - The name of the exercise
 * @param lift - Optional lift type to determine muscle group
 * @returns The exercise ID (existing or newly created)
 */
export async function getOrCreateExerciseForWorkout(
  dbOrTx: DbOrTx,
  workosId: string,
  exerciseName: string,
  lift: string | undefined
): Promise<string> {
  const db = getDb(dbOrTx);

  const existing = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.workosId, workosId), eq(exercises.name, exerciseName)))
    .get();

  if (existing) {
    return existing.id;
  }

  const muscleGroup = lift === 'squat' || lift === 'deadlift' || lift === 'row'
    ? 'Back'
    : lift === 'bench' || lift === 'ohp'
      ? 'Chest'
      : 'Shoulders';

  const newExercise = await db
    .insert(exercises)
    .values({
      workosId,
      name: exerciseName,
      muscleGroup,
    })
    .returning()
    .get();

  return newExercise.id;
}

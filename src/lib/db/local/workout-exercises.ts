import { localDB, type LocalWorkoutExercise } from '../local-db';
import { generateLocalId, withTransaction } from './utils';
import { queueOperation } from './sync';

/**
 * Adds an exercise to a workout in local storage
 * @param workoutLocalId - The local ID of the workout
 * @param exerciseLocalId - The local ID of the exercise
 * @param order - The position in the exercise order
 * @param notes - Optional notes for the exercise
 * @returns The local ID of the new workout exercise
 */
export async function addExerciseToWorkout(workoutLocalId: string, exerciseLocalId: string, order: number, notes?: string): Promise<string> {
  const localId = generateLocalId();
  const workoutExercise: LocalWorkoutExercise = {
    id: undefined,
    localId,
    workoutId: workoutLocalId,
    exerciseId: exerciseLocalId,
    order,
    notes,
    serverId: undefined,
    syncStatus: 'pending',
    needsSync: true,
  };

  await withTransaction(localDB.workoutExercises, localDB.offlineQueue, async () => {
    await localDB.workoutExercises.add(workoutExercise);
    await queueOperation('create', 'workout_exercise', localId, workoutExercise as unknown as Record<string, unknown>);
  });

  return localId;
}

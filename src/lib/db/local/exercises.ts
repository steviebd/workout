import { localDB, type LocalExercise } from '../local-db';
import { generateLocalId, now, withTransaction } from './utils';
import { queueOperation } from './sync';

/**
 * Creates a new exercise in local storage for offline use
 * @param workosId - The user's WorkOS ID
 * @param data - Exercise data excluding system fields
 * @returns The local ID of the created exercise
 */
export async function createExercise(workosId: string, data: Omit<LocalExercise, 'id' | 'localId' | 'workosId' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'needsSync'>): Promise<string> {
  const localId = generateLocalId();
  const exercise: LocalExercise = {
    ...data,
    id: undefined,
    localId,
    workosId,
    createdAt: now(),
    updatedAt: now(),
    syncStatus: 'pending',
    needsSync: true,
  };

  await withTransaction(localDB.exercises, localDB.offlineQueue, async () => {
    await localDB.exercises.add(exercise);
    await queueOperation('create', 'exercise', localId, exercise as unknown as Record<string, unknown>);
  });

  return localId;
}

/**
 * Updates an exercise in local storage
 * @param localId - The local ID of the exercise
 * @param data - Fields to update
 * @throws Will throw if exercise is not found
 */
export async function updateExercise(localId: string, data: Partial<Omit<LocalExercise, 'id' | 'localId' | 'workosId' | 'createdAt' | 'syncStatus' | 'needsSync'>>): Promise<void> {
  const exercise = await localDB.exercises.where('localId').equals(localId).first();
  if (!exercise) throw new Error('Exercise not found');
  if (exercise.id === undefined) throw new Error('Exercise id not found');
  const id = exercise.id;
  const updated = {
    ...exercise,
    ...data,
    updatedAt: now(),
    syncStatus: 'pending' as const,
    needsSync: true,
  };

  await withTransaction(localDB.exercises, localDB.offlineQueue, async () => {
    await localDB.exercises.update(id, updated);
    await queueOperation('update', 'exercise', localId, updated as unknown as Record<string, unknown>);
  });
}

/**
 * Retrieves all exercises for a user from local storage
 * @param workosId - The user's WorkOS ID
 * @returns Array of local exercises
 */
export async function getExercises(workosId: string): Promise<LocalExercise[]> {
  return localDB.exercises.where('workosId').equals(workosId).toArray();
}

/**
 * Retrieves a single exercise by local ID
 * @param localId - The local ID of the exercise
 * @returns The exercise if found, or undefined
 */
export async function getExercise(localId: string): Promise<LocalExercise | undefined> {
  return localDB.exercises.where('localId').equals(localId).first();
}

/**
 * Deletes an exercise from local storage (marks for sync)
 * @param localId - The local ID of the exercise
 * @throws Will throw if exercise is not found
 */
export async function deleteExercise(localId: string): Promise<void> {
  const exercise = await localDB.exercises.where('localId').equals(localId).first();
  if (!exercise) throw new Error('Exercise not found');
  if (exercise.id === undefined) throw new Error('Exercise id not found');
  const id = exercise.id;

  await withTransaction(localDB.exercises, localDB.offlineQueue, async () => {
    await localDB.exercises.update(id, {
      syncStatus: 'pending',
      needsSync: true,
    });
    await queueOperation('delete', 'exercise', localId, { localId });
  });
}

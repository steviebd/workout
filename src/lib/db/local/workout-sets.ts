import { localDB, type LocalWorkoutSet } from '../local-db';
import { generateLocalId, withTransaction } from './utils';
import { queueOperation } from './sync';

/**
 * Adds a set to a workout exercise in local storage
 * @param workoutExerciseLocalId - The local ID of the workout exercise
 * @param data - Set data excluding system fields
 * @returns The local ID of the new set
 */
export async function addSetToWorkoutExercise(workoutExerciseLocalId: string, data: Omit<LocalWorkoutSet, 'id' | 'localId' | 'workoutExerciseId' | 'syncStatus' | 'needsSync'>): Promise<string> {
  const localId = generateLocalId();
  const workoutSet: LocalWorkoutSet = {
    ...data,
    id: undefined,
    localId,
    workoutExerciseId: workoutExerciseLocalId,
    syncStatus: 'pending',
    needsSync: true,
  };

  await withTransaction(localDB.workoutSets, localDB.offlineQueue, async () => {
    await localDB.workoutSets.add(workoutSet);
    await queueOperation('create', 'workout_set', localId, workoutSet as unknown as Record<string, unknown>);
  });

  return localId;
}

/**
 * Updates a set in local storage
 * @param localId - The local ID of the set
 * @param data - Fields to update
 * @throws Will throw if set is not found
 */
export async function updateSet(localId: string, data: Partial<Omit<LocalWorkoutSet, 'id' | 'localId' | 'workoutExerciseId' | 'syncStatus' | 'needsSync'>>): Promise<void> {
  const set = await localDB.workoutSets.where('localId').equals(localId).first();
  if (!set) throw new Error('Set not found');
  if (set.id === undefined) throw new Error('Set id not found');
  const id = set.id;
  const updated = {
    ...set,
    ...data,
    syncStatus: 'pending' as const,
    needsSync: true,
  };

  await withTransaction(localDB.workoutSets, localDB.offlineQueue, async () => {
    await localDB.workoutSets.update(id, updated);
    await queueOperation('update', 'workout_set', localId, updated as unknown as Record<string, unknown>);
  });
}

/**
 * Deletes a set from local storage (marks for sync)
 * @param localId - The local ID of the set
 * @throws Will throw if set is not found
 */
export async function deleteSet(localId: string): Promise<void> {
  const set = await localDB.workoutSets.where('localId').equals(localId).first();
  if (!set) throw new Error('Set not found');
  if (set.id === undefined) throw new Error('Set id not found');
  const id = set.id;

  await withTransaction(localDB.workoutSets, localDB.offlineQueue, async () => {
    await localDB.workoutSets.update(id, {
      syncStatus: 'pending',
      needsSync: true,
    });
    await queueOperation('delete', 'workout_set', localId, { localId });
  });
}

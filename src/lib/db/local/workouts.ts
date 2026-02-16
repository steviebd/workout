import { localDB, type LocalWorkout } from '../local-db';
import { generateLocalId, now, withTransaction } from './utils';
import { queueOperation } from './sync';

/**
 * Creates a new workout in local storage for offline use
 * @param workosId - The user's WorkOS ID
 * @param data - Workout data excluding system fields
 * @returns The local ID of the created workout
 */
export async function createWorkout(workosId: string, data: Omit<LocalWorkout, 'id' | 'localId' | 'workosId' | 'startedAt' | 'syncStatus' | 'needsSync'>): Promise<string> {
  const localId = generateLocalId();
  const workout: LocalWorkout = {
    ...data,
    id: undefined,
    localId,
    workosId,
    startedAt: now(),
    syncStatus: 'pending',
    needsSync: true,
  };

  await withTransaction(localDB.workouts, localDB.offlineQueue, async () => {
    await localDB.workouts.add(workout);
    await queueOperation('create', 'workout', localId, workout as unknown as Record<string, unknown>);
  });

  return localId;
}

/**
 * Updates a workout in local storage
 * @param localId - The local ID of the workout
 * @param data - Fields to update
 * @throws Will throw if workout is not found
 */
export async function updateWorkout(localId: string, data: Partial<Omit<LocalWorkout, 'id' | 'localId' | 'workosId' | 'startedAt' | 'syncStatus' | 'needsSync'>>): Promise<void> {
  const workout = await localDB.workouts.where('localId').equals(localId).first();
  if (!workout) throw new Error('Workout not found');
  if (workout.id === undefined) throw new Error('Workout id not found');
  const id = workout.id;
  const updated = {
    ...workout,
    ...data,
    syncStatus: 'pending' as const,
    needsSync: true,
  };

  await withTransaction(localDB.workouts, localDB.offlineQueue, async () => {
    await localDB.workouts.update(id, updated);
    await queueOperation('update', 'workout', localId, updated as unknown as Record<string, unknown>);
  });
}

/**
 * Marks a workout as completed in local storage
 * @param localId - The local ID of the workout
 * @throws Will throw if workout is not found
 */
export async function completeWorkout(localId: string): Promise<void> {
  const workout = await localDB.workouts.where('localId').equals(localId).first();
  if (!workout) throw new Error('Workout not found');
  if (workout.id === undefined) throw new Error('Workout id not found');
  const id = workout.id;
  const updated = {
    ...workout,
    completedAt: now(),
    status: 'completed' as const,
    syncStatus: 'pending' as const,
    needsSync: true,
  };

  await withTransaction(localDB.workouts, localDB.offlineQueue, async () => {
    await localDB.workouts.update(id, updated);
    await queueOperation('update', 'workout', localId, updated as unknown as Record<string, unknown>);
  });
}

/**
 * Retrieves all workouts for a user from local storage
 * @param workosId - The user's WorkOS ID
 * @returns Array of local workouts
 */
export async function getWorkouts(workosId: string): Promise<LocalWorkout[]> {
  return localDB.workouts.where('workosId').equals(workosId).toArray();
}

/**
 * Retrieves a single workout by local ID
 * @param localId - The local ID of the workout
 * @returns The workout if found, or undefined
 */
export async function getWorkout(localId: string): Promise<LocalWorkout | undefined> {
  return localDB.workouts.where('localId').equals(localId).first();
}

/**
 * Retrieves the currently in-progress workout for a user
 * @param workosId - The user's WorkOS ID
 * @returns The in-progress workout if found, or undefined
 */
export async function getActiveWorkout(workosId: string): Promise<LocalWorkout | undefined> {
  return localDB.workouts.where({ workosId, status: 'in_progress' }).first();
}

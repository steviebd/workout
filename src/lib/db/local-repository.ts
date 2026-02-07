import { localDB, type LocalExercise, type LocalTemplate, type LocalWorkout, type LocalWorkoutExercise, type LocalWorkoutSet, type OfflineOperation } from './local-db';

/**
 * Generates a new local UUID for offline identifiers
 * @returns A new random UUID string
 */
export function generateLocalId(): string {
  return crypto.randomUUID();
}

/**
 * Returns the current timestamp
 * @returns Current date and time
 */
export function now(): Date {
  return new Date();
}

async function withTransaction<T>(t1: Parameters<typeof localDB.transaction>[1], t2: Parameters<typeof localDB.transaction>[2], callback: () => Promise<T>): Promise<T>;
async function withTransaction<T>(
  t1: Parameters<typeof localDB.transaction>[1],
  t2: Parameters<typeof localDB.transaction>[2],
  callback: () => Promise<T>
): Promise<T> {
  if (typeof localDB.transaction === 'function') {
    return localDB.transaction('rw', t1, t2, callback);
  }
  return callback();
}

/**
 * Queues an operation for offline sync
 * @param type - The operation type (create, update, delete)
 * @param entity - The entity type being operated on
 * @param localId - The local identifier of the entity
 * @param data - The operation data
 */
export async function queueOperation(type: 'create' | 'update' | 'delete', entity: 'exercise' | 'template' | 'workout' | 'workout_exercise' | 'workout_set', localId: string, data: Record<string, unknown>): Promise<void> {
  const existing = await localDB.offlineQueue
    .where({ entity, localId })
    .first();

  if (type === 'delete') {
    if (existing?.id) {
      await localDB.offlineQueue.delete(existing.id);
    }
    await localDB.offlineQueue.add({
      operationId: generateLocalId(),
      type,
      entity,
      localId,
      data,
      timestamp: now(),
      retryCount: 0,
      maxRetries: 3,
    });
  } else if (type === 'update' && existing) {
    if (existing.id) {
      await localDB.offlineQueue.update(existing.id, {
        data: { ...existing.data, ...data },
        timestamp: now(),
      });
    }
  } else if (type === 'create' && existing?.type === 'create') {
    if (existing.id) {
      await localDB.offlineQueue.update(existing.id, {
        data: { ...existing.data, ...data },
        timestamp: now(),
      });
    }
  } else {
    await localDB.offlineQueue.add({
      operationId: generateLocalId(),
      type,
      entity,
      localId,
      data,
      timestamp: now(),
      retryCount: 0,
      maxRetries: 3,
    });
  }
}

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

/**
 * Creates a new template in local storage for offline use
 * @param workosId - The user's WorkOS ID
 * @param data - Template data excluding system fields
 * @returns The local ID of the created template
 */
export async function createTemplate(workosId: string, data: Omit<LocalTemplate, 'id' | 'localId' | 'workosId' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'needsSync'>): Promise<string> {
  const localId = generateLocalId();
  const template: LocalTemplate = {
    ...data,
    id: undefined,
    localId,
    workosId,
    createdAt: now(),
    updatedAt: now(),
    syncStatus: 'pending',
    needsSync: true,
  };

  await withTransaction(localDB.templates, localDB.offlineQueue, async () => {
    await localDB.templates.add(template);
    await queueOperation('create', 'template', localId, template as unknown as Record<string, unknown>);
  });

  return localId;
}

/**
 * Updates a template in local storage
 * @param localId - The local ID of the template
 * @param data - Fields to update
 * @throws Will throw if template is not found
 */
export async function updateTemplate(localId: string, data: Partial<Omit<LocalTemplate, 'id' | 'localId' | 'workosId' | 'createdAt' | 'syncStatus' | 'needsSync'>>): Promise<void> {
  const template = await localDB.templates.where('localId').equals(localId).first();
  if (!template) throw new Error('Template not found');
  if (template.id === undefined) throw new Error('Template id not found');
  const id = template.id;
  const updated = {
    ...template,
    ...data,
    updatedAt: now(),
    syncStatus: 'pending' as const,
    needsSync: true,
  };

  await withTransaction(localDB.templates, localDB.offlineQueue, async () => {
    await localDB.templates.update(id, updated);
    await queueOperation('update', 'template', localId, updated as unknown as Record<string, unknown>);
  });
}

/**
 * Retrieves all templates for a user from local storage
 * @param workosId - The user's WorkOS ID
 * @returns Array of local templates
 */
export async function getTemplates(workosId: string): Promise<LocalTemplate[]> {
  return localDB.templates.where('workosId').equals(workosId).toArray();
}

/**
 * Retrieves a single template by local ID
 * @param localId - The local ID of the template
 * @returns The template if found, or undefined
 */
export async function getTemplate(localId: string): Promise<LocalTemplate | undefined> {
  return localDB.templates.where('localId').equals(localId).first();
}

/**
 * Deletes a template from local storage (marks for sync)
 * @param localId - The local ID of the template
 * @throws Will throw if template is not found
 */
export async function deleteTemplate(localId: string): Promise<void> {
  const template = await localDB.templates.where('localId').equals(localId).first();
  if (!template) throw new Error('Template not found');
  if (template.id === undefined) throw new Error('Template id not found');
  const id = template.id;

  await withTransaction(localDB.templates, localDB.offlineQueue, async () => {
    await localDB.templates.update(id, {
      syncStatus: 'pending',
      needsSync: true,
    });
    await queueOperation('delete', 'template', localId, { localId });
  });
}

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

/**
 * Queues an operation for offline sync (alias function)
 * @param type - The operation type (create, update, delete)
 * @param entity - The entity type being operated on
 * @param localId - The local identifier of the entity
 * @param data - The operation data
 */
export async function queueOperationOp(type: 'create' | 'update' | 'delete', entity: 'exercise' | 'template' | 'workout' | 'workout_exercise' | 'workout_set', localId: string, data: Record<string, unknown>): Promise<void> {
  await queueOperation(type, entity, localId, data);
}

/**
 * Retrieves all pending sync operations
 * @returns Array of offline operations waiting to sync
 */
export async function getPendingOperations(): Promise<OfflineOperation[]> {
  return localDB.offlineQueue.orderBy('timestamp').toArray();
}

/**
 * Removes a sync operation from the queue
 * @param id - The operation ID to remove
 */
export async function removeOperation(id: number): Promise<void> {
  await localDB.offlineQueue.delete(id);
}

/**
 * Increments the retry count for a sync operation
 * @param id - The operation ID
 */
export async function incrementRetry(id: number): Promise<void> {
  const op = await localDB.offlineQueue.get(id);
  if (op) {
    await localDB.offlineQueue.update(id, { retryCount: op.retryCount + 1 });
  }
}

/**
 * Retrieves the last sync timestamp for a given key
 * @param key - The sync metadata key
 * @returns The timestamp value if found, or null
 */
export async function getLastSyncTime(key: string): Promise<string | null> {
  const metadata = await localDB.syncMetadata.where('key').equals(key).first();
  return metadata?.value ?? null;
}

/**
 * Sets the last sync timestamp for a given key
 * @param key - The sync metadata key
 * @param value - The timestamp value to store
 */
export async function setLastSyncTime(key: string, value: string): Promise<void> {
  await localDB.syncMetadata.put({ key, value, updatedAt: now() });
}

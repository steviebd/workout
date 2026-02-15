import { localDB, type OfflineOperation } from '../local-db';
import { generateLocalId, now } from './utils';

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

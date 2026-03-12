import DexieLib from 'dexie';
import { localDB, getLocalDB, type OfflineOperation } from '../db/local-db';
import { getPendingOperations, removeOperation, incrementRetry, setLastSyncTime, getLastSyncTime } from '../db/local-repository';
import { createEntityItem } from './entity-mappers';
import { createUpdateFields } from './field-mappers';
import type { SyncResult, ServerEntity, ServerSyncResponse, LocalEntity, TableType, CreateEntityResponse } from './types';

async function resolveWorkoutExerciseIds(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const resolved = { ...data };

  if (data.workoutId) {
    const workout = await localDB.workouts.where('localId').equals(data.workoutId as string).first();
    if (workout?.serverId) {
      resolved.workoutId = workout.serverId;
    }
  }
  if (data.exerciseId) {
    const exercise = await localDB.exercises.where('localId').equals(data.exerciseId as string).first();
    if (exercise?.serverId) {
      resolved.exerciseId = exercise.serverId;
    }
  }

  return resolved;
}

async function resolveWorkoutSetIds(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const resolved = { ...data };

  if (data.workoutExerciseId) {
    const workoutExercise = await localDB.workoutExercises.where('localId').equals(data.workoutExerciseId as string).first();
    if (workoutExercise?.serverId) {
      resolved.workoutExerciseId = workoutExercise.serverId;
    }
  }

  return resolved;
}

function getEntityApiUrl(entity: string): string {
  const urlMap: Record<string, string> = {
    exercise: '/api/exercises',
    template: '/api/templates',
    workout: '/api/workouts',
    workout_exercise: '/api/workout-exercises',
    workout_set: '/api/workout-sets',
  };
  return urlMap[entity] ?? '';
}

function getEntityHttpMethod(operationType: string): 'POST' | 'PUT' | 'DELETE' {
  if (operationType === 'update') return 'PUT';
  if (operationType === 'delete') return 'DELETE';
  return 'POST';
}

async function updateEntityByLocalId(
  tableName: TableType,
  localId: string,
  fields: Record<string, unknown>
): Promise<void> {
  const table = localDB[tableName];
  const item = await table.where('localId').equals(localId).first();
  if (item?.id !== undefined) {
    // Dexie update expects a partial entity type, but createUpdateFields returns Record<string, unknown>
    // The fields are validated by createUpdateFields to match the table schema at runtime
    // Using any cast is required due to dynamic table access by string name
    // This is inherent to the offline sync pattern with dynamic Dexie table access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await table.update(item.id, fields as any);
  }
}

async function deleteEntityByLocalId(tableName: TableType, localId: string): Promise<void> {
  const table = localDB[tableName];
  const item = await table.where('localId').equals(localId).first();
  if (item?.id !== undefined) {
    await table.delete(item.id);
  }
}

function getTableNameFromEntity(entity: string): TableType | null {
  const tableMap: Record<string, TableType> = {
    exercise: 'exercises',
    template: 'templates',
    workout: 'workouts',
    workout_exercise: 'workoutExercises',
    workout_set: 'workoutSets',
  };
  return tableMap[entity] ?? null;
}

function getUpdatedAtTimestamp(item: LocalEntity): number {
  if ('updatedAt' in item && item.updatedAt instanceof Date) {
    return item.updatedAt.getTime();
  }
  if ('startedAt' in item && item.startedAt instanceof Date) {
    return item.startedAt.getTime();
  }
  return 0;
}

async function resolveEntityServerIds(entity: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  switch (entity) {
    case 'workout_exercise':
      return resolveWorkoutExerciseIds(data);
    case 'workout_set':
      return resolveWorkoutSetIds(data);
    default:
      return { ...data };
  }
}

class SyncEngine {
  private syncInProgress: Promise<SyncResult> | null = null;

  private readonly entityPriority: Record<string, number> = {
    exercise: 0,
    template: 1,
    workout: 2,
    workout_exercise: 3,
    workout_set: 4,
  };

  async sync(workosId: string): Promise<SyncResult> {
    if (this.syncInProgress) {
      return this.syncInProgress;
    }

    this.syncInProgress = this.performSync(workosId);
    const result = await this.syncInProgress;
    this.syncInProgress = null;
    return result;
  }

  private async performSync(workosId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      pushed: 0,
      pulled: 0,
      errors: 0,
    };

    try {
      await this.pushPendingOperations(workosId, result);
      await this.pullUpdates(result);
      await setLastSyncTime('lastFullSync', new Date().toISOString());
    } catch (error) {
      console.error('Sync error:', error);
      result.success = false;
      result.errors++;
    }

    return result;
  }

  private async pushPendingOperations(_workosId: string, result: SyncResult): Promise<void> {
    const operations = await getPendingOperations();

    operations.sort((a, b) => {
      const priorityA = this.entityPriority[a.entity] ?? 99;
      const priorityB = this.entityPriority[b.entity] ?? 99;
      return priorityA - priorityB;
    });

    for (const op of operations) {
      if (op.id === undefined) {
        result.errors++;
        continue;
      }

      const isLastRetry = op.retryCount >= op.maxRetries;

      try {
        const success = await this.executeOperation(op);
        if (success) {
          await removeOperation(op.id);
          result.pushed++;
        } else {
          await incrementRetry(op.id);
          if (isLastRetry) {
            result.errors++;
          }
        }
      } catch (error) {
        console.error(`Failed to execute operation ${op.operationId}:`, error);
        await incrementRetry(op.id);
        if (isLastRetry) {
          result.errors++;
        }
      }
    }
  }

  async executeOperation(op: OfflineOperation): Promise<boolean> {
    const url = getEntityApiUrl(op.entity);
    if (!url) return false;

    const method = getEntityHttpMethod(op.type);

    const resolvedData = await resolveEntityServerIds(op.entity, op.data);
    const requestBody = {
      ...resolvedData,
      localId: op.localId,
    };

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include',
      });

      if (!response.ok) {
        console.error(`Operation failed with status: ${response.status}`);
        return false;
      }

      if (op.type === 'create') {
        const responseData = (await response.json()) as CreateEntityResponse;
        if (responseData.id) {
          await this.storeServerId(op.entity, op.localId, responseData.id, responseData.updatedAt ?? '');
        }
      } else if (op.type === 'update') {
        await this.markEntitySynced(op.entity, op.localId);
      } else if (op.type === 'delete') {
        await this.removeLocalEntity(op.entity, op.localId);
      }

      return true;
    } catch (error) {
      console.error(`Network error executing operation:`, error);
      return false;
    }
  }

  async storeServerId(
    entity: 'exercise' | 'template' | 'workout' | 'workout_exercise' | 'workout_set',
    localId: string,
    serverId: string,
    serverUpdatedAt: string
  ): Promise<void> {
    const tableName = getTableNameFromEntity(entity);
    if (!tableName) return;

    await updateEntityByLocalId(tableName, localId, {
      serverId,
      serverUpdatedAt: new Date(serverUpdatedAt),
      syncStatus: 'synced' as const,
      needsSync: false,
    });
  }

  private async markEntitySynced(entity: string, localId: string): Promise<void> {
    const tableName = getTableNameFromEntity(entity);
    if (!tableName) return;

    await updateEntityByLocalId(tableName, localId, {
      syncStatus: 'synced' as const,
      needsSync: false,
    });
  }

  private async removeLocalEntity(entity: string, localId: string): Promise<void> {
    const tableName = getTableNameFromEntity(entity);
    if (!tableName) return;

    await deleteEntityByLocalId(tableName, localId);
  }

  private getTable<T extends LocalEntity>(tableName: TableType): DexieLib.Table<T> {
    const tables: Record<TableType, DexieLib.Table<LocalEntity>> = {
      exercises: localDB.exercises,
      templates: localDB.templates,
      workouts: localDB.workouts,
      workoutExercises: localDB.workoutExercises,
      workoutSets: localDB.workoutSets,
    };
    return tables[tableName] as DexieLib.Table<T>;
  }

  private async pullUpdates(result: SyncResult): Promise<void> {
    try {
      const lastSync = await getLastSyncTime('lastFullSync');
      const url = lastSync ? `/api/sync?since=${encodeURIComponent(lastSync)}` : '/api/sync';

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        console.error(`Pull updates failed with status: ${response.status}`);
        return;
      }

      const data: ServerSyncResponse = await response.json();

      await this.applyServerChanges(data);
      result.pulled = 
        (data.exercises?.length ?? 0) + 
        (data.templates?.length ?? 0) + 
        (data.workouts?.length ?? 0) + 
        (data.workoutExercises?.length ?? 0) + 
        (data.workoutSets?.length ?? 0);

      if (data.lastSync) {
        await setLastSyncTime('lastFullSync', data.lastSync);
      }
    } catch (error) {
      // Pull failures are non-blocking; next sync will retry
      console.error('Error pulling updates:', error);
    }
  }

  private async applyServerChanges(data: ServerSyncResponse): Promise<void> {
    const allData: Array<{ table: TableType; items: ServerEntity[] }> = [
      { table: 'exercises', items: data.exercises ?? [] },
      { table: 'templates', items: data.templates ?? [] },
      { table: 'workouts', items: data.workouts ?? [] },
      { table: 'workoutExercises', items: data.workoutExercises ?? [] },
      { table: 'workoutSets', items: data.workoutSets ?? [] },
    ];

    for (const { table, items } of allData) {
      if (items.length === 0) continue;

      const tableInstance = this.getTable(table);
      const localIds = items.map((item) => item.localId ?? item.id);
      const existingItems = await tableInstance.where('localId').anyOf(localIds).toArray();
      const existingByLocalId = new Map(existingItems.map((item) => [item.localId, item]));

      const toAdd: unknown[] = [];
      const toUpdate: Array<{ id: number; fields: Record<string, unknown> }> = [];
      const toDelete: number[] = [];

      for (const serverData of items) {
        const searchId = serverData.localId ?? serverData.id;
        const localItem = existingByLocalId.get(searchId);

        if (serverData.isDeleted === true) {
          if (localItem?.id !== undefined) {
            toDelete.push(localItem.id);
          }
          continue;
        }

        if (!localItem) {
          const newItem = createEntityItem(table, serverData, searchId);
          if (newItem) {
            toAdd.push(newItem);
          }
          continue;
        }

        const serverUpdatedAt = new Date(serverData.updatedAt).getTime();
        const localUpdatedAt = getUpdatedAtTimestamp(localItem);

        if (serverUpdatedAt > localUpdatedAt && localItem.id !== undefined) {
          const updateFields = createUpdateFields(table, serverData);
          if (Object.keys(updateFields).length > 0) {
            toUpdate.push({ id: localItem.id, fields: updateFields });
          }
        }
      }

      await getLocalDB().transaction('rw', tableInstance, async () => {
        if (toDelete.length > 0) {
          await tableInstance.bulkDelete(toDelete);
        }
        if (toAdd.length > 0) {
          // bulkAdd expects the table's specific item type, but we're adding dynamically created items
          // The items are validated by createEntityItem before being added to toAdd
          await tableInstance.bulkAdd(toAdd as LocalEntity[]);
        }
        for (const { id, fields } of toUpdate) {
          await tableInstance.update(id, fields);
        }
      });
    }
  }

  async mergeEntity(
    tableName: TableType,
    serverData: ServerEntity
  ): Promise<void> {
    const table = this.getTable(tableName);

    if (serverData.isDeleted === true) {
      const searchId = serverData.localId ?? serverData.id;
      const item = await table.where('localId').equals(searchId).first();
      if (item?.id !== undefined) {
        await table.delete(item.id);
      }
      return;
    }

    const searchId = serverData.localId ?? serverData.id;
    const localItem = await table
      .where('localId')
      .equals(searchId)
      .first();

    if (!localItem) {
      const newItem = createEntityItem(tableName, serverData, searchId);
      if (newItem) {
        // add() expects the table's specific item type, but createEntityItem returns a dynamic type
        // The item structure is validated by createEntityItem to match the expected table schema
        await table.add(newItem as LocalEntity);
      }
      return;
    }

    const serverUpdatedAt = new Date(serverData.updatedAt).getTime();
    const localUpdatedAt = getUpdatedAtTimestamp(localItem);

    if (serverUpdatedAt > localUpdatedAt && localItem.id !== undefined) {
      const updateFields = createUpdateFields(tableName, serverData);
      if (Object.keys(updateFields).length > 0) {
        await table.update(localItem.id, updateFields);
      }
    }
  }

  async getPendingCount(): Promise<number> {
    const operations = await localDB.offlineQueue.toArray();
    return operations.length;
  }

  getIsSyncing(): boolean {
    return this.syncInProgress !== null;
  }

  async mergeLocalAndServer(tableName: TableType, serverData: ServerEntity): Promise<void> {
    return this.mergeEntity(tableName, serverData);
  }
}

export const syncEngine = new SyncEngine();

export type { TableType, LocalEntity, ServerEntity, ServerSyncResponse, SyncResult };

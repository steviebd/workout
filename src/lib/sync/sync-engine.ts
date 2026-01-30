import { localDB, type OfflineOperation } from '../db/local-db';
import { getPendingOperations, removeOperation, incrementRetry, setLastSyncTime, getLastSyncTime } from '../db/local-repository';

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  errors: number;
}

export interface ServerEntity {
  id: string;
  localId?: string;
  updatedAt: string;
}

export interface ServerSyncResponse {
  exercises: ServerEntity[];
  templates: ServerEntity[];
  workouts: ServerEntity[];
  lastSync: string;
}

type TableType = 'exercises' | 'templates' | 'workouts';

class SyncEngine {
  private syncInProgress: Promise<SyncResult> | null = null;

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

    for (const op of operations) {
      if (op.id === undefined) {
        result.errors++;
        continue;
      }
      try {
        const success = await this.executeOperation(op);
        if (success) {
          await removeOperation(op.id);
          result.pushed++;
        } else {
          await incrementRetry(op.id);
          if (op.retryCount >= op.maxRetries) {
            result.errors++;
          }
        }
      } catch (error) {
        console.error(`Failed to execute operation ${op.operationId}:`, error);
        await incrementRetry(op.id);
        result.errors++;
      }
    }
  }

  async executeOperation(op: OfflineOperation): Promise<boolean> {
    let url = '';
    let method: 'POST' | 'PUT' | 'DELETE' = 'POST';

    switch (op.entity) {
      case 'exercise':
        url = '/api/exercises';
        break;
      case 'template':
        url = '/api/templates';
        break;
      case 'workout':
        url = '/api/workouts';
        break;
      case 'workout_exercise':
        url = `/api/workouts/${op.data.workoutId}/exercises`;
        break;
      case 'workout_set':
        url = `/api/workouts/sets/${op.data.setId}`;
        break;
      default:
        return false;
    }

    if (op.type === 'update') {
      method = 'PUT';
    } else if (op.type === 'delete') {
      method = 'DELETE';
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(op.data),
        credentials: 'include',
      });

      if (!response.ok) {
        console.error(`Operation failed with status: ${response.status}`);
        return false;
      }

      if (op.type === 'create') {
        const responseData = await response.json() as { id: string; updatedAt: string };
        if (responseData.id) {
          await this.storeServerId(op.entity, op.localId, responseData.id, responseData.updatedAt);
        }
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
    const tableName = this.getTableName(entity);
    if (!tableName) return;

    const table = this.getTable(tableName);

    const item = await table.where('localId').equals(localId).first();
    if (item?.id !== undefined) {
      await table.update(item.id, {
        serverId,
        serverUpdatedAt: new Date(serverUpdatedAt),
        syncStatus: 'synced' as const,
        needsSync: false,
      });
    }
  }

  private getTableName(entity: string): TableType | null {
    const tableMap: Record<string, TableType> = {
      exercise: 'exercises',
      template: 'templates',
      workout: 'workouts',
    };
    return tableMap[entity] ?? null;
  }

  private getTable(tableName: TableType) {
    const tables: Record<TableType, typeof localDB.exercises | typeof localDB.templates | typeof localDB.workouts> = {
      exercises: localDB.exercises,
      templates: localDB.templates,
      workouts: localDB.workouts,
    };
    return tables[tableName];
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
      result.pulled = data.exercises.length + data.templates.length + data.workouts.length;

      if (data.lastSync) {
        await setLastSyncTime('lastFullSync', data.lastSync);
      }
    } catch (error) {
      console.error('Error pulling updates:', error);
    }
  }

  private async applyServerChanges(data: ServerSyncResponse): Promise<void> {
    for (const exercise of data.exercises) {
      await this.mergeEntity('exercises', exercise);
    }

    for (const template of data.templates) {
      await this.mergeEntity('templates', template);
    }

    for (const workout of data.workouts) {
      await this.mergeEntity('workouts', workout);
    }
  }

  async mergeEntity(
    tableName: TableType,
    serverData: ServerEntity
  ): Promise<void> {
    const table = this.getTable(tableName);

    const searchId = serverData.localId ?? serverData.id;
    const localItem = await table
      .where('localId')
      .equals(searchId)
      .first();

    if (!localItem) {
      return;
    }

    const serverUpdatedAt = new Date(serverData.updatedAt).getTime();

    let localUpdatedAt: number;
    if ('updatedAt' in localItem && localItem.updatedAt instanceof Date) {
      localUpdatedAt = localItem.updatedAt.getTime();
    } else if ('startedAt' in localItem && localItem.startedAt instanceof Date) {
      localUpdatedAt = localItem.startedAt.getTime();
    } else {
      localUpdatedAt = 0;
    }

    if (serverUpdatedAt > localUpdatedAt && localItem.id !== undefined) {
      await table.update(localItem.id, {
        serverUpdatedAt: new Date(serverData.updatedAt),
        syncStatus: 'synced' as const,
        needsSync: false,
      });
    }
  }

  async getPendingCount(): Promise<number> {
    const operations = await localDB.offlineQueue.toArray();
    return operations.length;
  }

  getIsSyncing(): boolean {
    return this.syncInProgress !== null;
  }
}

export const syncEngine = new SyncEngine();

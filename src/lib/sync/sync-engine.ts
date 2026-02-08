import DexieLib from 'dexie';
import { localDB, type OfflineOperation, type LocalExercise, type LocalTemplate, type LocalWorkout, type LocalWorkoutExercise, type LocalWorkoutSet } from '../db/local-db';
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
  isDeleted?: boolean;
  [key: string]: unknown;
}

export interface ServerSyncResponse {
  exercises: ServerEntity[];
  templates: ServerEntity[];
  workouts: ServerEntity[];
  workoutExercises: ServerEntity[];
  workoutSets: ServerEntity[];
  templateExercises: ServerEntity[];
  lastSync: string;
}

interface LocalEntity {
  id?: number;
  localId: string;
  serverId?: string;
  serverUpdatedAt?: Date;
  syncStatus: 'synced' | 'pending' | 'failed';
  needsSync: boolean;
}

type TableType = 'exercises' | 'templates' | 'workouts' | 'workoutExercises' | 'workoutSets';

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
        url = '/api/workout-exercises';
        break;
      case 'workout_set':
        url = '/api/workout-sets';
        break;
      default:
        return false;
    }

    if (op.type === 'update') {
      method = 'PUT';
    } else if (op.type === 'delete') {
      method = 'DELETE';
    }

    const resolvedData = await this.resolveServerIds(op.entity, op.data);
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
        const responseData = await response.json() as { id: string; updatedAt?: string };
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

  private async markEntitySynced(entity: string, localId: string): Promise<void> {
    const tableName = this.getTableName(entity);
    if (!tableName) return;

    const table = this.getTable(tableName);
    const item = await table.where('localId').equals(localId).first();

    if (item?.id !== undefined) {
      await table.update(item.id, {
        syncStatus: 'synced' as const,
        needsSync: false,
      });
    }
  }

  private async removeLocalEntity(entity: string, localId: string): Promise<void> {
    const tableName = this.getTableName(entity);
    if (!tableName) return;

    const table = this.getTable(tableName);
    const item = await table.where('localId').equals(localId).first();

    if (item?.id !== undefined) {
      await table.delete(item.id);
    }
  }

  private getTableName(entity: string): TableType | null {
    const tableMap: Record<string, TableType> = {
      exercise: 'exercises',
      template: 'templates',
      workout: 'workouts',
      workout_exercise: 'workoutExercises',
      workout_set: 'workoutSets',
    };
    return tableMap[entity] ?? null;
  }

  private getTable<T extends LocalEntity>(tableName: TableType): DexieLib.Table<T> {
    const tables: Record<TableType, DexieLib.Table<LocalEntity>> = {
      exercises: localDB.exercises as unknown as DexieLib.Table<LocalEntity>,
      templates: localDB.templates as unknown as DexieLib.Table<LocalEntity>,
      workouts: localDB.workouts as unknown as DexieLib.Table<LocalEntity>,
      workoutExercises: localDB.workoutExercises as unknown as DexieLib.Table<LocalEntity>,
      workoutSets: localDB.workoutSets as unknown as DexieLib.Table<LocalEntity>,
    };
    return tables[tableName] as unknown as DexieLib.Table<T>;
  }

  private async resolveServerIds(entity: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const resolved = { ...data };

    if (entity === 'workout_exercise') {
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
    } else if (entity === 'workout_set') {
      if (data.workoutExerciseId) {
        const workoutExercise = await localDB.workoutExercises.where('localId').equals(data.workoutExerciseId as string).first();
        if (workoutExercise?.serverId) {
          resolved.workoutExerciseId = workoutExercise.serverId;
        }
      }
    }

    return resolved;
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
      console.error('Error pulling updates:', error);
    }
  }

  private async applyServerChanges(data: ServerSyncResponse): Promise<void> {
    const allData = [
      { table: 'exercises' as TableType, items: data.exercises ?? [] },
      { table: 'templates' as TableType, items: data.templates ?? [] },
      { table: 'workouts' as TableType, items: data.workouts ?? [] },
      { table: 'workoutExercises' as TableType, items: data.workoutExercises ?? [] },
      { table: 'workoutSets' as TableType, items: data.workoutSets ?? [] },
    ];

    for (const { table, items } of allData) {
      for (const serverData of items) {
        await this.mergeLocalAndServer(table, serverData);
      }
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
      const newItem = this.createEntityItem(tableName, serverData, searchId);
      if (newItem) {
        await table.add(newItem as never);
      }
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
      const updateFields = this.createUpdateFields(tableName, serverData);
      if (Object.keys(updateFields).length > 0) {
        await table.update(localItem.id, updateFields);
      }
    }
  }

  private createEntityItem(
    tableName: TableType,
    serverData: ServerEntity,
    searchId: string
  ): LocalExercise | LocalTemplate | LocalWorkout | LocalWorkoutExercise | LocalWorkoutSet | null {
    const baseItem = {
      serverId: serverData.id,
      localId: searchId,
      serverUpdatedAt: new Date(serverData.updatedAt),
      syncStatus: 'synced' as const,
      needsSync: false,
    };

    switch (tableName) {
      case 'exercises':
        return {
          ...baseItem,
          workosId: (serverData.workosId as string) ?? '',
          name: (serverData.name as string) ?? '',
          muscleGroup: (serverData.muscleGroup as string) ?? '',
          description: serverData.description as string | undefined,
          createdAt: serverData.createdAt ? new Date(serverData.createdAt as string) : new Date(),
          updatedAt: serverData.updatedAt ? new Date(serverData.updatedAt) : new Date(),
        } as LocalExercise;
      case 'templates':
        return {
          ...baseItem,
          workosId: (serverData.workosId as string) ?? '',
          name: (serverData.name as string) ?? '',
          description: serverData.description as string | undefined,
          notes: serverData.notes as string | undefined,
          exercises: [],
          createdAt: serverData.createdAt ? new Date(serverData.createdAt as string) : new Date(),
          updatedAt: serverData.updatedAt ? new Date(serverData.updatedAt) : new Date(),
        } as LocalTemplate;
      case 'workouts':
        return {
          ...baseItem,
          workosId: (serverData.workosId as string) ?? '',
          name: (serverData.name as string) ?? '',
          templateId: serverData.templateId as string | undefined,
          startedAt: serverData.startedAt ? new Date(serverData.startedAt as string) : new Date(),
          completedAt: serverData.completedAt ? new Date(serverData.completedAt as string) : undefined,
          notes: serverData.notes as string | undefined,
          status: 'completed' as const,
        } as LocalWorkout;
      case 'workoutExercises':
        return {
          ...baseItem,
          workoutId: (serverData.workoutId as string) ?? '',
          exerciseId: (serverData.exerciseId as string) ?? '',
          order: (serverData.orderIndex as number) ?? 0,
          notes: serverData.notes as string | undefined,
        } as LocalWorkoutExercise;
      case 'workoutSets':
        return {
          ...baseItem,
          workoutExerciseId: (serverData.workoutExerciseId as string) ?? '',
          order: (serverData.setNumber as number) ?? 0,
          setNumber: (serverData.setNumber as number) ?? 0,
          weight: (serverData.weight as number) ?? 0,
          reps: (serverData.reps as number) ?? 0,
          rpe: serverData.rpe as number | undefined,
          completed: (serverData.isComplete as boolean) ?? false,
        } as LocalWorkoutSet;
      default:
        return null;
    }
  }

  private createUpdateFields(tableName: TableType, serverData: ServerEntity): Record<string, unknown> {
    const updateFields: Record<string, unknown> = {
      serverUpdatedAt: new Date(serverData.updatedAt),
      syncStatus: 'synced' as const,
      needsSync: false,
    };

    switch (tableName) {
      case 'exercises':
        if (serverData.workosId !== undefined) updateFields.workosId = serverData.workosId;
        if (serverData.name !== undefined) updateFields.name = serverData.name;
        if (serverData.muscleGroup !== undefined) updateFields.muscleGroup = serverData.muscleGroup;
        if (serverData.description !== undefined) updateFields.description = serverData.description;
        if (serverData.updatedAt !== undefined) updateFields.updatedAt = new Date(serverData.updatedAt);
        break;
      case 'templates':
        if (serverData.workosId !== undefined) updateFields.workosId = serverData.workosId;
        if (serverData.name !== undefined) updateFields.name = serverData.name;
        if (serverData.description !== undefined) updateFields.description = serverData.description;
        if (serverData.updatedAt !== undefined) updateFields.updatedAt = new Date(serverData.updatedAt);
        break;
      case 'workouts':
        if (serverData.workosId !== undefined) updateFields.workosId = serverData.workosId;
        if (serverData.templateId !== undefined) updateFields.templateId = serverData.templateId;
        if (serverData.programCycleId !== undefined) updateFields.programCycleId = serverData.programCycleId;
        if (serverData.name !== undefined) updateFields.name = serverData.name;
        if (serverData.startedAt !== undefined) updateFields.startedAt = new Date(serverData.startedAt as string);
        if (serverData.completedAt !== undefined) updateFields.completedAt = serverData.completedAt ? new Date(serverData.completedAt as string) : undefined;
        if (serverData.notes !== undefined) updateFields.notes = serverData.notes;
        if (serverData.status !== undefined) updateFields.status = serverData.status;
        if (serverData.squat1rm !== undefined) updateFields.squat1rm = serverData.squat1rm;
        if (serverData.bench1rm !== undefined) updateFields.bench1rm = serverData.bench1rm;
        if (serverData.deadlift1rm !== undefined) updateFields.deadlift1rm = serverData.deadlift1rm;
        if (serverData.ohp1rm !== undefined) updateFields.ohp1rm = serverData.ohp1rm;
        if (serverData.startingSquat1rm !== undefined) updateFields.startingSquat1rm = serverData.startingSquat1rm;
        if (serverData.startingBench1rm !== undefined) updateFields.startingBench1rm = serverData.startingBench1rm;
        if (serverData.startingDeadlift1rm !== undefined) updateFields.startingDeadlift1rm = serverData.startingDeadlift1rm;
        if (serverData.startingOhp1rm !== undefined) updateFields.startingOhp1rm = serverData.startingOhp1rm;
        break;
      case 'workoutExercises':
        if (serverData.workoutId !== undefined) updateFields.workoutId = serverData.workoutId;
        if (serverData.exerciseId !== undefined) updateFields.exerciseId = serverData.exerciseId;
        if (serverData.orderIndex !== undefined) updateFields.order = serverData.orderIndex;
        if (serverData.notes !== undefined) updateFields.notes = serverData.notes;
        break;
      case 'workoutSets':
        if (serverData.workoutExerciseId !== undefined) updateFields.workoutExerciseId = serverData.workoutExerciseId;
        if (serverData.orderIndex !== undefined) updateFields.order = serverData.orderIndex;
        if (serverData.setNumber !== undefined) updateFields.setNumber = serverData.setNumber;
        if (serverData.weight !== undefined) updateFields.weight = serverData.weight;
        if (serverData.reps !== undefined) updateFields.reps = serverData.reps;
        if (serverData.rpe !== undefined) updateFields.rpe = serverData.rpe;
        if (serverData.isComplete !== undefined) updateFields.completed = serverData.isComplete;
        break;
    }

    return updateFields;
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

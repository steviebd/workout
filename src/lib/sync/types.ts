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

export interface LocalEntity {
  id?: number;
  localId: string;
  serverId?: string;
  serverUpdatedAt?: Date;
  syncStatus: 'synced' | 'pending' | 'failed';
  needsSync: boolean;
}

export type TableType = 'exercises' | 'templates' | 'workouts' | 'workoutExercises' | 'workoutSets';

/**
 * Type for entity names used in sync operations
 */
export type EntityType = 'exercise' | 'template' | 'workout' | 'workout_exercise' | 'workout_set';

/**
 * Type for items that can be added to Dexie tables
 * This is used for bulkAdd operations where the exact type is dynamic
 */
export type AddableItem = Record<string, unknown>;

/**
 * Response type for entity creation operations
 */
export interface CreateEntityResponse {
  id: string;
  updatedAt?: string;
}

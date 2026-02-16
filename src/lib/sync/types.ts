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

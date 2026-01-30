import DexieLib from 'dexie';

type Table<T = unknown, U = number> = DexieLib.Table<T, U>;

export interface LocalExercise {
  id?: number;
  localId: string;
  serverId?: string;
  workosId: string;
  name: string;
  muscleGroup: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  serverUpdatedAt?: Date;
  syncStatus: 'synced' | 'pending' | 'failed';
  needsSync: boolean;
}

export interface LocalTemplate {
  id?: number;
  localId: string;
  serverId?: string;
  workosId: string;
  name: string;
  description?: string;
  exercises: TemplateExerciseData[];
  createdAt: Date;
  updatedAt: Date;
  serverUpdatedAt?: Date;
  syncStatus: 'synced' | 'pending' | 'failed';
  needsSync: boolean;
}

export interface TemplateExerciseData {
  exerciseId: string;
  order: number;
  sets: number;
  reps: number;
  weight?: number;
  restSeconds?: number;
}

export interface LocalWorkout {
  id?: number;
  localId: string;
  serverId?: string;
  workosId: string;
  templateId?: string;
  name: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  serverUpdatedAt?: Date;
  syncStatus: 'synced' | 'pending' | 'failed';
  needsSync: boolean;
}

export interface LocalWorkoutExercise {
  id?: number;
  localId: string;
  workoutId: string;
  exerciseId: string;
  order: number;
  notes?: string;
  serverId?: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  needsSync: boolean;
}

export interface LocalWorkoutSet {
  id?: number;
  localId: string;
  workoutExerciseId: string;
  order: number;
  weight: number;
  reps: number;
  rpe?: number;
  completed: boolean;
  setNumber: number;
  serverId?: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  needsSync: boolean;
}

export interface OfflineOperation {
  id?: number;
  operationId: string;
  type: 'create' | 'update' | 'delete';
  entity: 'exercise' | 'template' | 'workout' | 'workout_exercise' | 'workout_set';
  localId: string;
  data: Record<string, unknown>;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export interface SyncMetadata {
  id?: number;
  key: string;
  value: string;
  updatedAt: Date;
}

class FitWorkoutDatabase extends DexieLib {
  exercises!: Table<LocalExercise>;
  templates!: Table<LocalTemplate>;
  workouts!: Table<LocalWorkout>;
  workoutExercises!: Table<LocalWorkoutExercise>;
  workoutSets!: Table<LocalWorkoutSet>;
  offlineQueue!: Table<OfflineOperation>;
  syncMetadata!: Table<SyncMetadata>;

  constructor() {
    super('FitWorkoutDB');
    this.version(1).stores({
      exercises: '++id, &localId, workosId, name, muscleGroup, serverId, syncStatus',
      templates: '++id, &localId, workosId, name, serverId, syncStatus',
      workouts: '++id, &localId, workosId, startedAt, status, serverId, syncStatus',
      workoutExercises: '++id, &localId, workoutId, exerciseId, serverId, syncStatus',
      workoutSets: '++id, &localId, workoutExerciseId, serverId, syncStatus',
      offlineQueue: '++id, operationId, [entity+localId], timestamp',
      syncMetadata: '&key, updatedAt',
    });
  }
}

export const localDB = new FitWorkoutDatabase();

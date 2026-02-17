/**
 * Local/Offline Types
 * 
 * Types for client-side IndexedDB storage and offline-first architecture.
 * These mirror the server types but include sync status tracking.
 */

// ============================================
// SYNC STATUS
// ============================================

/** Status of local entity synchronization with server */
export type SyncStatus = 'synced' | 'pending' | 'failed';

/** Base interface for all local entities */
export interface LocalEntity {
  /** Auto-incrementing local database ID */
  id?: number;
  /** Stable local identifier (UUID) */
  localId: string;
  /** Server-side ID (null until synced) */
  serverId?: string;
  /** User ownership */
  workosId: string;
  /** Local creation timestamp */
  createdAt: Date;
  /** Local last update timestamp */
  updatedAt: Date;
  /** Server last update timestamp (for conflict resolution) */
  serverUpdatedAt?: Date;
  /** Current sync status */
  syncStatus: SyncStatus;
  /** Whether entity has pending changes */
  needsSync: boolean;
}

// ============================================
// LOCAL EXERCISES
// ============================================

/** Exercise stored locally in IndexedDB */
export interface LocalExercise extends LocalEntity {
  name: string;
  muscleGroup: string;
  description?: string;
}

/** Template exercise configuration within a local template */
export interface TemplateExerciseData {
  /** Reference to exercise (local or server ID) */
  exerciseId: string;
  /** Display order */
  order: number;
  /** Number of sets */
  sets: number;
  /** Repetitions per set */
  reps: number;
  /** Target weight */
  weight?: number;
  /** Rest period in seconds */
  restSeconds?: number;
}

// ============================================
// LOCAL TEMPLATES
// ============================================

/** Template stored locally in IndexedDB */
export interface LocalTemplate extends LocalEntity {
  name: string;
  description?: string;
  exercises: TemplateExerciseData[];
}

// ============================================
// LOCAL WORKOUTS
// ============================================

/** Workout session status */
export type WorkoutStatus = 'in_progress' | 'completed' | 'cancelled';

/** Workout stored locally in IndexedDB */
export interface LocalWorkout extends LocalEntity {
  /** Optional reference to template */
  templateId?: string;
  /** Optional reference to program cycle */
  programCycleId?: string;
  name: string;
  /** When workout was started */
  startedAt: Date;
  /** When workout was completed (null if in progress) */
  completedAt?: Date;
  status: WorkoutStatus;
  notes?: string;
  squat1rm?: number;
  bench1rm?: number;
  deadlift1rm?: number;
  ohp1rm?: number;
  startingSquat1rm?: number;
  startingBench1rm?: number;
  startingDeadlift1rm?: number;
  startingOhp1rm?: number;
}

/** Exercise performed within a local workout */
export interface LocalWorkoutExercise {
  id?: number;
  localId: string;
  /** Reference to parent workout (localId) */
  workoutId: string;
  /** Reference to exercise (local or server ID) */
  exerciseId: string;
  order: number;
  notes?: string;
  serverId?: string;
  syncStatus: SyncStatus;
  needsSync: boolean;
}

/** Set performed for an exercise in a local workout */
export interface LocalWorkoutSet {
  id?: number;
  localId: string;
  /** Reference to parent workout exercise (localId) */
  workoutExerciseId: string;
  order: number;
  weight: number;
  reps: number;
  rpe?: number;
  completed: boolean;
  completedAt?: Date;
  setNumber: number;
  serverId?: string;
  syncStatus: SyncStatus;
  needsSync: boolean;
}

// ============================================
// OFFLINE OPERATIONS
// ============================================

/** Types of offline operations that can be queued */
export type OfflineOperationType = 'create' | 'update' | 'delete';

/** Entity types that support offline operations */
export type OfflineEntityType = 'exercise' | 'template' | 'workout' | 'workout_exercise' | 'workout_set';

/** Queued operation for later synchronization */
export interface OfflineOperation {
  id?: number;
  operationId: string;
  type: OfflineOperationType;
  entity: OfflineEntityType;
  localId: string;
  data: Record<string, unknown>;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

// ============================================
// SYNC METADATA
// ============================================

/** Key-value storage for sync-related metadata */
export interface SyncMetadata {
  id?: number;
  key: string;
  value: string;
  updatedAt: Date;
}

/** Last sync checkpoint information */
export interface SyncCheckpoint {
  lastSyncAt: string;
  serverTimestamp: string;
  entitiesSynced: number;
}

// ============================================
// CONVERSION TYPES
// ============================================

/** Maps local entity types to their server equivalents */
export interface LocalToRemoteMapping {
  exercise: {
    local: LocalExercise;
    remote: { id: string; name: string; muscleGroup: string | null; description: string | null };
  };
  template: {
    local: LocalTemplate;
    remote: { id: string; name: string; description: string | null };
  };
  workout: {
    local: LocalWorkout;
    remote: { id: string; name: string; startedAt: string; completedAt: string | null };
  };
}

/** Helper type to extract the remote type from a local entity */
export type LocalToRemote<T extends keyof LocalToRemoteMapping> = 
  LocalToRemoteMapping[T]['remote'];

/** Helper type to extract the local type from an entity key */
export type RemoteToLocal<T extends keyof LocalToRemoteMapping> = 
  LocalToRemoteMapping[T]['local'];

// ============================================
// CONFLICT RESOLUTION
// ============================================

/** Types of sync conflicts that can occur */
export type ConflictType = 'server_wins' | 'client_wins' | 'merge';

/** Conflict resolution strategy configuration */
export interface ConflictResolution {
  type: ConflictType;
  /** Whether to prompt user for resolution */
  promptUser: boolean;
  /** Custom merge function if type is 'merge' */
  mergeStrategy?: 'last_write_wins' | 'custom';
}

/** Represents a detected sync conflict */
export interface SyncConflict {
  entityType: OfflineEntityType;
  localId: string;
  serverId?: string;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  localUpdatedAt: Date;
  serverUpdatedAt: Date;
}

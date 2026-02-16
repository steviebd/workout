/**
 * Unified Repository Types
 * 
 * This module defines shared interfaces that both local (IndexedDB) and remote (D1)
 * repositories can implement, providing a consistent API regardless of storage backend.
 */

import type { DbOrTx } from '~/lib/db';

// ============================================
// CORE TYPES
// ============================================

/**
 * Context object passed to all repository operations.
 * Contains user identification and optional database/transaction reference.
 */
export interface RepositoryContext {
  /** The user's WorkOS ID (used for ownership/authorization) */
  workosId: string;
  /** Optional database or transaction reference (not needed for local repositories) */
  db?: DbOrTx;
}

/**
 * Standard query options for list operations
 */
export interface QueryOptions {
  /** Search term to filter results */
  search?: string;
  /** Maximum number of results to return */
  limit?: number;
  /** Number of results to skip (for pagination) */
  offset?: number;
  /** Field to sort by */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Sync status for local entities
 */
export type SyncStatus = 'synced' | 'pending' | 'failed';

// ============================================
// EXERCISE TYPES
// ============================================

/**
 * Input data for creating an exercise
 */
export interface CreateExerciseInput {
  name: string;
  muscleGroup?: string;
  description?: string;
  libraryId?: string;
}

/**
 * Input data for updating an exercise
 */
export interface UpdateExerciseInput {
  name?: string;
  muscleGroup?: string;
  description?: string;
}

/**
 * Query options specific to exercises
 */
export interface ExerciseQueryOptions extends QueryOptions {
  /** Filter by muscle group */
  muscleGroup?: string;
  /** Exclude soft-deleted exercises */
  excludeDeleted?: boolean;
}

/**
 * Unified Exercise entity returned by all repositories.
 * Hides the differences between localId/serverId and sync status fields.
 */
export interface UnifiedExercise {
  /** Unique identifier (server ID if synced, local ID if pending) */
  id: string;
  /** Local ID for sync tracking (same as id if not yet synced) */
  localId: string;
  /** Server ID after sync (undefined if not yet synced) */
  serverId?: string;
  /** User's WorkOS ID */
  workosId: string;
  /** Exercise name */
  name: string;
  /** Muscle group classification */
  muscleGroup?: string;
  /** Optional description */
  description?: string;
  /** Reference to library exercise if copied */
  libraryId?: string;
  /** Whether the exercise is deleted (soft delete) */
  isDeleted: boolean;
  /** When the exercise was created */
  createdAt: Date;
  /** When the exercise was last updated */
  updatedAt: Date;
  /** Sync status (only relevant for local repositories) */
  syncStatus: SyncStatus;
  /** Whether the entity needs to be synced */
  needsSync: boolean;
}

// ============================================
// REPOSITORY INTERFACES
// ============================================

/**
 * Exercise repository interface - implemented by both local and remote repositories.
 * 
 * All methods return UnifiedExercise to provide a consistent API.
 * The implementation handles the mapping between unified types and storage-specific types.
 */
export interface ExerciseRepository {
  /**
   * Create a new exercise
   * @param ctx - Repository context with workosId and optional db
   * @param data - Exercise data to create
   * @returns The created exercise
   */
  create(ctx: RepositoryContext, data: CreateExerciseInput): Promise<UnifiedExercise>;

  /**
   * Get an exercise by its ID (works with both local and server IDs)
   * @param ctx - Repository context with workosId and optional db
   * @param id - Exercise ID (localId or serverId)
   * @returns The exercise if found, null otherwise
   */
  getById(ctx: RepositoryContext, id: string): Promise<UnifiedExercise | null>;

  /**
   * Get all exercises for a user
   * @param ctx - Repository context with workosId and optional db
   * @param options - Query options for filtering/sorting
   * @returns Array of exercises
   */
  getAll(ctx: RepositoryContext, options?: ExerciseQueryOptions): Promise<UnifiedExercise[]>;

  /**
   * Update an exercise
   * @param ctx - Repository context with workosId and optional db
   * @param id - Exercise ID to update
   * @param data - Fields to update
   * @returns The updated exercise, or null if not found
   */
  update(ctx: RepositoryContext, id: string, data: UpdateExerciseInput): Promise<UnifiedExercise | null>;

  /**
   * Delete an exercise (soft delete)
   * @param ctx - Repository context with workosId and optional db
   * @param id - Exercise ID to delete
   * @returns True if deleted, false if not found
   */
  delete(ctx: RepositoryContext, id: string): Promise<boolean>;

  /**
   * Copy an exercise from the library
   * @param ctx - Repository context with workosId and optional db
   * @param libraryExercise - Library exercise data to copy
   * @returns The created exercise
   */
  copyFromLibrary?(
    ctx: RepositoryContext,
    libraryExercise: { name: string; muscleGroup: string; description: string }
  ): Promise<UnifiedExercise>;
}

// ============================================
// REPOSITORY TYPES (for factory)
// ============================================

export type RepositoryType = 'local' | 'remote';

/**
 * Factory function type for getting repository instances
 */
export type RepositoryFactory<T> = (type: RepositoryType) => T;

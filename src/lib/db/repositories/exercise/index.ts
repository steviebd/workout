/**
 * Exercise Repository Factory
 * 
 * Provides a unified interface for exercise operations that works with both
 * local (IndexedDB) and remote (D1) storage backends.
 * 
 * Usage:
 *   import { getExerciseRepository } from '~/lib/db/repositories/exercise';
 *   
 *   // For server-side operations
 *   const remoteRepo = getExerciseRepository('remote');
 *   const exercise = await remoteRepo.getById({ workosId, db }, exerciseId);
 *   
 *   // For client-side/offline operations
 *   const localRepo = getExerciseRepository('local');
 *   const exercise = await localRepo.getById({ workosId }, exerciseId);
 */

import { localExerciseRepository } from './local';
import { remoteExerciseRepository } from './remote';
import type { ExerciseRepository, RepositoryType } from '../types';

/**
 * Gets the appropriate exercise repository implementation
 * @param type - 'local' for IndexedDB, 'remote' for D1
 * @returns ExerciseRepository implementation
 */
export function getExerciseRepository(type: RepositoryType): ExerciseRepository {
  switch (type) {
    case 'local':
      return localExerciseRepository;
    case 'remote':
      return remoteExerciseRepository;
    default:
      throw new Error(`Unknown repository type: ${type}`);
  }
}

// Re-export types for convenience
export type { ExerciseRepository, RepositoryType, RepositoryContext } from '../types';
export type {
  CreateExerciseInput,
  UpdateExerciseInput,
  ExerciseQueryOptions,
  UnifiedExercise,
  SyncStatus,
} from '../types';

// Re-export implementations for direct access if needed
export { localExerciseRepository } from './local';
export { remoteExerciseRepository } from './remote';

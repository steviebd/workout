/**
 * Remote Exercise Repository
 * 
 * Wraps the existing D1-based exercise repository to implement the unified interface.
 * Maps between UnifiedExercise and the server-side Exercise schema.
 */

import type { Exercise as DbExercise } from '~/lib/db/schema';
import type { DbOrTx } from '~/lib/db';
import type {
  RepositoryContext,
  CreateExerciseInput,
  UpdateExerciseInput,
  ExerciseQueryOptions,
  UnifiedExercise,
  ExerciseRepository,
} from '../types';
import * as remoteRepo from '~/lib/db/exercise/repository';

/**
 * Converts a database Exercise to a UnifiedExercise
 */
function toUnified(exercise: DbExercise): UnifiedExercise {
  return {
    id: exercise.id,
    localId: exercise.localId ?? exercise.id,
    serverId: exercise.id,
    workosId: exercise.workosId,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup ?? undefined,
    description: exercise.description ?? undefined,
    libraryId: exercise.libraryId ?? undefined,
    isDeleted: exercise.isDeleted ?? false,
    createdAt: exercise.createdAt ? new Date(exercise.createdAt) : new Date(),
    updatedAt: exercise.updatedAt ? new Date(exercise.updatedAt) : new Date(),
    syncStatus: 'synced', // Remote exercises are always synced
    needsSync: false,
  };
}

/**
 * Gets the database instance from context or throws if not provided
 */
function getDbFromContext(ctx: RepositoryContext): DbOrTx {
  if (!ctx.db) {
    throw new Error('Database reference required for remote repository operations');
  }
  return ctx.db;
}

/**
 * Remote exercise repository implementation
 */
export const remoteExerciseRepository: ExerciseRepository = {
  async create(ctx: RepositoryContext, data: CreateExerciseInput): Promise<UnifiedExercise> {
    const db = getDbFromContext(ctx);

    const exercise = await remoteRepo.createExercise(db, {
      ...data,
      workosId: ctx.workosId,
    });

    return toUnified(exercise);
  },

  async getById(ctx: RepositoryContext, id: string): Promise<UnifiedExercise | null> {
    const db = getDbFromContext(ctx);

    const exercise = await remoteRepo.getExerciseById(db, id, ctx.workosId);
    return exercise ? toUnified(exercise) : null;
  },

  async getAll(ctx: RepositoryContext, options: ExerciseQueryOptions = {}): Promise<UnifiedExercise[]> {
    const db = getDbFromContext(ctx);

    const exercises = await remoteRepo.getExercisesByWorkosId(db, ctx.workosId, {
      search: options.search,
      muscleGroup: options.muscleGroup,
      excludeDeleted: options.excludeDeleted ?? true,
      sortBy: options.sortBy as 'createdAt' | 'muscleGroup' | 'name' | undefined,
      sortOrder: options.sortOrder,
      limit: options.limit,
      offset: options.offset,
    });

    return exercises.map(toUnified);
  },

  async update(
    ctx: RepositoryContext,
    id: string,
    data: UpdateExerciseInput
  ): Promise<UnifiedExercise | null> {
    const db = getDbFromContext(ctx);

    const exercise = await remoteRepo.updateExercise(db, id, ctx.workosId, data);
    return exercise ? toUnified(exercise) : null;
  },

  async delete(ctx: RepositoryContext, id: string): Promise<boolean> {
    const db = getDbFromContext(ctx);

    return remoteRepo.softDeleteExercise(db, id, ctx.workosId);
  },

  async copyFromLibrary(
    ctx: RepositoryContext,
    libraryExercise: { name: string; muscleGroup: string; description: string }
  ): Promise<UnifiedExercise> {
    const db = getDbFromContext(ctx);

    const exercise = await remoteRepo.copyExerciseFromLibrary(db, ctx.workosId, libraryExercise);
    return toUnified(exercise);
  },
};

export default remoteExerciseRepository;

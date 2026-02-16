/**
 * Local Exercise Repository
 * 
 * Wraps the existing IndexedDB-based exercise repository to implement the unified interface.
 * Maps between UnifiedExercise and the local LocalExercise type.
 */

import type { LocalExercise } from '~/lib/db/local-db';
import type {
  RepositoryContext,
  CreateExerciseInput,
  UpdateExerciseInput,
  ExerciseQueryOptions,
  UnifiedExercise,
  ExerciseRepository,
} from '../types';
import * as localRepo from '~/lib/db/local/exercises';

/**
 * Converts a LocalExercise to a UnifiedExercise
 */
function toUnified(exercise: LocalExercise): UnifiedExercise {
  // Use serverId as id if available, otherwise use localId
  const id = exercise.serverId ?? exercise.localId;

  return {
    id,
    localId: exercise.localId,
    serverId: exercise.serverId,
    workosId: exercise.workosId,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    description: exercise.description,
    libraryId: undefined, // Local exercises don't have libraryId
    isDeleted: false, // Soft deletes handled differently in local
    createdAt: exercise.createdAt,
    updatedAt: exercise.updatedAt,
    syncStatus: exercise.syncStatus,
    needsSync: exercise.needsSync,
  };
}

/**
 * Local exercise repository implementation
 */
export const localExerciseRepository: ExerciseRepository = {
  async create(ctx: RepositoryContext, data: CreateExerciseInput): Promise<UnifiedExercise> {
    const localId = await localRepo.createExercise(ctx.workosId, {
      name: data.name,
      muscleGroup: data.muscleGroup ?? '',
      description: data.description,
    });

    const exercise = await localRepo.getExercise(localId);
    if (!exercise) {
      throw new Error('Failed to create exercise - not found after creation');
    }

    return toUnified(exercise);
  },

  async getById(ctx: RepositoryContext, id: string): Promise<UnifiedExercise | null> {
    // Try to get by localId first
    let exercise = await localRepo.getExercise(id);

    // If not found, search through all exercises for one with matching serverId
    if (!exercise) {
      const allExercises = await localRepo.getExercises(ctx.workosId);
      exercise = allExercises.find((e) => e.serverId === id);
    }

    return exercise ? toUnified(exercise) : null;
  },

  async getAll(ctx: RepositoryContext, options: ExerciseQueryOptions = {}): Promise<UnifiedExercise[]> {
    const exercises = await localRepo.getExercises(ctx.workosId);

    // Apply filters
    let filtered = exercises;

    if (options.muscleGroup) {
      filtered = filtered.filter((e) => e.muscleGroup === options.muscleGroup);
    }

    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filtered = filtered.filter((e) => e.name.toLowerCase().includes(searchLower));
    }

    // Apply sorting
    const sortBy = options.sortBy ?? 'createdAt';
    const sortOrder = options.sortOrder ?? 'DESC';

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'muscleGroup':
          comparison = a.muscleGroup.localeCompare(b.muscleGroup);
          break;
        case 'createdAt':
        default:
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
      }

      return sortOrder === 'DESC' ? -comparison : comparison;
    });

    // Apply pagination
    const offset = options.offset ?? 0;
    const limit = options.limit;
    const paginated = limit !== undefined ? filtered.slice(offset, offset + limit) : filtered.slice(offset);

    return paginated.map(toUnified);
  },

  async update(
    ctx: RepositoryContext,
    id: string,
    data: UpdateExerciseInput
  ): Promise<UnifiedExercise | null> {
    // First, find the exercise by id (could be localId or serverId)
    let localId = id;
    const existingByLocalId = await localRepo.getExercise(id);

    if (!existingByLocalId) {
      // Try to find by serverId
      const allExercises = await localRepo.getExercises(ctx.workosId);
      const byServerId = allExercises.find((e) => e.serverId === id);
      if (byServerId) {
        localId = byServerId.localId;
      } else {
        return null;
      }
    }

    // Update the exercise
    await localRepo.updateExercise(localId, {
      name: data.name,
      muscleGroup: data.muscleGroup,
      description: data.description,
    });

    // Fetch and return the updated exercise
    const updated = await localRepo.getExercise(localId);
    return updated ? toUnified(updated) : null;
  },

  async delete(ctx: RepositoryContext, id: string): Promise<boolean> {
    // First, find the exercise by id (could be localId or serverId)
    let localId = id;
    const existingByLocalId = await localRepo.getExercise(id);

    if (!existingByLocalId) {
      // Try to find by serverId
      const allExercises = await localRepo.getExercises(ctx.workosId);
      const byServerId = allExercises.find((e) => e.serverId === id);
      if (byServerId) {
        localId = byServerId.localId;
      } else {
        return false;
      }
    }

    await localRepo.deleteExercise(localId);
    return true;
  },

  async copyFromLibrary(
    ctx: RepositoryContext,
    libraryExercise: { name: string; muscleGroup: string; description: string }
  ): Promise<UnifiedExercise> {
    const localId = await localRepo.createExercise(ctx.workosId, {
      name: libraryExercise.name,
      muscleGroup: libraryExercise.muscleGroup,
      description: libraryExercise.description,
    });

    const exercise = await localRepo.getExercise(localId);
    if (!exercise) {
      throw new Error('Failed to copy exercise from library - not found after creation');
    }

    return toUnified(exercise);
  },
};

export default localExerciseRepository;

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../../src/lib/db/schema';

const mockExerciseData = {
  id: 'exercise-1',
  localId: null,
  workosId: 'user-1',
  name: 'Bench Press',
  muscleGroup: 'Chest',
  description: 'Classic chest exercise',
  libraryId: null,
  isDeleted: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const createMockInsertChain = (result: Exercise) => ({
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  get: vi.fn().mockResolvedValue(result),
});

const createMockSelectChain = (result: Exercise | Exercise[] | undefined) => {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue(result),
    then: vi.fn((resolve) => Promise.resolve(result).then(resolve)),
  };
  return chain;
};

const createMockUpdateChain = (result: Exercise | undefined | { success: boolean }) => ({
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  get: vi.fn().mockResolvedValue(result),
  run: vi.fn().mockResolvedValue(result),
});

describe('Exercise CRUD Operations', () => {
  let mockDrizzleDb: {
    insert: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let createDbMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockDrizzleDb = {
      insert: vi.fn(() => createMockInsertChain(mockExerciseData)),
      select: vi.fn(() => createMockSelectChain([mockExerciseData])),
      update: vi.fn(() => createMockUpdateChain(mockExerciseData)),
    };

    createDbMock = vi.fn(() => mockDrizzleDb);
    vi.doMock('../../src/lib/db/index', () => ({
      createDb: createDbMock,
      getDb: vi.fn((dbOrTx) => {
        if (dbOrTx && typeof dbOrTx === 'object' && 'transaction' in dbOrTx) {
          return dbOrTx;
        }
        return mockDrizzleDb;
      }),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.doUnmock('../../src/lib/db/index');
  });

  describe('createExercise', () => {
    it('creates exercise with all fields', async () => {
      const { createExercise } = await import('../../src/lib/db/exercise');

      const result = await createExercise({} as D1Database, {
        workosId: 'user-1',
        name: 'Bench Press',
        muscleGroup: 'Chest',
        description: 'Classic chest exercise',
      });

      expect(result.id).toBe('exercise-1');
      expect(result.workosId).toBe('user-1');
      expect(result.name).toBe('Bench Press');
      expect(result.muscleGroup).toBe('Chest');
      expect(result.description).toBe('Classic chest exercise');
    });

    it('creates exercise with minimal fields', async () => {
      const exerciseWithMinimalData = { ...mockExerciseData, muscleGroup: null, description: null };
      mockDrizzleDb.insert = vi.fn(() => createMockInsertChain(exerciseWithMinimalData));

      const { createExercise } = await import('../../src/lib/db/exercise');

      const result = await createExercise({} as D1Database, {
        workosId: 'user-1',
        name: 'Push Up',
      });

      expect(result.id).toBe('exercise-1');
      expect(result.muscleGroup).toBeNull();
      expect(result.description).toBeNull();
    });
  });

  describe('getExerciseById', () => {
    it('returns exercise when owned by user', async () => {
      mockDrizzleDb.select = vi.fn(() => createMockSelectChain(mockExerciseData));

      const { getExerciseById } = await import('../../src/lib/db/exercise');

      const result = await getExerciseById({} as D1Database, 'exercise-1', 'user-1');

      expect(result).toEqual({
        id: 'exercise-1',
        workosId: 'user-1',
        name: 'Bench Press',
        muscleGroup: 'Chest',
        description: 'Classic chest exercise',
        libraryId: null,
        isDeleted: false,
        localId: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
    });

    it('returns null when exercise belongs to different user', async () => {
      mockDrizzleDb.select = vi.fn(() => createMockSelectChain(undefined));

      const { getExerciseById } = await import('../../src/lib/db/exercise');

      const result = await getExerciseById({} as D1Database, 'exercise-1', 'user-2');

      expect(result).toBeNull();
    });

    it('returns null when exercise does not exist', async () => {
      mockDrizzleDb.select = vi.fn(() => createMockSelectChain(undefined));

      const { getExerciseById } = await import('../../src/lib/db/exercise');

      const result = await getExerciseById({} as D1Database, 'non-existent', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('getExercisesByWorkosId', () => {
    it('returns user exercises', async () => {
      const exercises = [
        { ...mockExerciseData, id: 'exercise-1', name: 'Bench Press' },
        { ...mockExerciseData, id: 'exercise-2', name: 'Squat', muscleGroup: 'Legs' },
      ];
      mockDrizzleDb.select = vi.fn(() => createMockSelectChain(exercises));

      const { getExercisesByWorkosId } = await import('../../src/lib/db/exercise');

      const result = await getExercisesByWorkosId({} as D1Database, 'user-1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Bench Press');
      expect(result[1].name).toBe('Squat');
    });

    it('supports search filter', async () => {
      const exercises = [{ ...mockExerciseData, name: 'Bench Press' }];
      mockDrizzleDb.select = vi.fn(() => createMockSelectChain(exercises));

      const { getExercisesByWorkosId } = await import('../../src/lib/db/exercise');

      const result = await getExercisesByWorkosId({} as D1Database, 'user-1', { search: 'Bench' });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Bench Press');
    });

    it('supports muscle group filter', async () => {
      const exercises = [{ ...mockExerciseData, muscleGroup: 'Chest' }];
      mockDrizzleDb.select = vi.fn(() => createMockSelectChain(exercises));

      const { getExercisesByWorkosId } = await import('../../src/lib/db/exercise');

      const result = await getExercisesByWorkosId({} as D1Database, 'user-1', { muscleGroup: 'Chest' });

      expect(result).toHaveLength(1);
      expect(result[0].muscleGroup).toBe('Chest');
    });

    it('returns empty array when no exercises found', async () => {
      mockDrizzleDb.select = vi.fn(() => createMockSelectChain([]));

      const { getExercisesByWorkosId } = await import('../../src/lib/db/exercise');

      const result = await getExercisesByWorkosId({} as D1Database, 'user-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('updateExercise', () => {
    it('updates fields successfully', async () => {
      const updatedExercise = {
        ...mockExerciseData,
        name: 'Updated Bench Press',
        muscleGroup: 'Upper Chest',
        description: 'Updated description',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };
      mockDrizzleDb.update = vi.fn(() => createMockUpdateChain(updatedExercise));

      const { updateExercise } = await import('../../src/lib/db/exercise');

      const result = await updateExercise({} as D1Database, 'exercise-1', 'user-1', {
        name: 'Updated Bench Press',
        muscleGroup: 'Upper Chest',
        description: 'Updated description',
      });

      expect(result).toEqual({
        ...mockExerciseData,
        name: 'Updated Bench Press',
        muscleGroup: 'Upper Chest',
        description: 'Updated description',
        updatedAt: '2024-01-02T00:00:00.000Z',
      });
    });

    it('returns null when exercise does not exist', async () => {
      mockDrizzleDb.update = vi.fn(() => createMockUpdateChain(undefined));

      const { updateExercise } = await import('../../src/lib/db/exercise');

      const result = await updateExercise({} as D1Database, 'non-existent', 'user-1', {
        name: 'Updated Name',
      });

      expect(result).toBeNull();
    });

    it('returns null when user does not own exercise', async () => {
      mockDrizzleDb.update = vi.fn(() => createMockUpdateChain(undefined));

      const { updateExercise } = await import('../../src/lib/db/exercise');

      const result = await updateExercise({} as D1Database, 'exercise-1', 'user-2', {
        name: 'Updated Name',
      });

      expect(result).toBeNull();
    });
  });

  describe('softDeleteExercise', () => {
    it('sets isDeleted to true', async () => {
      mockDrizzleDb.update = vi.fn(() => createMockUpdateChain({ success: true }));

      const { softDeleteExercise } = await import('../../src/lib/db/exercise');

      const result = await softDeleteExercise({} as D1Database, 'exercise-1', 'user-1');

      expect(result).toBe(true);
    });

    it('returns false when exercise does not exist', async () => {
      mockDrizzleDb.update = vi.fn(() => createMockUpdateChain({ success: false }));

      const { softDeleteExercise } = await import('../../src/lib/db/exercise');

      const result = await softDeleteExercise({} as D1Database, 'non-existent', 'user-1');

      expect(result).toBe(false);
    });

    it('returns false when user does not own exercise', async () => {
      mockDrizzleDb.update = vi.fn(() => createMockUpdateChain({ success: false }));

      const { softDeleteExercise } = await import('../../src/lib/db/exercise');

      const result = await softDeleteExercise({} as D1Database, 'exercise-1', 'user-2');

      expect(result).toBe(false);
    });
  });

  describe('copyExerciseFromLibrary', () => {
    it('creates exercise from library item', async () => {
      const libraryExerciseData = {
        id: 'new-exercise-1',
        localId: null,
        workosId: 'user-1',
        name: 'Library Push Up',
        muscleGroup: 'Chest',
        description: 'Standard push up from library',
        libraryId: null,
        isDeleted: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      mockDrizzleDb.insert = vi.fn(() => createMockInsertChain(libraryExerciseData));

      const { copyExerciseFromLibrary } = await import('../../src/lib/db/exercise');

      const result = await copyExerciseFromLibrary({} as D1Database, 'user-1', {
        name: 'Library Push Up',
        muscleGroup: 'Chest',
        description: 'Standard push up from library',
      });

      expect(result.id).toBe('new-exercise-1');
      expect(result.workosId).toBe('user-1');
      expect(result.name).toBe('Library Push Up');
      expect(result.muscleGroup).toBe('Chest');
      expect(result.description).toBe('Standard push up from library');
    });

    it('creates exercise with minimal library data', async () => {
      const libraryExerciseData = {
        id: 'new-exercise-2',
        localId: null,
        workosId: 'user-1',
        name: 'Library Squat',
        muscleGroup: 'Legs',
        description: '',
        libraryId: null,
        isDeleted: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      mockDrizzleDb.insert = vi.fn(() => createMockInsertChain(libraryExerciseData));

      const { copyExerciseFromLibrary } = await import('../../src/lib/db/exercise');

      const result = await copyExerciseFromLibrary({} as D1Database, 'user-1', {
        name: 'Library Squat',
        muscleGroup: 'Legs',
        description: '',
      });

      expect(result.id).toBe('new-exercise-2');
      expect(result.description).toBe('');
    });
  });
});

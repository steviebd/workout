import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockWorkoutData = {
  id: 'workout-1',
  userId: 'user-1',
  templateId: 'template-1',
  name: 'Upper Body Workout',
  startedAt: '2024-01-01T10:00:00.000Z',
  completedAt: null,
  notes: 'Great workout',
  createdAt: '2024-01-01T10:00:00.000Z',
};

const mockWorkoutSetData = {
  id: 'workout-set-1',
  workoutExerciseId: 'workout-exercise-1',
  setNumber: 1,
  weight: 80,
  reps: 8,
  rpe: 7.5,
  isComplete: true,
  completedAt: '2024-01-01T10:05:00.000Z',
  createdAt: '2024-01-01T10:05:00.000Z',
};

const mockUserPreferenceData = {
  id: 'prefs-1',
  userId: 'user-1',
  weightUnit: 'kg',
  theme: 'light',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const createMockInsertChain = (result: any) => ({
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  get: vi.fn().mockResolvedValue(result),
});

const createMockSelectChain = (result: any) => ({
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockResolvedValue(result),
  limit: vi.fn().mockResolvedValue(result),
  get: vi.fn().mockResolvedValue(result),
  all: vi.fn().mockResolvedValue(result),
});

const createMockUpdateChain = (result: any) => ({
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  get: vi.fn().mockResolvedValue(result),
  run: vi.fn().mockResolvedValue({ success: true }),
});

const createMockDeleteChain = () => ({
  where: vi.fn().mockReturnThis(),
  run: vi.fn().mockResolvedValue({ success: true }),
});

describe('Workout CRUD Operations', () => {
  let mockDrizzleDb: any;
  let createDbMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockDrizzleDb = {
      insert: vi.fn(() => createMockInsertChain(mockWorkoutData)),
      select: vi.fn(() => createMockSelectChain([mockWorkoutData])),
      update: vi.fn(() => createMockUpdateChain(mockWorkoutData)),
      delete: vi.fn(() => createMockDeleteChain()),
    };

    createDbMock = vi.fn(() => mockDrizzleDb);
    vi.doMock('../../src/lib/db/index', () => ({
      createDb: createDbMock,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.doUnmock('../../src/lib/db/index');
  });

  describe('createWorkout', () => {
    it('creates workout with all fields', async () => {
      const { createWorkout } = await import('../../src/lib/db/workout');

      const result = await createWorkout({} as D1Database, {
        userId: 'user-1',
        name: 'Upper Body Workout',
        templateId: 'template-1',
        notes: 'Great workout',
      });

      expect(result.id).toBe('workout-1');
      expect(result.userId).toBe('user-1');
      expect(result.name).toBe('Upper Body Workout');
      expect(result.templateId).toBe('template-1');
      expect(result.notes).toBe('Great workout');
      expect(result.startedAt).toBeDefined();
    });

    it('creates workout without template', async () => {
      const workoutWithoutTemplate = { ...mockWorkoutData, templateId: null };
      mockDrizzleDb.insert = vi.fn(() => createMockInsertChain(workoutWithoutTemplate));

      const { createWorkout } = await import('../../src/lib/db/workout');

      const result = await createWorkout({} as D1Database, {
        userId: 'user-1',
        name: 'Quick Workout',
      });

      expect(result.id).toBe('workout-1');
      expect(result.templateId).toBeNull();
    });
  });

  describe('getWorkoutById', () => {
    it('returns workout when owned by user', async () => {
      mockDrizzleDb.select = vi.fn(() => createMockSelectChain(mockWorkoutData));

      const { getWorkoutById } = await import('../../src/lib/db/workout');

      const result = await getWorkoutById({} as D1Database, 'workout-1', 'user-1');

      expect(result?.id).toBe('workout-1');
      expect(result?.name).toBe('Upper Body Workout');
    });

    it('returns null when not owned by user', async () => {
      mockDrizzleDb.select = vi.fn(() => createMockSelectChain(null));

      const { getWorkoutById } = await import('../../src/lib/db/workout');

      const result = await getWorkoutById({} as D1Database, 'workout-1', 'user-2');

      expect(result).toBeNull();
    });
  });

  describe('completeWorkout', () => {
    it('completes workout with timestamp', async () => {
      const completedWorkout = { ...mockWorkoutData, completedAt: '2024-01-01T11:00:00.000Z' };
      mockDrizzleDb.update = vi.fn(() => createMockUpdateChain(completedWorkout));

      const { completeWorkout } = await import('../../src/lib/db/workout');

      const result = await completeWorkout({} as D1Database, 'workout-1', 'user-1');

      expect(result?.completedAt).toBe('2024-01-01T11:00:00.000Z');
    });
  });

  describe('deleteWorkout', () => {
    it('deletes workout successfully', async () => {
      const { deleteWorkout } = await import('../../src/lib/db/workout');

      const result = await deleteWorkout({} as D1Database, 'workout-1', 'user-1');

      expect(result).toBe(true);
    });
  });

  describe('createWorkoutSet', () => {
    it('creates workout set with all fields', async () => {
      mockDrizzleDb.insert = vi.fn(() => createMockInsertChain(mockWorkoutSetData));

      const { createWorkoutSet } = await import('../../src/lib/db/workout');

      const result = await createWorkoutSet({} as D1Database, 'workout-exercise-1', 1, 80, 8, 7.5);

      expect(result.id).toBe('workout-set-1');
      expect(result.workoutExerciseId).toBe('workout-exercise-1');
      expect(result.setNumber).toBe(1);
      expect(result.weight).toBe(80);
      expect(result.reps).toBe(8);
      expect(result.rpe).toBe(7.5);
      expect(result.isComplete).toBe(false);
    });
  });

  describe('completeWorkoutSet', () => {
    it('marks set as complete', async () => {
      const completedSet = { ...mockWorkoutSetData, isComplete: true, completedAt: '2024-01-01T10:05:00.000Z' };
      mockDrizzleDb.update = vi.fn(() => createMockUpdateChain(completedSet));

      const { completeWorkoutSet } = await import('../../src/lib/db/workout');

      const result = await completeWorkoutSet({} as D1Database, 'workout-set-1');

      expect(result?.isComplete).toBe(true);
      expect(result?.completedAt).toBeDefined();
    });
  });
});

describe('User Preferences Operations', () => {
  let mockDrizzleDb: any;
  let createDbMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockDrizzleDb = {
      insert: vi.fn(() => createMockInsertChain(mockUserPreferenceData)),
      select: vi.fn(() => createMockSelectChain(mockUserPreferenceData)),
      update: vi.fn(() => createMockUpdateChain(mockUserPreferenceData)),
    };

    createDbMock = vi.fn(() => mockDrizzleDb);
    vi.doMock('../../src/lib/db/index', () => ({
      createDb: createDbMock,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.doUnmock('../../src/lib/db/index');
  });

  describe('getUserPreferences', () => {
    it('returns preferences when user has them', async () => {
      mockDrizzleDb.select = vi.fn(() => createMockSelectChain(mockUserPreferenceData));

      const { getUserPreferences } = await import('../../src/lib/db/preferences');

      const result = await getUserPreferences({} as D1Database, 'user-1');

      expect(result?.userId).toBe('user-1');
      expect(result?.weightUnit).toBe('kg');
      expect(result?.theme).toBe('light');
    });

    it('returns null when user has no preferences', async () => {
      mockDrizzleDb.select = vi.fn(() => createMockSelectChain(null));

      const { getUserPreferences } = await import('../../src/lib/db/preferences');

      const result = await getUserPreferences({} as D1Database, 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('upsertUserPreferences', () => {
    it('creates new preferences when none exist', async () => {
      const { upsertUserPreferences } = await import('../../src/lib/db/preferences');

      const result = await upsertUserPreferences({} as D1Database, 'user-1', {
        weightUnit: 'lbs',
        theme: 'dark',
      });

      expect(result.userId).toBe('user-1');
      expect(result.weightUnit).toBe('kg');
    });

    it('updates existing preferences', async () => {
      const updatedPrefs = { ...mockUserPreferenceData, weightUnit: 'lbs' };
      mockDrizzleDb.select = vi.fn(() => createMockSelectChain(mockUserPreferenceData));
      mockDrizzleDb.update = vi.fn(() => createMockUpdateChain(updatedPrefs));

      const { upsertUserPreferences } = await import('../../src/lib/db/preferences');

      const result = await upsertUserPreferences({} as D1Database, 'user-1', {
        weightUnit: 'lbs',
      });

      expect(result.weightUnit).toBe('kg');
    });
  });
});

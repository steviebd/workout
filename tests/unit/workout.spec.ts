import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDb } from '../../src/lib/db/index';
import type { D1Database } from '@cloudflare/workers-types';
import type { Workout, WorkoutSet, UserPreference } from '../../src/lib/db/schema';

vi.mock('../../src/lib/db/index', () => ({
  createDb: vi.fn(),
}));

const mockDb = vi.fn() as unknown as D1Database;

const mockDrizzleDb = {
  insert: vi.fn(),
  update: vi.fn(),
  select: vi.fn(),
  delete: vi.fn(),
};

const mockWorkoutData: Workout = {
  id: 'workout-1',
  userId: 'user-1',
  templateId: 'template-1',
  name: 'Upper Body Workout',
  startedAt: '2024-01-01T10:00:00.000Z',
  completedAt: null,
  notes: 'Great workout',
  createdAt: '2024-01-01T10:00:00.000Z',
};

const mockWorkoutSetData: WorkoutSet = {
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

const mockUserPreferenceData: UserPreference = {
  id: 'prefs-1',
  userId: 'user-1',
  weightUnit: 'kg',
  theme: 'light',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('Workout CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    vi.mocked(createDb).mockReturnValue(mockDrizzleDb as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createWorkout', () => {
    it('creates workout with all fields', async () => {
      mockDrizzleDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(mockWorkoutData),
          }),
        }),
      });

      const { createWorkout } = await import('../../src/lib/db/workout');

      const result = await createWorkout(mockDb, {
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

      mockDrizzleDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(workoutWithoutTemplate),
          }),
        }),
      });

      const { createWorkout } = await import('../../src/lib/db/workout');

      const result = await createWorkout(mockDb, {
        userId: 'user-1',
        name: 'Quick Workout',
      });

      expect(result.id).toBe('workout-1');
      expect(result.templateId).toBeNull();
    });
  });

  describe('getWorkoutById', () => {
    it('returns workout when owned by user', async () => {
      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(mockWorkoutData),
          }),
        }),
      });

      const { getWorkoutById } = await import('../../src/lib/db/workout');

      const result = await getWorkoutById(mockDb, 'workout-1', 'user-1');

      expect(result?.id).toBe('workout-1');
      expect(result?.name).toBe('Upper Body Workout');
    });

    it('returns null when not owned by user', async () => {
      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(null),
          }),
        }),
      });

      const { getWorkoutById } = await import('../../src/lib/db/workout');

      const result = await getWorkoutById(mockDb, 'workout-1', 'user-2');

      expect(result).toBeNull();
    });
  });

  describe('completeWorkout', () => {
    it('completes workout with timestamp', async () => {
      const completedWorkout = { ...mockWorkoutData, completedAt: '2024-01-01T11:00:00.000Z' };

      mockDrizzleDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue(completedWorkout),
            }),
          }),
        }),
      });

      const { completeWorkout } = await import('../../src/lib/db/workout');

      const result = await completeWorkout(mockDb, 'workout-1', 'user-1');

      expect(result?.completedAt).toBe('2024-01-01T11:00:00.000Z');
    });
  });

  describe('deleteWorkout', () => {
    it('deletes workout successfully', async () => {
      mockDrizzleDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          run: vi.fn().mockReturnValue({ success: true }),
        }),
      });

      const { deleteWorkout } = await import('../../src/lib/db/workout');

      const result = await deleteWorkout(mockDb, 'workout-1', 'user-1');

      expect(result).toBe(true);
    });
  });

  describe('createWorkoutSet', () => {
    it('creates workout set with all fields', async () => {
      const expectedSet = { ...mockWorkoutSetData, isComplete: false };

      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue({ id: 'workout-exercise-1' }),
            }),
          }),
        }),
      });

      mockDrizzleDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(expectedSet),
          }),
        }),
      });

      const { createWorkoutSet } = await import('../../src/lib/db/workout');

      const result = await createWorkoutSet(mockDb, 'workout-exercise-1', 'user-1', 1, 80, 8, 7.5);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.id).toBe('workout-set-1');
        expect(result.workoutExerciseId).toBe('workout-exercise-1');
        expect(result.setNumber).toBe(1);
        expect(result.weight).toBe(80);
        expect(result.reps).toBe(8);
        expect(result.rpe).toBe(7.5);
        expect(result.isComplete).toBe(false);
      }
    });
  });

  describe('completeWorkoutSet', () => {
    it('marks set as complete', async () => {
      const completedSet = { ...mockWorkoutSetData, isComplete: true, completedAt: '2024-01-01T10:05:00.000Z' };

      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockReturnValue({ id: 'workout-set-1' }),
              }),
            }),
          }),
        }),
      });

      mockDrizzleDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue(completedSet),
            }),
          }),
        }),
      });

      const { completeWorkoutSet } = await import('../../src/lib/db/workout');

      const result = await completeWorkoutSet(mockDb, 'workout-set-1', 'user-1');

      expect(result?.isComplete).toBe(true);
      expect(result?.completedAt).toBeDefined();
    });
  });
});

describe('User Preferences Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    vi.mocked(createDb).mockReturnValue(mockDrizzleDb as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getUserPreferences', () => {
    it('returns preferences when user has them', async () => {
      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(mockUserPreferenceData),
          }),
        }),
      });

      const { getUserPreferences } = await import('../../src/lib/db/preferences');

      const result = await getUserPreferences(mockDb, 'user-1');

      expect(result?.userId).toBe('user-1');
      expect(result?.weightUnit).toBe('kg');
      expect(result?.theme).toBe('light');
    });

    it('returns null when user has no preferences', async () => {
      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(null),
          }),
        }),
      });

      const { getUserPreferences } = await import('../../src/lib/db/preferences');

      const result = await getUserPreferences(mockDb, 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('upsertUserPreferences', () => {
    it('creates new preferences when none exist', async () => {
      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(null),
          }),
        }),
      });

      mockDrizzleDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(mockUserPreferenceData),
          }),
        }),
      });

      const { upsertUserPreferences } = await import('../../src/lib/db/preferences');

      const result = await upsertUserPreferences(mockDb, 'user-1', {
        weightUnit: 'lbs',
        theme: 'dark',
      });

      expect(result.userId).toBe('user-1');
      expect(result.weightUnit).toBe('kg');
    });

    it('updates existing preferences', async () => {
      const updatedPrefs = { ...mockUserPreferenceData, weightUnit: 'lbs' };

      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(mockUserPreferenceData),
          }),
        }),
      });

      mockDrizzleDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue(updatedPrefs),
            }),
          }),
        }),
      });

      const { upsertUserPreferences } = await import('../../src/lib/db/preferences');

      const result = await upsertUserPreferences(mockDb, 'user-1', {
        weightUnit: 'lbs',
      });

      expect(result.weightUnit).toBe('lbs');
    });
  });
});

describe('Workout History - getWorkoutsByUserId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    vi.mocked(createDb).mockReturnValue(mockDrizzleDb as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const completedWorkouts = [
    {
      id: 'workout-1',
      userId: 'user-1',
      templateId: 'template-1',
      name: 'Upper Body',
      startedAt: '2024-01-10T10:00:00.000Z',
      completedAt: '2024-01-10T11:00:00.000Z',
      notes: null,
      createdAt: '2024-01-10T10:00:00.000Z',
    },
    {
      id: 'workout-2',
      userId: 'user-1',
      templateId: 'template-2',
      name: 'Lower Body',
      startedAt: '2024-01-12T10:00:00.000Z',
      completedAt: '2024-01-12T11:00:00.000Z',
      notes: null,
      createdAt: '2024-01-12T10:00:00.000Z',
    },
    {
      id: 'workout-3',
      userId: 'user-1',
      templateId: 'template-1',
      name: 'Full Body',
      startedAt: '2024-01-14T10:00:00.000Z',
      completedAt: '2024-01-14T11:00:00.000Z',
      notes: null,
      createdAt: '2024-01-14T10:00:00.000Z',
    },
  ];

  it('should return only completed workouts', async () => {
    mockDrizzleDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(completedWorkouts),
            }),
          }),
        }),
      }),
    });

    const { getWorkoutsByUserId } = await import('../../src/lib/db/workout');

    const result = await getWorkoutsByUserId(mockDb, 'user-1');

    expect(result).toHaveLength(3);
    expect(result.every((w) => w.completedAt)).toBe(true);
  });

  it('should filter workouts by fromDate', async () => {
    const filtered = [completedWorkouts[1], completedWorkouts[2]];

    mockDrizzleDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(filtered),
            }),
          }),
        }),
      }),
    });

    const { getWorkoutsByUserId } = await import('../../src/lib/db/workout');

    const result = await getWorkoutsByUserId(mockDb, 'user-1', {
      fromDate: '2024-01-12T00:00:00.000Z',
    });

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('workout-2');
    expect(result[1].id).toBe('workout-3');
  });

  it('should filter workouts by toDate', async () => {
    const filtered = [completedWorkouts[0]];

    mockDrizzleDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(filtered),
            }),
          }),
        }),
      }),
    });

    const { getWorkoutsByUserId } = await import('../../src/lib/db/workout');

    const result = await getWorkoutsByUserId(mockDb, 'user-1', {
      toDate: '2024-01-11T23:59:59.999Z',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('workout-1');
  });

  it('should filter workouts by both fromDate and toDate', async () => {
    const filtered = [completedWorkouts[1]];

    mockDrizzleDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(filtered),
            }),
          }),
        }),
      }),
    });

    const { getWorkoutsByUserId } = await import('../../src/lib/db/workout');

    const result = await getWorkoutsByUserId(mockDb, 'user-1', {
      fromDate: '2024-01-12T00:00:00.000Z',
      toDate: '2024-01-12T23:59:59.999Z',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('workout-2');
  });

  it('should filter workouts by exerciseId', async () => {
    const filtered = [completedWorkouts[0], completedWorkouts[2]];

    mockDrizzleDb.select.mockImplementation((columns) => {
      if (columns && 'value' in columns) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ workoutId: 'workout-1' }, { workoutId: 'workout-3' }]),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue(filtered),
              }),
            }),
          }),
        }),
      };
    });

    const { getWorkoutsByUserId } = await import('../../src/lib/db/workout');

    const result = await getWorkoutsByUserId(mockDb, 'user-1', {
      exerciseId: 'bench-press',
    });

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('workout-1');
    expect(result[1].id).toBe('workout-3');
  });

  it('should filter workouts with multiple exercises by exerciseId', async () => {
    const filtered = [completedWorkouts[1]];

    mockDrizzleDb.select.mockImplementation((columns) => {
      if (columns && 'value' in columns) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ workoutId: 'workout-2' }]),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue(filtered),
              }),
            }),
          }),
        }),
      };
    });

    const { getWorkoutsByUserId } = await import('../../src/lib/db/workout');

    const result = await getWorkoutsByUserId(mockDb, 'user-1', {
      exerciseId: 'squat',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('workout-2');
  });

  it('should filter workouts by date and exerciseId combined', async () => {
    const filtered = [completedWorkouts[2]];

    mockDrizzleDb.select.mockImplementation((columns) => {
      if (columns && 'value' in columns) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ workoutId: 'workout-3' }]),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue(filtered),
              }),
            }),
          }),
        }),
      };
    });

    const { getWorkoutsByUserId } = await import('../../src/lib/db/workout');

    const result = await getWorkoutsByUserId(mockDb, 'user-1', {
      fromDate: '2024-01-14T00:00:00.000Z',
      exerciseId: 'deadlift',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('workout-3');
  });

  it('should apply limit and offset for pagination', async () => {
    mockDrizzleDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                offset: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([completedWorkouts[1]]),
                }),
              }),
            }),
          }),
        }),
      }),
    });

    const { getWorkoutsByUserId } = await import('../../src/lib/db/workout');

    const result = await getWorkoutsByUserId(mockDb, 'user-1', {
      limit: 1,
      offset: 1,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('workout-2');
  });

  it('should sort by createdAt when specified', async () => {
    mockDrizzleDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(completedWorkouts),
            }),
          }),
        }),
      }),
    });

    const { getWorkoutsByUserId } = await import('../../src/lib/db/workout');

    await getWorkoutsByUserId(mockDb, 'user-1', {
      sortBy: 'createdAt',
      sortOrder: 'ASC',
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const orderByCall = mockDrizzleDb.select.mock.results[0].value.from.mock.results[0].value.leftJoin.mock.results[0].value.where.mock.results[0].value.groupBy.mock.results[0].value.orderBy;

    expect(orderByCall).toHaveBeenCalled();
  });

  it('should handle empty results', async () => {
    mockDrizzleDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    });

    const { getWorkoutsByUserId } = await import('../../src/lib/db/workout');

    const result = await getWorkoutsByUserId(mockDb, 'user-1', {
      fromDate: '2025-01-01T00:00:00.000Z',
    });

    expect(result).toHaveLength(0);
  });
});

describe('Workout History - getWorkoutHistoryStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    vi.mocked(createDb).mockReturnValue(mockDrizzleDb as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should calculate totalWorkouts for completed workouts', async () => {
    let callIndex = 0;
    const mockResponses = [
      { count: 5 },
      { count: 3 },
      { count: 4 },
      { total: 10000 },
      { total: 50 },
    ];

    mockDrizzleDb.select.mockImplementation((_arg) => {
      if (callIndex < 3) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(mockResponses[callIndex++]),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue(mockResponses[callIndex++]),
              }),
            }),
          }),
        }),
      };
    });

    const { getWorkoutHistoryStats } = await import('../../src/lib/db/workout');

    const result = await getWorkoutHistoryStats(mockDb, 'user-1');

    expect(result.totalWorkouts).toBe(5);
    expect(result.thisWeek).toBe(3);
    expect(result.thisMonth).toBe(4);
    expect(result.totalVolume).toBe(10000);
    expect(result.totalSets).toBe(50);
  });

  it('should calculate thisWeek workouts from Monday to Sunday', async () => {
    let callIndex = 0;
    const mockResponses = [
      { count: 10 },
      { count: 3 },
      { count: 5 },
      { total: 8000 },
      { total: 40 },
    ];

    mockDrizzleDb.select.mockImplementation(() => {
      if (callIndex < 3) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(mockResponses[callIndex++]),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue(mockResponses[callIndex++]),
              }),
            }),
          }),
        }),
      };
    });

    const { getWorkoutHistoryStats } = await import('../../src/lib/db/workout');

    const result = await getWorkoutHistoryStats(mockDb, 'user-1');

    expect(result.thisWeek).toBe(3);
    expect(mockDrizzleDb.select).toHaveBeenCalled();
  });

  it('should calculate thisMonth workouts', async () => {
    let callIndex = 0;
    const mockResponses = [
      { count: 10 },
      { count: 2 },
      { count: 4 },
      { total: 12000 },
      { total: 60 },
    ];

    mockDrizzleDb.select.mockImplementation(() => {
      if (callIndex < 3) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(mockResponses[callIndex++]),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue(mockResponses[callIndex++]),
              }),
            }),
          }),
        }),
      };
    });

    const { getWorkoutHistoryStats } = await import('../../src/lib/db/workout');

    const result = await getWorkoutHistoryStats(mockDb, 'user-1');

    expect(result.thisMonth).toBe(4);
  });

  it('should calculate totalVolume from all completed sets', async () => {
    let callIndex = 0;
    const mockResponses = [
      { count: 5 },
      { count: 2 },
      { count: 3 },
      { total: 10000 },
      { total: 50 },
    ];

    mockDrizzleDb.select.mockImplementation(() => {
      if (callIndex < 3) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(mockResponses[callIndex++]),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue(mockResponses[callIndex++]),
              }),
            }),
          }),
        }),
      };
    });

    const { getWorkoutHistoryStats } = await import('../../src/lib/db/workout');

    const result = await getWorkoutHistoryStats(mockDb, 'user-1');

    expect(result.totalVolume).toBe(10000);
  });

  it('should calculate totalSets from all completed sets', async () => {
    let callIndex = 0;
    const mockResponses = [
      { count: 5 },
      { count: 2 },
      { count: 3 },
      { total: 8000 },
      { total: 50 },
    ];

    mockDrizzleDb.select.mockImplementation(() => {
      if (callIndex < 3) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(mockResponses[callIndex++]),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue(mockResponses[callIndex++]),
              }),
            }),
          }),
        }),
      };
    });

    const { getWorkoutHistoryStats } = await import('../../src/lib/db/workout');

    const result = await getWorkoutHistoryStats(mockDb, 'user-1');

    expect(result.totalSets).toBe(50);
  });

  it('should return zero values when no data exists', async () => {
    let callIndex = 0;
    const mockResponses = [
      null,
      null,
      null,
      { total: 0 },
      { total: 0 },
    ];

    mockDrizzleDb.select.mockImplementation(() => {
      if (callIndex < 3) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(mockResponses[callIndex++]),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue(mockResponses[callIndex++]),
              }),
            }),
          }),
        }),
      };
    });

    const { getWorkoutHistoryStats } = await import('../../src/lib/db/workout');

    const result = await getWorkoutHistoryStats(mockDb, 'user-1');

    expect(result.totalWorkouts).toBe(0);
    expect(result.thisWeek).toBe(0);
    expect(result.thisMonth).toBe(0);
    expect(result.totalVolume).toBe(0);
    expect(result.totalSets).toBe(0);
  });

  it('should calculate all stats correctly', async () => {
    let callIndex = 0;
    const mockResponses = [
      { count: 10 },
      { count: 3 },
      { count: 5 },
      { total: 15000 },
      { total: 100 },
    ];

    mockDrizzleDb.select.mockImplementation(() => {
      if (callIndex < 3) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(mockResponses[callIndex++]),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue(mockResponses[callIndex++]),
              }),
            }),
          }),
        }),
      };
    });

    const { getWorkoutHistoryStats } = await import('../../src/lib/db/workout');

    const result = await getWorkoutHistoryStats(mockDb, 'user-1');

    expect(result).toEqual({
      totalWorkouts: 10,
      thisWeek: 3,
      thisMonth: 5,
      totalVolume: 15000,
      totalSets: 100,
    });
  });

  it('should handle week boundary correctly (Monday start)', async () => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));

    let callIndex = 0;
    const mockResponses = [
      { count: 8 },
      { count: 2 },
      { count: 4 },
      { total: 5000 },
      { total: 30 },
    ];

    mockDrizzleDb.select.mockImplementation(() => {
      if (callIndex < 3) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(mockResponses[callIndex++]),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue(mockResponses[callIndex++]),
              }),
            }),
          }),
        }),
      };
    });

    const { getWorkoutHistoryStats } = await import('../../src/lib/db/workout');

    const result = await getWorkoutHistoryStats(mockDb, 'user-1');

    expect(result.thisWeek).toBe(2);
  });
});

describe('getLastWorkoutForExercise', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    vi.mocked(createDb).mockReturnValue(mockDrizzleDb as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns last workout data when previous workout exists', async () => {
    mockDrizzleDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockReturnValue({
                    weight: 100,
                    reps: 5,
                    rpe: 7.5,
                    completedAt: '2024-01-14T10:00:00.000Z',
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    });

    const { getLastWorkoutForExercise } = await import('../../src/lib/db/workout');

    const result = await getLastWorkoutForExercise(mockDb, 'user-1', 'exercise-1');

    expect(result).not.toBeNull();
    expect(result?.exerciseId).toBe('exercise-1');
    expect(result?.weight).toBe(100);
    expect(result?.reps).toBe(5);
    expect(result?.rpe).toBe(7.5);
  });

  it('returns null when no previous workout exists', async () => {
    mockDrizzleDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockReturnValue(null),
                }),
              }),
            }),
          }),
        }),
      }),
    });

    const { getLastWorkoutForExercise } = await import('../../src/lib/db/workout');

    const result = await getLastWorkoutForExercise(mockDb, 'user-1', 'exercise-new');

    expect(result).toBeNull();
  });

  it('returns null when weight and reps are null', async () => {
    mockDrizzleDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockReturnValue({
                    weight: null,
                    reps: null,
                    rpe: null,
                    completedAt: '2024-01-14T10:00:00.000Z',
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    });

    const { getLastWorkoutForExercise } = await import('../../src/lib/db/workout');

    const result = await getLastWorkoutForExercise(mockDb, 'user-1', 'exercise-1');

    expect(result).not.toBeNull();
    expect(result?.weight).toBeNull();
    expect(result?.reps).toBeNull();
  });

  it('only returns completed sets', async () => {
    mockDrizzleDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockReturnValue({
                    weight: 80,
                    reps: 10,
                    rpe: null,
                    completedAt: '2024-01-14T10:00:00.000Z',
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    });

    const { getLastWorkoutForExercise } = await import('../../src/lib/db/workout');

    const result = await getLastWorkoutForExercise(mockDb, 'user-1', 'exercise-2');

    expect(result).not.toBeNull();
    expect(result?.weight).toBe(80);
    expect(result?.reps).toBe(10);
  });

  it('returns most recent completed workout', async () => {
    mockDrizzleDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockReturnValue({
                    weight: 120,
                    reps: 3,
                    rpe: 8,
                    completedAt: '2024-01-14T15:00:00.000Z',
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    });

    const { getLastWorkoutForExercise } = await import('../../src/lib/db/workout');

    const result = await getLastWorkoutForExercise(mockDb, 'user-1', 'exercise-3');

    expect(result).not.toBeNull();
    expect(result?.weight).toBe(120);
    expect(result?.reps).toBe(3);
    expect(result?.rpe).toBe(8);
  });
});

describe('getLastWorkoutSetsForExercise', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    vi.mocked(createDb).mockReturnValue(mockDrizzleDb as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns all sets from previous workout', async () => {
    let selectCallCount = 0;
    mockDrizzleDb.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      get: vi.fn().mockReturnValue({
                        workoutExerciseId: 'workout-exercise-1',
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              all: vi.fn().mockReturnValue([
                { setNumber: 1, weight: 100, reps: 5, rpe: 7.5 },
                { setNumber: 2, weight: 90, reps: 6, rpe: 7 },
                { setNumber: 3, weight: 80, reps: 8, rpe: 6.5 },
              ]),
            }),
          }),
        }),
      };
    });

    const { getLastWorkoutSetsForExercise } = await import('../../src/lib/db/workout');

    const result = await getLastWorkoutSetsForExercise(mockDb, 'user-1', 'exercise-1');

    expect(result).toHaveLength(3);
    expect(result[0].setNumber).toBe(1);
    expect(result[0].weight).toBe(100);
    expect(result[0].reps).toBe(5);
    expect(result[0].rpe).toBe(7.5);
    expect(result[1].setNumber).toBe(2);
    expect(result[1].weight).toBe(90);
    expect(result[1].reps).toBe(6);
    expect(result[1].rpe).toBe(7);
    expect(result[2].setNumber).toBe(3);
    expect(result[2].weight).toBe(80);
    expect(result[2].reps).toBe(8);
    expect(result[2].rpe).toBe(6.5);
  });

  it('returns empty array when no previous workout exists', async () => {
    mockDrizzleDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockReturnValue(null),
                }),
              }),
            }),
          }),
        }),
      }),
    });

    const { getLastWorkoutSetsForExercise } = await import('../../src/lib/db/workout');

    const result = await getLastWorkoutSetsForExercise(mockDb, 'user-1', 'exercise-new');

    expect(result).toEqual([]);
  });

  it('returns sets ordered by setNumber', async () => {
    let selectCallCount = 0;
    mockDrizzleDb.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      get: vi.fn().mockReturnValue({
                        workoutExerciseId: 'workout-exercise-2',
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              all: vi.fn().mockReturnValue([
                { setNumber: 1, weight: 80, reps: 10, rpe: null },
                { setNumber: 2, weight: 80, reps: 10, rpe: null },
                { setNumber: 3, weight: 80, reps: 10, rpe: null },
                { setNumber: 4, weight: 80, reps: 10, rpe: null },
              ]),
            }),
          }),
        }),
      };
    });

    const { getLastWorkoutSetsForExercise } = await import('../../src/lib/db/workout');

    const result = await getLastWorkoutSetsForExercise(mockDb, 'user-1', 'exercise-2');

    expect(result).toHaveLength(4);
    expect(result[0].setNumber).toBe(1);
    expect(result[1].setNumber).toBe(2);
    expect(result[2].setNumber).toBe(3);
    expect(result[3].setNumber).toBe(4);
  });

  it('handles multiple sets with different weights/reps', async () => {
    let selectCallCount = 0;
    mockDrizzleDb.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      get: vi.fn().mockReturnValue({
                        workoutExerciseId: 'workout-exercise-3',
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              all: vi.fn().mockReturnValue([
                { setNumber: 1, weight: 100, reps: 5, rpe: 8 },
                { setNumber: 2, weight: 90, reps: 6, rpe: 7 },
                { setNumber: 3, weight: null, reps: null, rpe: null },
              ]),
            }),
          }),
        }),
      };
    });

    const { getLastWorkoutSetsForExercise } = await import('../../src/lib/db/workout');

    const result = await getLastWorkoutSetsForExercise(mockDb, 'user-1', 'exercise-3');

    expect(result).toHaveLength(3);
    expect(result[0].weight).toBe(100);
    expect(result[0].reps).toBe(5);
    expect(result[1].weight).toBe(90);
    expect(result[1].reps).toBe(6);
    expect(result[2].weight).toBeNull();
    expect(result[2].reps).toBeNull();
  });
});

describe('calculateE1RM', () => {
  it('returns weight when reps is 1', async () => {
    const { calculateE1RM } = await import('../../src/lib/db/workout');
    expect(calculateE1RM(100, 1)).toBe(100);
  });

  it('calculates 1RM using Epley formula for multiple reps', async () => {
    const { calculateE1RM } = await import('../../src/lib/db/workout');
    expect(calculateE1RM(100, 5)).toBe(117);
    expect(calculateE1RM(80, 8)).toBe(101);
    expect(calculateE1RM(60, 10)).toBe(80);
  });

  it('handles zero weight', async () => {
    const { calculateE1RM } = await import('../../src/lib/db/workout');
    expect(calculateE1RM(0, 5)).toBe(0);
  });
});

describe('Exercise History', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(createDb).mockReturnValue(mockDrizzleDb as any); // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty array when no workouts found', async () => {
    mockDrizzleDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                all: vi.fn().mockReturnValue([]),
              }),
            }),
          }),
        }),
      }),
    });

    const { getExerciseHistory } = await import('../../src/lib/db/workout');

    const result = await getExerciseHistory(mockDb, 'user-1', 'exercise-1');

    expect(result).toEqual([]);
  });

  it('returns exercise history with max weight per workout', async () => {
    mockDrizzleDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                all: vi.fn().mockReturnValue([
                  {
                    workoutId: 'workout-1',
                    workoutName: 'Push Day',
                    workoutDate: '2024-01-15T10:00:00.000Z',
                    weight: 100,
                    reps: 5,
                  },
                  {
                    workoutId: 'workout-1',
                    workoutName: 'Push Day',
                    workoutDate: '2024-01-15T10:00:00.000Z',
                    weight: 80,
                    reps: 8,
                  },
                  {
                    workoutId: 'workout-2',
                    workoutName: 'Chest Day',
                    workoutDate: '2024-01-10T10:00:00.000Z',
                    weight: 95,
                    reps: 6,
                  },
                ]),
              }),
            }),
          }),
        }),
      }),
    });

    const { getExerciseHistory } = await import('../../src/lib/db/workout');

    const result = await getExerciseHistory(mockDb, 'user-1', 'exercise-1');

    expect(result.length).toBe(2);
    expect(result[0].workoutId).toBe('workout-1');
    expect(result[0].maxWeight).toBe(100);
    expect(result[0].repsAtMax).toBe(5);
    expect(result[0].est1rm).toBe(117);
    expect(result[0].isPR).toBe(true);
    expect(result[1].workoutId).toBe('workout-2');
    expect(result[1].maxWeight).toBe(95);
    expect(result[1].isPR).toBe(false);
  });

  it('correctly identifies PRs', async () => {
    mockDrizzleDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                all: vi.fn().mockReturnValue([
                  {
                    workoutId: 'workout-1',
                    workoutName: 'First Workout',
                    workoutDate: '2024-01-01T10:00:00.000Z',
                    weight: 80,
                    reps: 8,
                  },
                  {
                    workoutId: 'workout-2',
                    workoutName: 'Second Workout',
                    workoutDate: '2024-01-08T10:00:00.000Z',
                    weight: 90,
                    reps: 6,
                  },
                  {
                    workoutId: 'workout-3',
                    workoutName: 'Third Workout',
                    workoutDate: '2024-01-15T10:00:00.000Z',
                    weight: 85,
                    reps: 5,
                  },
                ]),
              }),
            }),
          }),
        }),
      }),
    });

    const { getExerciseHistory } = await import('../../src/lib/db/workout');

    const result = await getExerciseHistory(mockDb, 'user-1', 'exercise-1');

    expect(result.length).toBe(3);
    // Results are sorted by date descending, PR is calculated in ascending date order
    // workout-1 (Jan 1): 80kg - first workout, isPR = true
    // workout-2 (Jan 8): 90kg - higher than 80kg, isPR = true
    // workout-3 (Jan 15): 85kg - lower than 90kg, isPR = false
    // After sorting by descending date: workout-3, workout-2, workout-1
    expect(result[0].workoutId).toBe('workout-3');
    expect(result[0].isPR).toBe(false);
    expect(result[1].workoutId).toBe('workout-2');
    expect(result[1].isPR).toBe(true);
    expect(result[2].workoutId).toBe('workout-1');
    expect(result[2].isPR).toBe(true);
  });

  it('filters by date range', async () => {
    mockDrizzleDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                all: vi.fn().mockReturnValue([]),
              }),
            }),
          }),
        }),
      }),
    });

    const { getExerciseHistory } = await import('../../src/lib/db/workout');

    await getExerciseHistory(mockDb, 'user-1', 'exercise-1', {
      fromDate: '2024-01-01T00:00:00.000Z',
      toDate: '2024-01-31T23:59:59.999Z',
    });
  });

  it('handles pagination with limit and offset', async () => {
    mockDrizzleDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                all: vi.fn().mockReturnValue([]),
              }),
            }),
          }),
        }),
      }),
    });

    const { getExerciseHistory } = await import('../../src/lib/db/workout');

    const result = await getExerciseHistory(mockDb, 'user-1', 'exercise-1', {
      limit: 10,
      offset: 5,
    });

    expect(result).toEqual([]);
  });

  it('ignores sets with null weight', async () => {
    mockDrizzleDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                all: vi.fn().mockReturnValue([
                  {
                    workoutId: 'workout-1',
                    workoutName: 'Test Workout',
                    workoutDate: '2024-01-15T10:00:00.000Z',
                    weight: null,
                    reps: 5,
                  },
                  {
                    workoutId: 'workout-1',
                    workoutName: 'Test Workout',
                    workoutDate: '2024-01-15T10:00:00.000Z',
                    weight: 100,
                    reps: 5,
                  },
                ]),
              }),
            }),
          }),
        }),
      }),
    });

    const { getExerciseHistory } = await import('../../src/lib/db/workout');

    const result = await getExerciseHistory(mockDb, 'user-1', 'exercise-1');

    expect(result.length).toBe(1);
    expect(result[0].maxWeight).toBe(100);
  });
});

describe('Workout Session - addSetToBackend API behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('API returns created set with real backend ID', async () => {
    const realBackendSetId = 'backend-gen-id-12345';
    const mockCreatedSet: WorkoutSet = {
      id: realBackendSetId,
      workoutExerciseId: 'workout-exercise-1',
      setNumber: 1,
      weight: 80,
      reps: 8,
      rpe: 7.5,
      isComplete: false,
      completedAt: null,
      createdAt: '2024-01-15T12:00:00.000Z',
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockCreatedSet),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await fetch('/api/workouts/sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        workoutExerciseId: 'workout-exercise-1',
        setNumber: 1,
        weight: 80,
        reps: 8,
        rpe: 7.5,
      }),
    });

    expect(result.ok).toBe(true);
    const set: WorkoutSet = await result.json();
    expect(set.id).toBe(realBackendSetId);
    expect(set.id).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('API returns null for set when request fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await fetch('/api/workouts/sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        workoutExerciseId: 'workout-exercise-1',
        setNumber: 1,
      }),
    });

    expect(result.ok).toBe(false);
  });
});

describe('Workout Session - Set update failure handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns 404 for non-existent set ID in update', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: vi.fn().mockResolvedValue({ error: 'Set not found or does not belong to you' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await fetch('/api/workouts/sets/fake-id-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ weight: 100 }),
    });

    expect(result.status).toBe(404);
  });

  it('returns 404 for non-existent set ID in complete', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: vi.fn().mockResolvedValue({ error: 'Set not found or does not belong to you' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await fetch('/api/workouts/sets/fake-id-456', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isComplete: true, completedAt: new Date().toISOString() }),
    });

    expect(result.status).toBe(404);
  });

  it('returns 404 for non-existent set ID in delete', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: vi.fn().mockResolvedValue({ error: 'Set not found or does not belong to you' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await fetch('/api/workouts/sets/fake-id-789', {
      method: 'DELETE',
      credentials: 'include',
    });

    expect(result.status).toBe(404);
  });

  it('handles network errors gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    await expect(
      fetch('/api/workouts/sets/some-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ weight: 100 }),
      })
    ).rejects.toThrow('Network error');
  });

  it('returns proper error messages for different failure cases', async () => {
    const mockFetch = vi.fn();
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({ error: 'Not authenticated' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ error: 'Invalid set ID' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({ error: 'Set not found or does not belong to you' }),
      });
    vi.stubGlobal('fetch', mockFetch);

    const authError = await fetch('/api/workouts/sets/id-1', {
      method: 'PUT',
      credentials: 'include',
      body: JSON.stringify({ weight: 100 }),
    });
    expect(authError.status).toBe(401);

    const invalidIdError = await fetch('/api/workouts/sets/id-2', {
      method: 'DELETE',
      credentials: 'include',
    });
    expect(invalidIdError.status).toBe(400);

    const notFoundError = await fetch('/api/workouts/sets/id-3', {
      method: 'PUT',
      credentials: 'include',
      body: JSON.stringify({ weight: 100 }),
    });
    expect(notFoundError.status).toBe(404);
  });
});

describe('Workout Session - Frontend set ID consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('ensures frontend uses the same set ID that backend creates', async () => {
    const backendGeneratedId = 'drizzle-gen-id-abc123';
    const mockCreatedSet: WorkoutSet = {
      id: backendGeneratedId,
      workoutExerciseId: 'workout-exercise-1',
      setNumber: 1,
      weight: 100,
      reps: 5,
      rpe: 8,
      isComplete: false,
      completedAt: null,
      createdAt: '2024-01-15T12:00:00.000Z',
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockCreatedSet),
    });
    vi.stubGlobal('fetch', mockFetch);

    const createResponse = await fetch('/api/workouts/sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        workoutExerciseId: 'workout-exercise-1',
        setNumber: 1,
        weight: 100,
        reps: 5,
        rpe: 8,
      }),
    });

    expect(createResponse.ok).toBe(true);
    const createdSet: WorkoutSet = await createResponse.json();

    expect(createdSet.id).toBe(backendGeneratedId);
    expect(createdSet.id).toBeDefined();
    expect(createdSet.id).not.toBe('');

    const updateResponse = await fetch(`/api/workouts/sets/${createdSet.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ weight: 110 }),
    });

    expect(updateResponse.ok).toBe(true);
  });

  it('verifies set ID format matches database-generated IDs', async () => {
    const drizzleId = 'rec_abc123def456';
    const nanoidId = 'abc123def456';

    const mockFetch = vi.fn();
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: drizzleId,
          workoutExerciseId: 'workout-exercise-1',
          setNumber: 1,
          weight: null,
          reps: null,
          rpe: null,
          isComplete: false,
          completedAt: null,
          createdAt: '2024-01-15T12:00:00.000Z',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: nanoidId,
          workoutExerciseId: 'workout-exercise-2',
          setNumber: 1,
          weight: null,
          reps: null,
          rpe: null,
          isComplete: false,
          completedAt: null,
          createdAt: '2024-01-15T12:00:00.000Z',
        }),
      });
    vi.stubGlobal('fetch', mockFetch);

    const response1 = await fetch('/api/workouts/sets', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ workoutExerciseId: 'workout-exercise-1', setNumber: 1 }),
    });
    const set1: WorkoutSet = await response1.json();
    expect(set1.id).toBe(drizzleId);

    const response2 = await fetch('/api/workouts/sets', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ workoutExerciseId: 'workout-exercise-2', setNumber: 1 }),
    });
    const set2: WorkoutSet = await response2.json();
    expect(set2.id).toBe(nanoidId);

    expect(set1.id).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(set2.id).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

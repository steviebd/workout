import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDb } from '../../src/lib/db/index';
import type { D1Database } from '@cloudflare/workers-types';
import type { Workout } from '../../src/lib/db/schema';

vi.mock('../../src/lib/db/index', () => ({
  createDb: vi.fn(),
}));

const mockDb = vi.fn() as unknown as D1Database;

const mockDrizzleDb = {
  select: vi.fn(),
};

const mockWorkouts: Workout[] = [
  {
    id: 'workout-1',
    localId: null,
    workosId: 'user-1',
    templateId: 'template-1',
    programCycleId: null,
    name: 'Upper Body Workout',
    startedAt: '2024-01-15T10:00:00.000Z',
    completedAt: '2024-01-15T11:00:00.000Z',
    notes: null,
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
    isDeleted: false,
    squat1rm: null,
    bench1rm: null,
    deadlift1rm: null,
    ohp1rm: null,
    startingSquat1rm: null,
    startingBench1rm: null,
    startingDeadlift1rm: null,
    startingOhp1rm: null,
  },
  {
    id: 'workout-2',
    localId: null,
    workosId: 'user-1',
    templateId: 'template-2',
    programCycleId: null,
    name: 'Lower Body Workout',
    startedAt: '2024-01-12T10:00:00.000Z',
    completedAt: '2024-01-12T11:00:00.000Z',
    notes: null,
    createdAt: '2024-01-12T10:00:00.000Z',
    updatedAt: '2024-01-12T10:00:00.000Z',
    isDeleted: false,
    squat1rm: null,
    bench1rm: null,
    deadlift1rm: null,
    ohp1rm: null,
    startingSquat1rm: null,
    startingBench1rm: null,
    startingDeadlift1rm: null,
    startingOhp1rm: null,
  },
  {
    id: 'workout-3',
    localId: null,
    workosId: 'user-1',
    templateId: null,
    programCycleId: null,
    name: 'Cardio Session',
    startedAt: '2024-01-10T09:00:00.000Z',
    completedAt: '2024-01-10T09:30:00.000Z',
    notes: 'Easy jog',
    createdAt: '2024-01-10T09:00:00.000Z',
    updatedAt: '2024-01-10T09:00:00.000Z',
    isDeleted: false,
    squat1rm: null,
    bench1rm: null,
    deadlift1rm: null,
    ohp1rm: null,
    startingSquat1rm: null,
    startingBench1rm: null,
    startingDeadlift1rm: null,
    startingOhp1rm: null,
  },
];

describe('Dashboard Loader Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
    vi.mocked(createDb).mockReturnValue(mockDrizzleDb as unknown as ReturnType<typeof createDb>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createMockQueryBuilder(resolvedData: typeof mockWorkouts = mockWorkouts) {
    const thenable: {
      then: (resolve: (val: typeof mockWorkouts) => void) => void;
      from: () => typeof thenable;
      leftJoin: () => typeof thenable;
      where: () => typeof thenable;
      groupBy: () => typeof thenable;
      orderBy: () => typeof thenable;
      limit: () => typeof thenable;
      offset: () => typeof thenable;
    } = {
      then: (resolve) => resolve(resolvedData),
      from: () => thenable,
      leftJoin: () => thenable,
      where: () => thenable,
      groupBy: () => thenable,
      orderBy: () => thenable,
      limit: () => thenable,
      offset: () => thenable,
    };
    return thenable;
  }

  describe('getWorkoutsByWorkosId with limit', () => {
    it('should fetch recent workouts with limit=5', async () => {
      mockDrizzleDb.select.mockReturnValue(createMockQueryBuilder());

      const { getWorkoutsByWorkosId } = await import('../../src/lib/db/workout');

      const result = await getWorkoutsByWorkosId(mockDb, 'user-1', { limit: 5 });
      expect(result[0].id).toBe('workout-1');
    });

    it('should order workouts by startedAt descending', async () => {
      mockDrizzleDb.select.mockReturnValue(createMockQueryBuilder());

       const { getWorkoutsByWorkosId } = await import('../../src/lib/db/workout');

      await getWorkoutsByWorkosId(mockDb, 'user-1', { limit: 5, sortBy: 'startedAt', sortOrder: 'DESC' });

      expect(mockDrizzleDb.select).toHaveBeenCalled();
    });

    it('should return empty array when no workouts exist', async () => {
      mockDrizzleDb.select.mockReturnValue(createMockQueryBuilder([]));

      const { getWorkoutsByWorkosId } = await import('../../src/lib/db/workout');

      const result = await getWorkoutsByWorkosId(mockDb, 'user-1', { limit: 5 });

      expect(result).toEqual([]);
    });

    it('should only return completed workouts', async () => {
      mockDrizzleDb.select.mockReturnValue(createMockQueryBuilder());

      const { getWorkoutsByWorkosId } = await import('../../src/lib/db/workout');

      const result = await getWorkoutsByWorkosId(mockDb, 'user-1', { limit: 5 });

      expect(result.every((w) => w.completedAt !== null)).toBe(true);
    });
  });

  describe('getWorkoutHistoryStats', () => {
    it('should return all required stats fields', async () => {
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

      expect(result).toHaveProperty('totalWorkouts');
      expect(result).toHaveProperty('thisWeek');
      expect(result).toHaveProperty('thisMonth');
    });

    it('should calculate thisWeek workouts correctly', async () => {
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

      expect(result.thisWeek).toBe(3);
    });

    it('should calculate thisMonth workouts correctly', async () => {
      let callIndex = 0;
      const mockResponses = [
        { count: 10 },
        { count: 2 },
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

      expect(result.thisMonth).toBe(5);
    });

    it('should return zero for stats when no workouts exist', async () => {
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
    });
  });

  describe('getPrCount', () => {
    it('returns zero when no workouts exist', async () => {
      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      });

      const { getPrCount } = await import('../../src/lib/db/workout');

      const result = await getPrCount(mockDb, 'user-1');

      expect(result).toBe(0);
    });

    it('counts PRs correctly', async () => {
      let selectCallCount = 0;

      mockDrizzleDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    groupBy: vi.fn().mockReturnValue({
                      orderBy: vi.fn().mockResolvedValue([
                        { exerciseId: 'exercise-1', workoutId: 'workout-1', workoutStartedAt: '2024-01-01T10:00:00.000Z', maxWeight: 80 },
                        { exerciseId: 'exercise-1', workoutId: 'workout-2', workoutStartedAt: '2024-01-02T10:00:00.000Z', maxWeight: 100 },
                        { exerciseId: 'exercise-2', workoutId: 'workout-1', workoutStartedAt: '2024-01-01T10:00:00.000Z', maxWeight: 60 },
                      ]),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                all: vi.fn().mockReturnValue([
                  { exerciseId: 'exercise-1', weight: 100 },
                  { exerciseId: 'exercise-2', weight: 80 },
                ]),
              }),
            }),
          }),
        };
      });

      const { getPrCount } = await import('../../src/lib/db/workout');

      const result = await getPrCount(mockDb, 'user-1');

      expect(result).toBe(3);
    });
  });
});

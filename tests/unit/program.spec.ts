import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the entire db module
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

vi.mock('../../src/lib/db/index', () => ({
  getDb: vi.fn(() => ({
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
    delete: mockDelete,
  })),
}));

// Mock schema
vi.mock('../../src/lib/db/schema', () => ({
  userProgramCycles: {
    id: {} as any,
    workosId: {} as any,
    name: {} as any,
    startedAt: {} as any,
    isComplete: {} as any,
    totalSessionsPlanned: {} as any,
    totalSessionsCompleted: {} as any,
    currentWeek: {} as any,
    squat1rm: {} as any,
    bench1rm: {} as any,
    deadlift1rm: {} as any,
    ohp1rm: {} as any,
    startingSquat1rm: {} as any,
    startingBench1rm: {} as any,
    startingDeadlift1rm: {} as any,
    startingOhp1rm: {} as any,
    updatedAt: {} as any,
  },
  programCycleWorkouts: {
    id: {} as any,
    cycleId: {} as any,
    weekNumber: {} as any,
    sessionNumber: {} as any,
    isComplete: {} as any,
    workoutId: {} as any,
    scheduledDate: {} as any,
    scheduledTime: {} as any,
    updatedAt: {} as any,
  },
  workouts: {
    id: {} as any,
    workosId: {} as any,
    name: {} as any,
    squat1rm: {} as any,
    bench1rm: {} as any,
    deadlift1rm: {} as any,
    ohp1rm: {} as any,
    completedAt: {} as any,
  },
  and: (...args: any[]) => args,
  eq: (a: any, b: any) => ({ type: 'eq', a, b }),
  desc: (a: any) => ({ type: 'desc', a }),
  sql: (s: string) => ({ type: 'sql', s }),
  isNotNull: (a: any) => ({ type: 'isNotNull', a }),
}));

describe('Program Cycle 1RM Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateProgramCycle1RM', () => {
    it('should update 1RM values for a valid cycle', async () => {
      const { updateProgramCycle1RM } = await import('../../src/lib/db/program/one-rm');
      
      // Mock select returning existing cycle
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              id: 'cycle-1',
              workosId: 'user-1',
              squat1rm: null,
              bench1rm: null,
              deadlift1rm: null,
              ohp1rm: null,
            }),
          }),
        }),
      });

      // Mock update returning updated cycle
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                id: 'cycle-1',
                workosId: 'user-1',
                squat1rm: 100,
                bench1rm: 80,
                deadlift1rm: 120,
                ohp1rm: 60,
                startingSquat1rm: 100,
                startingBench1rm: 80,
                startingDeadlift1rm: 120,
                startingOhp1rm: 60,
              }),
            }),
          }),
        }),
      });

      const result = await updateProgramCycle1RM({} as any, 'cycle-1', 'user-1', {
        squat1rm: 100,
        bench1rm: 80,
        deadlift1rm: 120,
        ohp1rm: 60,
      });

      expect(result).not.toBeNull();
      expect(result?.squat1rm).toBe(100);
      expect(result?.startingSquat1rm).toBe(100);
    });

    it('should return null for non-existent cycle', async () => {
      const { updateProgramCycle1RM } = await import('../../src/lib/db/program/one-rm');
      
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(null),
          }),
        }),
      });

      const result = await updateProgramCycle1RM({} as any, 'invalid-cycle', 'user-1', {
        squat1rm: 100,
      });

      expect(result).toBeNull();
    });

    it('should preserve existing starting 1RM values when updating', async () => {
      const { updateProgramCycle1RM } = await import('../../src/lib/db/program/one-rm');
      
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              id: 'cycle-1',
              workosId: 'user-1',
              squat1rm: 110,
              bench1rm: null,
              deadlift1rm: null,
              ohp1rm: null,
              startingSquat1rm: 100,
              startingBench1rm: null,
              startingDeadlift1rm: null,
              startingOhp1rm: null,
            }),
          }),
        }),
      });

      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                id: 'cycle-1',
                workosId: 'user-1',
                squat1rm: 110,
                bench1rm: 85,
                startingSquat1rm: 100,
                startingBench1rm: null,
              }),
            }),
          }),
        }),
      });

      const result = await updateProgramCycle1RM({} as any, 'cycle-1', 'user-1', {
        bench1rm: 85,
      });

      expect(result?.startingSquat1rm).toBe(100);
      expect(result?.startingBench1rm).toBeNull();
    });
  });

  describe('getLatestOneRMs', () => {
    it('should return 1RMs from latest workout if available', async () => {
      const { getLatestOneRMs } = await import('../../src/lib/db/program/one-rm');
      
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({
                  squat1rm: 100,
                  bench1rm: 80,
                  deadlift1rm: 120,
                  ohp1rm: 60,
                  completedAt: '2024-01-15T10:00:00Z',
                }),
              }),
            }),
          }),
        }),
      });

      const result = await getLatestOneRMs({} as any, 'user-1');

      expect(result).not.toBeNull();
      expect(result?.squat1rm).toBe(100);
      expect(result?.bench1rm).toBe(80);
    });

    it('should fall back to cycle 1RMs if no workout 1RMs found', async () => {
      const { getLatestOneRMs } = await import('../../src/lib/db/program/one-rm');
      
      // First call: workout returns null
      // Second call: cycle returns data
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue(null),
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
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue({
                    squat1rm: 90,
                    bench1rm: 70,
                    deadlift1rm: 110,
                    ohp1rm: 55,
                    startedAt: '2024-01-01T00:00:00Z',
                  }),
                }),
              }),
            }),
          }),
        };
      });

      const result = await getLatestOneRMs({} as any, 'user-1');

      expect(result).not.toBeNull();
      expect(result?.squat1rm).toBe(90);
    });

    it('should return null if no 1RMs found anywhere', async () => {
      const { getLatestOneRMs } = await import('../../src/lib/db/program/one-rm');
      
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue(null),
              }),
            }),
          }),
        }),
      });

      const result = await getLatestOneRMs({} as any, 'user-1');

      expect(result).toBeNull();
    });
  });
});

describe('Program Cycle Scheduling Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCycleWorkouts', () => {
    it('should return workouts for valid cycle', async () => {
      const { getCycleWorkouts } = await import('../../src/lib/db/program/scheduling');
      
      // First select call for cycle
      // Second select call for workouts
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({ id: 'cycle-1' }),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                all: vi.fn().mockResolvedValue([
                  { id: 'w1', weekNumber: 1, sessionNumber: 1, isComplete: false },
                  { id: 'w2', weekNumber: 1, sessionNumber: 2, isComplete: true },
                ]),
              }),
            }),
          }),
        };
      });

      const result = await getCycleWorkouts({} as any, 'cycle-1', 'user-1');

      expect(result).toHaveLength(2);
      expect(result[0].weekNumber).toBe(1);
    });

    it('should return empty array for non-existent cycle', async () => {
      const { getCycleWorkouts } = await import('../../src/lib/db/program/scheduling');
      
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(null),
          }),
        }),
      });

      const result = await getCycleWorkouts({} as any, 'invalid-cycle', 'user-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getCurrentWorkout', () => {
    it('should return first incomplete workout', async () => {
      const { getCurrentWorkout } = await import('../../src/lib/db/program/scheduling');
      
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({ id: 'cycle-1', isComplete: false }),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({
                  id: 'w1',
                  weekNumber: 1,
                  sessionNumber: 1,
                  isComplete: false,
                }),
              }),
            }),
          }),
        };
      });

      const result = await getCurrentWorkout({} as any, 'cycle-1', 'user-1');

      expect(result).not.toBeNull();
      expect(result?.isComplete).toBe(false);
    });

    it('should return null if no incomplete workouts', async () => {
      const { getCurrentWorkout } = await import('../../src/lib/db/program/scheduling');
      
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({ id: 'cycle-1', isComplete: false }),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue(null),
              }),
            }),
          }),
        };
      });

      const result = await getCurrentWorkout({} as any, 'cycle-1', 'user-1');

      expect(result).toBeNull();
    });

    it('should return null for non-existent cycle', async () => {
      const { getCurrentWorkout } = await import('../../src/lib/db/program/scheduling');
      
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(null),
          }),
        }),
      });

      const result = await getCurrentWorkout({} as any, 'invalid-cycle', 'user-1');

      expect(result).toBeNull();
    });
  });
});

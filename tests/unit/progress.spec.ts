import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the db module
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
    currentWeek: {} as any,
    currentSession: {} as any,
    status: {} as any,
    isComplete: {} as any,
    completedAt: {} as any,
    updatedAt: {} as any,
  },
  eq: (a: any, b: any) => ({ type: 'eq', a, b }),
  and: (...args: any[]) => args,
}));

describe('Program Progress Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateProgramCycleProgress', () => {
    it('should update currentWeek', async () => {
      const { updateProgramCycleProgress } = await import('../../src/lib/db/program/progress');
      
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                id: 'cycle-1',
                workosId: 'user-1',
                currentWeek: 5,
                currentSession: 1,
              }),
            }),
          }),
        }),
      });

      const result = await updateProgramCycleProgress({} as any, 'cycle-1', 'user-1', {
        currentWeek: 5,
      });

      expect(result).not.toBeNull();
      expect(result?.currentWeek).toBe(5);
    });

    it('should update currentSession', async () => {
      const { updateProgramCycleProgress } = await import('../../src/lib/db/program/progress');
      
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                id: 'cycle-1',
                workosId: 'user-1',
                currentWeek: 3,
                currentSession: 2,
              }),
            }),
          }),
        }),
      });

      const result = await updateProgramCycleProgress({} as any, 'cycle-1', 'user-1', {
        currentSession: 2,
      });

      expect(result?.currentSession).toBe(2);
    });

    it('should update both currentWeek and currentSession', async () => {
      const { updateProgramCycleProgress } = await import('../../src/lib/db/program/progress');
      
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                id: 'cycle-1',
                workosId: 'user-1',
                currentWeek: 4,
                currentSession: 3,
              }),
            }),
          }),
        }),
      });

      const result = await updateProgramCycleProgress({} as any, 'cycle-1', 'user-1', {
        currentWeek: 4,
        currentSession: 3,
      });

      expect(result?.currentWeek).toBe(4);
      expect(result?.currentSession).toBe(3);
    });

    it('should return null when cycle not found', async () => {
      const { updateProgramCycleProgress } = await import('../../src/lib/db/program/progress');
      
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(null),
            }),
          }),
        }),
      });

      const result = await updateProgramCycleProgress({} as any, 'invalid-cycle', 'user-1', {
        currentWeek: 1,
      });

      expect(result).toBeNull();
    });
  });

  describe('completeProgramCycle', () => {
    it('should mark cycle as completed', async () => {
      const { completeProgramCycle } = await import('../../src/lib/db/program/progress');
      
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                id: 'cycle-1',
                workosId: 'user-1',
                status: 'completed',
                isComplete: true,
                completedAt: '2024-01-15T10:00:00Z',
              }),
            }),
          }),
        }),
      });

      const result = await completeProgramCycle({} as any, 'cycle-1', 'user-1');

      expect(result).not.toBeNull();
      expect(result?.status).toBe('completed');
      expect(result?.isComplete).toBe(true);
      expect(result?.completedAt).toBeDefined();
    });

    it('should return null when cycle not found', async () => {
      const { completeProgramCycle } = await import('../../src/lib/db/program/progress');
      
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(null),
            }),
          }),
        }),
      });

      const result = await completeProgramCycle({} as any, 'invalid-cycle', 'user-1');

      expect(result).toBeNull();
    });
  });
});

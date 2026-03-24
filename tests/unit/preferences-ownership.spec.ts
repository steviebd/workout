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
  userPreferences: {
    workosId: {} as any,
    weightUnit: {} as any,
    theme: {} as any,
    dateFormat: {} as any,
    weeklyWorkoutTarget: {} as any,
    updatedAt: {} as any,
  },
  eq: (a: any, b: any) => ({ type: 'eq', a, b }),
  and: (...args: any[]) => args,
}));

describe('User Preferences Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserPreferences', () => {
    it('should return preferences when user has them', async () => {
      const { getUserPreferences } = await import('../../src/lib/db/preferences');
      
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              workosId: 'user-1',
              weightUnit: 'kg',
              theme: 'dark',
              dateFormat: 'dd/mm/yyyy',
              weeklyWorkoutTarget: 4,
            }),
          }),
        }),
      });

      const result = await getUserPreferences({} as any, 'user-1');

      expect(result).not.toBeNull();
      expect(result?.weightUnit).toBe('kg');
      expect(result?.theme).toBe('dark');
    });

    it('should return null when user has no preferences', async () => {
      const { getUserPreferences } = await import('../../src/lib/db/preferences');
      
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(null),
          }),
        }),
      });

      const result = await getUserPreferences({} as any, 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('upsertUserPreferences', () => {
    it('should update existing preferences', async () => {
      const { upsertUserPreferences } = await import('../../src/lib/db/preferences');
      
      // First select finds existing
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              workosId: 'user-1',
              weightUnit: 'kg',
              theme: 'light',
            }),
          }),
        }),
      });

      // Update returns updated
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                workosId: 'user-1',
                weightUnit: 'lbs',
                theme: 'light',
              }),
            }),
          }),
        }),
      });

      const result = await upsertUserPreferences({} as any, 'user-1', {
        weightUnit: 'lbs',
      });

      expect(result.weightUnit).toBe('lbs');
    });

    it('should create new preferences when none exist', async () => {
      const { upsertUserPreferences } = await import('../../src/lib/db/preferences');
      
      // First select returns null (no existing)
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(null),
          }),
        }),
      });

      // Insert creates new
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              workosId: 'user-1',
              weightUnit: 'kg',
              theme: 'light',
              dateFormat: 'dd/mm/yyyy',
              weeklyWorkoutTarget: 3,
            }),
          }),
        }),
      });

      const result = await upsertUserPreferences({} as any, 'user-1', {});

      expect(result.workosId).toBe('user-1');
      expect(result.weightUnit).toBe('kg'); // default
      expect(result.weeklyWorkoutTarget).toBe(3); // default
    });

    it('should use provided values over defaults', async () => {
      const { upsertUserPreferences } = await import('../../src/lib/db/preferences');
      
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(null),
          }),
        }),
      });

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              workosId: 'user-1',
              weightUnit: 'lbs',
              theme: 'dark',
              weeklyWorkoutTarget: 5,
            }),
          }),
        }),
      });

      const result = await upsertUserPreferences({} as any, 'user-1', {
        weightUnit: 'lbs',
        theme: 'dark',
        weeklyWorkoutTarget: 5,
      });

      expect(result.weightUnit).toBe('lbs');
      expect(result.theme).toBe('dark');
    });
  });

  describe('updateWeightUnit', () => {
    it('should call upsertUserPreferences with weightUnit', async () => {
      const { updateWeightUnit, upsertUserPreferences } = await import('../../src/lib/db/preferences');
      
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ workosId: 'user-1', weightUnit: 'kg' }),
          }),
        }),
      });

      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ workosId: 'user-1', weightUnit: 'lbs' }),
            }),
          }),
        }),
      });

      const result = await updateWeightUnit({} as any, 'user-1', 'lbs');

      expect(result?.weightUnit).toBe('lbs');
    });
  });

  describe('updateTheme', () => {
    it('should call upsertUserPreferences with theme', async () => {
      const { updateTheme } = await import('../../src/lib/db/preferences');
      
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ workosId: 'user-1', theme: 'light' }),
          }),
        }),
      });

      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ workosId: 'user-1', theme: 'dark' }),
            }),
          }),
        }),
      });

      const result = await updateTheme({} as any, 'user-1', 'dark');

      expect(result?.theme).toBe('dark');
    });
  });
});

describe('Ownership Validation Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateEntityOwnership', () => {
    it('should return valid when entity belongs to user', async () => {
      const { validateEntityOwnership } = await import('../../src/lib/db/ownership');
      
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ id: 'entity-1' }),
          }),
        }),
      });

      const result = await validateEntityOwnership(
        {} as any,
        {} as any,
        {} as any,
        'entity-1',
        {} as any,
        'user-1',
        'TestEntity'
      );

      expect(result.isValid).toBe(true);
      expect(result.entityId).toBe('entity-1');
    });

    it('should return invalid when entity not found', async () => {
      const { validateEntityOwnership } = await import('../../src/lib/db/ownership');
      
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(null),
          }),
        }),
      });

      const result = await validateEntityOwnership(
        {} as any,
        {} as any,
        {} as any,
        'invalid-entity',
        {} as any,
        'user-1',
        'TestEntity'
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('assertOwnership', () => {
    it('should return entityId when valid', async () => {
      const { assertOwnership } = await import('../../src/lib/db/ownership');
      
      const result = await assertOwnership({
        isValid: true,
        entityId: 'entity-1',
      });

      expect(result).toBe('entity-1');
    });

    it('should throw error when invalid', async () => {
      const { assertOwnership } = await import('../../src/lib/db/ownership');
      
      await expect(
        assertOwnership({
          isValid: false,
          error: 'Not authorized',
        })
      ).rejects.toThrow('Not authorized');
    });

    it('should throw error when entityId is null', async () => {
      const { assertOwnership } = await import('../../src/lib/db/ownership');
      
      await expect(
        assertOwnership({
          isValid: true,
          entityId: null as any,
        })
      ).rejects.toThrow('Entity ID is missing');
    });
  });

  describe('withOwnershipCheck', () => {
    it('should run operation when validation passes', async () => {
      const { withOwnershipCheck } = await import('../../src/lib/db/ownership');
      
      const validator = vi.fn().mockResolvedValue({ isValid: true, entityId: 'entity-1' });
      const operation = vi.fn().mockResolvedValue({ success: true });

      const wrapped = withOwnershipCheck(validator, operation);
      const result = await wrapped({} as any, 'arg1');

      expect(validator).toHaveBeenCalled();
      expect(operation).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should skip operation when validation fails', async () => {
      const { withOwnershipCheck } = await import('../../src/lib/db/ownership');
      
      const validator = vi.fn().mockResolvedValue({ isValid: false, error: 'Not authorized' });
      const operation = vi.fn().mockResolvedValue({ success: true });

      const wrapped = withOwnershipCheck(validator, operation);
      const result = await wrapped({} as any, 'arg1');

      expect(validator).toHaveBeenCalled();
      expect(operation).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should return errorReturnValue when validation fails', async () => {
      const { withOwnershipCheck } = await import('../../src/lib/db/ownership');
      
      const validator = vi.fn().mockResolvedValue({ isValid: false });
      const operation = vi.fn().mockResolvedValue({ success: true });

      const wrapped = withOwnershipCheck(validator, operation, { error: true });
      const result = await wrapped({} as any, 'arg1');

      expect(result).toEqual({ error: true });
    });
  });
});

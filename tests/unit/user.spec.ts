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
  users: {
    workosId: {} as any,
    email: {} as any,
    name: {} as any,
    id: {} as any,
  },
  eq: (a: any, b: any) => ({ type: 'eq', a, b }),
}));

describe('User Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrCreateUser', () => {
    it('should return existing user when found', async () => {
      const { getOrCreateUser } = await import('../../src/lib/db/user');
      
      const mockProfile = {
        id: 'workos-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              id: 'local-user-1',
              workosId: 'workos-123',
              email: 'test@example.com',
              name: 'John Doe',
            }),
          }),
        }),
      });

      const result = await getOrCreateUser({} as any, mockProfile);

      expect(result.id).toBe('local-user-1');
      expect(result.name).toBe('John Doe');
    });

    it('should create new user when not found', async () => {
      const { getOrCreateUser } = await import('../../src/lib/db/user');
      
      const mockProfile = {
        id: 'workos-new',
        email: 'new@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      // First call returns null (user not found)
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(null),
          }),
        }),
      });

      // Insert creates new user
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              id: 'local-user-2',
              workosId: 'workos-new',
              email: 'new@example.com',
              name: 'Jane Smith',
            }),
          }),
        }),
      });

      const result = await getOrCreateUser({} as any, mockProfile);

      expect(result.id).toBe('local-user-2');
      expect(result.name).toBe('Jane Smith');
    });

    it('should handle empty firstName', async () => {
      const { getOrCreateUser } = await import('../../src/lib/db/user');
      
      const mockProfile = {
        id: 'workos-123',
        email: 'test@example.com',
        firstName: '',
        lastName: 'Doe',
      };

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
              id: 'local-user-1',
              workosId: 'workos-123',
              email: 'test@example.com',
              name: 'Doe',
            }),
          }),
        }),
      });

      const result = await getOrCreateUser({} as any, mockProfile);

      expect(result.name).toBe('Doe');
    });
  });

  describe('getUserByWorkosId', () => {
    it('should return user when found', async () => {
      const { getUserByWorkosId } = await import('../../src/lib/db/user');
      
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              id: 'local-user-1',
              workosId: 'workos-123',
              email: 'test@example.com',
              name: 'John Doe',
            }),
          }),
        }),
      });

      const result = await getUserByWorkosId({} as any, 'workos-123');

      expect(result).not.toBeNull();
      expect(result?.workosId).toBe('workos-123');
    });

    it('should return null when user not found', async () => {
      const { getUserByWorkosId } = await import('../../src/lib/db/user');
      
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(null),
          }),
        }),
      });

      const result = await getUserByWorkosId({} as any, 'nonexistent');

      expect(result).toBeNull();
    });
  });
});

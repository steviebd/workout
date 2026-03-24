import { describe, expect, it, vi } from 'vitest';
import { applyPagination, withUpdatedAt } from '../../src/lib/db/base-repository';

describe('Base Repository Functions', () => {
  describe('applyPagination', () => {
    it('should apply offset when provided', () => {
      const mockQuery = {
        offset: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      applyPagination(mockQuery as any, 10);
      expect(mockQuery.offset).toHaveBeenCalledWith(10);
    });

    it('should apply limit when provided', () => {
      const mockQuery = {
        offset: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      applyPagination(mockQuery as any, undefined, 20);
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
    });

    it('should apply both offset and limit', () => {
      const mockQuery = {
        offset: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      applyPagination(mockQuery as any, 5, 10);
      expect(mockQuery.offset).toHaveBeenCalledWith(5);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('withUpdatedAt', () => {
    it('should add updatedAt to data', () => {
      const data = { name: 'test', value: 123 };
      const result = withUpdatedAt(data);

      expect(result).toHaveProperty('updatedAt');
      expect(result.name).toBe('test');
      expect(result.value).toBe(123);
    });

    it('should not modify original object', () => {
      const data = { name: 'test' };
      const result = withUpdatedAt(data);

      expect(data).not.toHaveProperty('updatedAt');
      expect(result).toHaveProperty('updatedAt');
    });
  });
});

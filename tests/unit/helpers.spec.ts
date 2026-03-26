import { describe, expect, it, vi } from 'vitest';
import { asc, desc } from 'drizzle-orm';
import * as helpers from '../../src/lib/db/helpers';
import { calculateChunkSize, SAFE_MAX_SQL_VARS } from '../../src/lib/db/utils';

describe('Database Helper Functions', () => {
  describe('applyPagination', () => {
    it('should apply both limit and offset', () => {
      const mockQuery = {
        offset: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      const result = helpers.applyPagination(mockQuery, { limit: 10, offset: 5 });

      expect(mockQuery.offset).toHaveBeenCalledWith(5);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(result).toBe(mockQuery);
    });

    it('should apply only limit when offset is undefined', () => {
      const mockQuery = {
        offset: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      helpers.applyPagination(mockQuery, { limit: 10 });

      expect(mockQuery.offset).not.toHaveBeenCalled();
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should apply only offset when limit is undefined', () => {
      const mockQuery = {
        offset: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      helpers.applyPagination(mockQuery, { offset: 5 });

      expect(mockQuery.offset).toHaveBeenCalledWith(5);
      expect(mockQuery.limit).not.toHaveBeenCalled();
    });

    it('should return query unchanged when no options provided', () => {
      const mockQuery = {
        offset: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      helpers.applyPagination(mockQuery, {});

      expect(mockQuery.offset).not.toHaveBeenCalled();
      expect(mockQuery.limit).not.toHaveBeenCalled();
    });
  });

  describe('applySort', () => {
    it('should apply sort when sortBy and columnsMap provided', () => {
      const mockColumn = {} as any;
      const mockQuery = {
        orderBy: vi.fn().mockReturnThis(),
      };
      const columnsMap = { name: mockColumn };

      const result = helpers.applySort(mockQuery, 'name', 'ASC', columnsMap);

      expect(mockQuery.orderBy).toHaveBeenCalledWith(asc(mockColumn));
      expect(result).toBe(mockQuery);
    });

    it('should apply descending sort when sortOrder is DESC', () => {
      const mockColumn = {} as any;
      const mockQuery = {
        orderBy: vi.fn().mockReturnThis(),
      };
      const columnsMap = { name: mockColumn };

      helpers.applySort(mockQuery, 'name', 'DESC', columnsMap);

      expect(mockQuery.orderBy).toHaveBeenCalledWith(desc(mockColumn));
    });

    it('should return query unchanged when sortBy is not provided', () => {
      const mockQuery = {
        orderBy: vi.fn().mockReturnThis(),
      };

      const result = helpers.applySort(mockQuery, undefined, 'DESC', { name: {} as any });

      expect(mockQuery.orderBy).not.toHaveBeenCalled();
      expect(result).toBe(mockQuery);
    });

    it('should return query unchanged when columnsMap is not provided', () => {
      const mockQuery = {
        orderBy: vi.fn().mockReturnThis(),
      };

      const result = helpers.applySort(mockQuery, 'name', 'DESC', undefined);

      expect(mockQuery.orderBy).not.toHaveBeenCalled();
      expect(result).toBe(mockQuery);
    });

    it('should return query unchanged when column not found in columnsMap', () => {
      const mockQuery = {
        orderBy: vi.fn().mockReturnThis(),
      };
      const columnsMap = { other: {} as any };

      const result = helpers.applySort(mockQuery, 'name', 'DESC', columnsMap);

      expect(mockQuery.orderBy).not.toHaveBeenCalled();
      expect(result).toBe(mockQuery);
    });
  });

  describe('buildSortOrderColumn', () => {
    it('should return desc for DESC sort order', () => {
      const mockColumn = {} as any;

      const result = helpers.buildSortOrderColumn(mockColumn, 'DESC');

      expect(result).toEqual(desc(mockColumn));
    });

    it('should return asc for ASC sort order', () => {
      const mockColumn = {} as any;

      const result = helpers.buildSortOrderColumn(mockColumn, 'ASC');

      expect(result).toEqual(asc(mockColumn));
    });
  });
});

describe('Database Utility Functions', () => {
  describe('calculateChunkSize', () => {
    it('should calculate correct chunk size with default maxVars', () => {
      const result = calculateChunkSize(10);
      // SAFE_MAX_SQL_VARS = 500, so 500 / 10 = 50
      expect(result).toBe(50);
    });

    it('should calculate correct chunk size with custom maxVars', () => {
      const result = calculateChunkSize(10, 100);
      // 100 / 10 = 10
      expect(result).toBe(10);
    });

    it('should handle large rowVariableCount', () => {
      const result = calculateChunkSize(100);
      // 500 / 100 = 5
      expect(result).toBe(5);
    });

    it('should handle small rowVariableCount', () => {
      const result = calculateChunkSize(1);
      // 500 / 1 = 500
      expect(result).toBe(500);
    });

    it('should floor the result', () => {
      const result = calculateChunkSize(7);
      // 500 / 7 = 71.42..., should floor to 71
      expect(result).toBe(71);
    });
  });

  describe('SAFE_MAX_SQL_VARS', () => {
    it('should be 500', () => {
      expect(SAFE_MAX_SQL_VARS).toBe(500);
    });
  });
});

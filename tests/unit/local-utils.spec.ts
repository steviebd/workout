import { describe, expect, it, vi } from 'vitest';
import { generateLocalId, now } from '../../src/lib/db/local/utils';

// Mock crypto.randomUUID
const mockRandomUUID = vi.fn(() => 'test-uuid-1234');
vi.stubGlobal('crypto', {
  randomUUID: mockRandomUUID,
});

describe('Local Database Utils', () => {
  describe('generateLocalId', () => {
    it('should generate a UUID', () => {
      const id = generateLocalId();
      expect(id).toBe('test-uuid-1234');
    });

    it('should return a string', () => {
      const id = generateLocalId();
      expect(typeof id).toBe('string');
    });
  });

  describe('now', () => {
    it('should return current date', () => {
      const date = now();
      expect(date).toBeInstanceOf(Date);
    });
  });
});

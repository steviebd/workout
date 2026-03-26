import { describe, expect, it } from 'vitest';
import { API, UI, AUTH, VALIDATION } from '../../src/lib/constants';

describe('Constants', () => {
  describe('API Constants', () => {
    it('should have timeout values', () => {
      expect(API.TIMEOUTS.DEFAULT_RETRY_DELAY_MS).toBe(1000);
      expect(API.TIMEOUTS.STATE_EXPIRY_MS).toBe(10 * 60 * 1000);
      expect(API.TIMEOUTS.SYNC_LOCK_TIMEOUT_MS).toBe(5 * 60 * 1000);
    });

    it('should have limit values', () => {
      expect(API.LIMITS.MAX_SYNC_RECORDS).toBe(500);
      expect(API.LIMITS.SAFE_MAX_SQL_VARS).toBe(500);
      expect(API.LIMITS.TOKEN_REFRESH_THRESHOLD_MINUTES).toBe(5);
    });
  });

  describe('UI Constants', () => {
    it('should have pagination defaults', () => {
      expect(UI.PAGINATION.DEFAULT_PAGE_SIZE).toBe(25);
    });

    it('should have timing values', () => {
      expect(UI.TIMING.AUTOSAVE_DELAY_MS).toBe(1000);
      expect(UI.TIMING.SAVED_INDICATOR_DURATION_MS).toBe(2000);
      expect(UI.TIMING.QUERY_STALE_TIME_MS).toBe(30 * 1000);
    });
  });

  describe('AUTH Constants', () => {
    it('should have token expiry', () => {
      expect(AUTH.TOKEN_EXPIRY_SECONDS).toBe(4 * 24 * 60 * 60); // 4 days
    });

    it('should have refresh threshold', () => {
      expect(AUTH.REFRESH_THRESHOLD_SECONDS).toBe(24 * 60 * 60); // 1 day
    });

    it('should have session cookie max age', () => {
      expect(AUTH.SESSION_COOKIE_MAX_AGE).toBe(4 * 24 * 60 * 60); // 4 days
    });
  });

  describe('VALIDATION Constants', () => {
    it('should have max name length', () => {
      expect(VALIDATION.MAX_NAME_LENGTH).toBe(200);
    });

    it('should have max description length', () => {
      expect(VALIDATION.MAX_DESCRIPTION_LENGTH).toBe(1000);
    });

    it('should have max notes length', () => {
      expect(VALIDATION.MAX_NOTES_LENGTH).toBe(2000);
    });

    it('should have max muscle group length', () => {
      expect(VALIDATION.MAX_MUSCLE_GROUP_LENGTH).toBe(50);
    });

    it('should have max search term length', () => {
      expect(VALIDATION.MAX_SEARCH_TERM_LENGTH).toBe(100);
    });
  });
});

import { describe, expect, it } from 'vitest';
import { API_ERROR_CODES, ApiError, createApiError } from '../../src/lib/api/errors';

describe('API Errors', () => {
  describe('API_ERROR_CODES', () => {
    it('should have UNAUTHORIZED code', () => {
      expect(API_ERROR_CODES.UNAUTHORIZED).toBe('UNAUTHORIZED');
    });

    it('should have NOT_FOUND code', () => {
      expect(API_ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
    });

    it('should have VALIDATION_ERROR code', () => {
      expect(API_ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    });

    it('should have SERVER_ERROR code', () => {
      expect(API_ERROR_CODES.SERVER_ERROR).toBe('SERVER_ERROR');
    });

    it('should have DATABASE_ERROR code', () => {
      expect(API_ERROR_CODES.DATABASE_ERROR).toBe('DATABASE_ERROR');
    });
  });

  describe('ApiError', () => {
    it('should create error with message, status, and code', () => {
      const error = new ApiError('Not found', 404, API_ERROR_CODES.NOT_FOUND);
      
      expect(error.message).toBe('Not found');
      expect(error.status).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('ApiError');
    });

    it('should be an instance of Error', () => {
      const error = new ApiError('Error', 500, API_ERROR_CODES.SERVER_ERROR);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('createApiError', () => {
    it('should create a Response with error body', () => {
      const response = createApiError('Not found', 404, API_ERROR_CODES.NOT_FOUND);
      
      expect(response.status).toBe(404);
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should include error message and code in response body', async () => {
      const response = createApiError('Validation failed', 400, API_ERROR_CODES.VALIDATION_ERROR);
      const body = await response.json() as { error: string; code: string };
      
      expect(body.error).toBe('Validation failed');
      expect(body.code).toBe('VALIDATION_ERROR');
    });
  });
});

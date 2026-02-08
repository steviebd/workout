export const API_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

export interface ApiErrorResponse {
  error: string;
  code: ApiErrorCode;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: ApiErrorCode
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function createApiError(
  message: string,
  status: number,
  code: ApiErrorCode
): Response {
  return Response.json({ error: message, code }, { status });
}

import { type ZodSchema } from 'zod';
import { withApiContext } from './context';
import { createApiError, API_ERROR_CODES, ApiError } from './errors';
import type { SessionPayload } from '../session';
import { createDb } from '~/lib/db';

export { withApiContext } from './context';

export function handleApiError(err: unknown, operation: string): Response {
  if (err instanceof ApiError) {
    return createApiError(err.message, err.status, err.code);
  }
  console.error(`${operation} error:`, err);
  return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
}

export function parseQueryParams<T extends Record<string, unknown>>(
  url: URL,
  defaults?: Partial<T>
): T {
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  if (defaults) {
    return { ...defaults, ...params } as T;
  }

  return params as T;
}

export function parseAndValidateQueryParams<T extends Record<string, unknown>>(
  url: URL,
  schema: ZodSchema<T>
): { data: T; error: Response | null } {
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const result = schema.safeParse(params);
  if (!result.success) {
    return {
      data: {} as T,
      error: createApiError('Invalid query parameters', 400, API_ERROR_CODES.VALIDATION_ERROR),
    };
  }

  return { data: result.data, error: null };
}

export async function withApiHandler(
  request: Request,
  handler: (params: {
    session: SessionPayload;
    db: ReturnType<typeof createDb>;
    d1Db: D1Database;
  }) => Promise<Response>
): Promise<Response> {
  try {
    const context = await withApiContext(request);
    return handler(context);
  } catch (err) {
    return handleApiError(err, 'API handler');
  }
}

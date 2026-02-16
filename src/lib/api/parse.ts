import { type ZodSchema } from 'zod';
import { ApiError, API_ERROR_CODES } from './errors';

export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<T> {
  const body = await request.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError(
      'Invalid request body',
      400,
      API_ERROR_CODES.VALIDATION_ERROR
    );
  }
  return result.data;
}

export function parseQuery<T>(url: URL, schema: ZodSchema<T>): T {
  const params = Object.fromEntries(url.searchParams);
  const result = schema.safeParse(params);
  if (!result.success) {
    throw new ApiError(
      'Invalid query parameters',
      400,
      API_ERROR_CODES.VALIDATION_ERROR
    );
  }
  return result.data;
}

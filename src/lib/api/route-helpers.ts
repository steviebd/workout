import { type ZodSchema } from 'zod';
import { getSession, type SessionPayload } from '../session';
import { VALIDATION } from '../constants';

export const MAX_NAME_LENGTH = VALIDATION.MAX_NAME_LENGTH;
export const MAX_DESCRIPTION_LENGTH = VALIDATION.MAX_DESCRIPTION_LENGTH;
export const MAX_NOTES_LENGTH = VALIDATION.MAX_NOTES_LENGTH;
export const MAX_MUSCLE_GROUP_LENGTH = VALIDATION.MAX_MUSCLE_GROUP_LENGTH;
export const MAX_SEARCH_TERM_LENGTH = VALIDATION.MAX_SEARCH_TERM_LENGTH;

export async function requireAuth(request: Request): Promise<SessionPayload | null> {
  const session = await getSession(request);
  if (!session?.sub) {
    return null;
  }
  return session;
}

export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<T | null> {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (parsed.success) {
      return parsed.data;
    }
    return null;
  } catch {
    return null;
  }
}

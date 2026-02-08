import { type ZodSchema } from 'zod';
import { getSession, type SessionPayload } from '../session';

export const MAX_NAME_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_NOTES_LENGTH = 2000;
export const MAX_MUSCLE_GROUP_LENGTH = 50;
export const MAX_SEARCH_TERM_LENGTH = 100;

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

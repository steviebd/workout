import { env } from 'cloudflare:workers';
import { requireAuth } from './route-helpers';
import { ApiError, API_ERROR_CODES } from './errors';
import type { SessionPayload } from '../session';
import { createDb } from '~/lib/db';

type DbReturn = ReturnType<typeof createDb>;

export async function withApiContext(request: Request): Promise<{ session: SessionPayload; db: DbReturn; d1Db: D1Database }> {
  const session = await requireAuth(request);
  if (!session) {
    throw new ApiError('Not authenticated', 401, API_ERROR_CODES.UNAUTHORIZED);
  }

  const d1Db = (env as { DB?: D1Database }).DB;
  if (!d1Db) {
    throw new ApiError('Database not available', 500, API_ERROR_CODES.DATABASE_ERROR);
  }

  const db = createDb(d1Db);
  return { session, db, d1Db };
}

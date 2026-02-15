import { withApiContext } from './context';
import { handleApiError } from './handler';
import type { SessionPayload } from '../session';
import { createDb } from '~/lib/db';

export interface ApiCtx {
  session: SessionPayload;
  db: ReturnType<typeof createDb>;
  d1Db: D1Database;
}

export function apiRoute(
  name: string,
  fn: (ctx: ApiCtx) => Promise<Response>
): ({ request }: { request: Request }) => Promise<Response> {
  return async ({ request }: { request: Request }) => {
    try {
      const ctx = await withApiContext(request);
      return await fn(ctx);
    } catch (err) {
      return handleApiError(err, name);
    }
  };
}

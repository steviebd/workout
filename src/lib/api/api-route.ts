import { withApiContext } from './context';
import { handleApiError } from './handler';
import type { SessionPayload } from '~/lib/auth';
import { createDb } from '~/lib/db';

export interface ApiCtx {
  session: SessionPayload;
  db: ReturnType<typeof createDb>;
  d1Db: D1Database;
  request: Request;
}

export interface ApiCtxWithParams<T = Record<string, string>> extends ApiCtx {
  params: T;
}

export function apiRoute(
  name: string,
  fn: (ctx: ApiCtx) => Promise<Response>
): ({ request }: { request: Request }) => Promise<Response> {
  return async ({ request }: { request: Request }) => {
    try {
      const ctx = await withApiContext(request);
      return await fn({ ...ctx, request });
    } catch (err) {
      return handleApiError(err, name);
    }
  };
}

export function apiRouteWithParams<T = Record<string, string>>(
  name: string,
  fn: (ctx: ApiCtxWithParams<T>) => Promise<Response>
): ({ request, params }: { request: Request; params: T }) => Promise<Response> {
  return async ({ request, params }: { request: Request; params: T }) => {
    try {
      const ctx = await withApiContext(request);
      return await fn({ ...ctx, request, params });
    } catch (err) {
      return handleApiError(err, name);
    }
  };
}

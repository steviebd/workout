import { handleApiError } from './handler';
import type { SessionPayload } from '../session';
import type { createDb } from '../db';

interface HandlerContext {
  session: SessionPayload;
  db: ReturnType<typeof createDb>;
  d1Db: D1Database;
}

type HandlerFn<T> = (context: HandlerContext) => Promise<T>;

/**
 * Creates a standardized API handler with automatic error handling
 * 
 * Usage:
 * ```typescript
 * export const Route = createFileRoute('/api/exercises')({
 *   server: {
 *     handlers: {
 *       GET: createApiHandler(async ({ session, d1Db }) => {
 *         const exercises = await getExercisesByWorkosId(d1Db, session.sub, {...});
 *         return Response.json(exercises);
 *       }),
 *     },
 *   },
 * });
 * ```
 */
export function createApiHandler<T>(
  handler: HandlerFn<T>
): HandlerFn<Response> {
  return async (context) => {
    try {
      const result = await handler(context);
      return result instanceof Response 
        ? result 
        : Response.json(result);
    } catch (err) {
      return handleApiError(err, handler.name || 'API operation');
    }
  };
}

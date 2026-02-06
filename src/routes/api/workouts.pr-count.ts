import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getPrCount } from '../../lib/db/workout';
import { requireAuth } from '~/lib/api/route-helpers';

export const Route = createFileRoute('/api/workouts/pr-count')({
  server: {
    handlers: {
       GET: async ({ request }) => {
         try {
           const session = await requireAuth(request);
           if (!session) {
             return Response.json({ error: 'Not authenticated' }, { status: 401 });
           }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

           const count = await getPrCount(db, session.sub);

          return Response.json({ count });
        } catch (err) {
          console.error('Get PR count error:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          return Response.json({ error: 'Server error', details: errorMessage }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiWorkoutsPrCount() {
  return null;
}

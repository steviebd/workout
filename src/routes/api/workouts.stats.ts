import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getWorkoutHistoryStats } from '../../lib/db/workout';
import { getLocalWorkoutStats } from '../../lib/db/local-repository';
import { requireAuth } from '~/lib/api/route-helpers';

export const Route = createFileRoute('/api/workouts/stats')({
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
             const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
             if (online) {
               return Response.json({ error: 'Database not available' }, { status: 503 });
             }
              const localStats = await getLocalWorkoutStats(session.sub);
              return Response.json(localStats, {
                headers: {
                  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=150',
                  'X-Offline-Mode': 'local',
                },
              });
           }

            const stats = await getWorkoutHistoryStats(db, session.sub);

            return Response.json(stats, {
              headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=150',
              },
            });
        } catch (err) {
          console.error('Get workout stats error:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          return Response.json({ error: 'Server error', details: errorMessage }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiWorkoutsStats() {
  return null;
}

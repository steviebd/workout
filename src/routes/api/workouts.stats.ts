import { createFileRoute } from '@tanstack/react-router';
import { getWorkoutHistoryStats } from '../../lib/db/workout';
import { getLocalWorkoutStats } from '../../lib/db/local-repository';
import { withApiContext } from '../../lib/api/context';
import { createApiError, ApiError } from '../../lib/api/errors';

export const Route = createFileRoute('/api/workouts/stats')({
  server: {
    handlers: {
       GET: async ({ request }) => {
         try {
           const { session, d1Db } = await withApiContext(request);

           if (!d1Db) {
             const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
             if (online) {
               return createApiError('Database not available', 503, 'DATABASE_ERROR');
             }
              const localStats = await getLocalWorkoutStats(session.sub);
              return Response.json(localStats, {
                headers: {
                  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=150',
                  'X-Offline-Mode': 'local',
                },
              });
           }

            const stats = await getWorkoutHistoryStats(d1Db, session.sub);

            return Response.json(stats, {
              headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=150',
              },
            });
         } catch (err) {
           if (err instanceof ApiError) {
             return createApiError(err.message, err.status, err.code);
           }
           console.error('Get workout stats error:', err);
           return createApiError('Server error', 500, 'SERVER_ERROR');
         }
      },
    },
  },
});

export default function ApiWorkoutsStats() {
  return null;
}

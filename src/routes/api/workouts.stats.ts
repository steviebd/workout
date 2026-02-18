import { createFileRoute } from '@tanstack/react-router';
import { getWorkoutHistoryStats } from '../../lib/db/workout';
import { getLocalWorkoutStats } from '../../lib/db/local-repository';
import { apiRoute } from '~/lib/api/handler';
import { createApiError, API_ERROR_CODES } from '~/lib/api/errors';

export const Route = createFileRoute('/api/workouts/stats')({
  server: {
    handlers: {
      GET: apiRoute('Get workout stats', async ({ session, d1Db }) => {
        if (!d1Db) {
          const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
          if (online) {
            return createApiError('Database not available', 503, API_ERROR_CODES.DATABASE_ERROR);
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
      }),
    },
  },
});

export default function ApiWorkoutsStats() {
  return null;
}

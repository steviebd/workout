import { createFileRoute } from '@tanstack/react-router';
import { getPrCount } from '../../lib/db/workout';
import { getLocalPRCount } from '../../lib/db/local-repository';
import { apiRoute } from '~/lib/api/handler';
import { createApiError, API_ERROR_CODES } from '~/lib/api/errors';

export const Route = createFileRoute('/api/workouts/pr-count')({
  server: {
    handlers: {
      GET: apiRoute('Get PR count', async ({ session, d1Db }) => {
        if (!d1Db) {
          const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
          if (online) {
            return createApiError('Database not available', 503, API_ERROR_CODES.DATABASE_ERROR);
          }
          const count = await getLocalPRCount(session.sub);
          return Response.json({ count }, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              'X-Offline-Mode': 'local',
            },
          });
        }

        const count = await getPrCount(d1Db, session.sub);

        return Response.json({ count }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        });
      }),
    },
  },
});

export default function ApiWorkoutsPrCount() {
  return null;
}

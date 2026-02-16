import { createFileRoute } from '@tanstack/react-router';
import { getPrCount } from '../../lib/db/workout';
import { getLocalPRCount } from '../../lib/db/local-repository';
import { withApiContext } from '../../lib/api/context';
import { createApiError, ApiError, API_ERROR_CODES } from '../../lib/api/errors';

export const Route = createFileRoute('/api/workouts/pr-count')({
  server: {
    handlers: {
       GET: async ({ request }) => {
         try {
           const { session, d1Db } = await withApiContext(request);

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
         } catch (err) {
           if (err instanceof ApiError) {
             return createApiError(err.message, err.status, err.code);
           }
           console.error('Get PR count error:', err);
           return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
         }
      },
    },
  },
});

export default function ApiWorkoutsPrCount() {
  return null;
}

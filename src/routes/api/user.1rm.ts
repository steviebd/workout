import { createFileRoute } from '@tanstack/react-router';
import { withApiContext } from '../../lib/api/context';
import { createApiError, ApiError } from '../../lib/api/errors';
import { getLatestOneRMs } from '~/lib/db/program';

export const Route = createFileRoute('/api/user/1rm')({
  server: {
    handlers: {
       GET: async ({ request }) => {
         try {
           const { session, d1Db } = await withApiContext(request);

           const oneRMs = await getLatestOneRMs(d1Db, session.sub);

           if (!oneRMs) {
             return Response.json({
               squat1rm: null,
               bench1rm: null,
               deadlift1rm: null,
               ohp1rm: null,
             });
           }

           return Response.json(oneRMs);
         } catch (err) {
           if (err instanceof ApiError) {
             return createApiError(err.message, err.status, err.code);
           }
           console.error('Get latest 1RM error:', err);
           return createApiError('Server error', 500, 'SERVER_ERROR');
         }
      },
    },
  },
});

export default function ApiUser1rm() {
  return null;
}

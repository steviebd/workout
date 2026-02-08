import { createFileRoute } from '@tanstack/react-router';
import { getStrengthHistory } from '../../lib/db/workout';
import { withApiContext } from '../../lib/api/context';
import { createApiError, ApiError } from '../../lib/api/errors';

export const Route = createFileRoute('/api/progress/strength')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { session, d1Db } = await withApiContext(request);

          const url = new URL(request.url);
          const exerciseId = url.searchParams.get('exerciseId');
          const dateRange = url.searchParams.get('dateRange') as '1m' | '3m' | '6m' | '1y' | 'all' | undefined;

          if (!exerciseId) {
            return createApiError('exerciseId is required', 400, 'VALIDATION_ERROR');
          }

          if (!exerciseId.trim()) {
            return createApiError('exerciseId cannot be empty', 400, 'VALIDATION_ERROR');
          }

          if (dateRange && !['1m', '3m', '6m', '1y', 'all'].includes(dateRange)) {
            return createApiError('dateRange must be one of: 1m, 3m, 6m, 1y, all', 400, 'VALIDATION_ERROR');
          }

          let fromDate: string | undefined;
          const toDate = new Date().toISOString();

          if (dateRange) {
            const baseDate = new Date();
            switch (dateRange) {
              case '1m':
                baseDate.setMonth(baseDate.getMonth() - 1);
                break;
              case '3m':
                baseDate.setMonth(baseDate.getMonth() - 3);
                break;
              case '6m':
                baseDate.setMonth(baseDate.getMonth() - 6);
                break;
              case '1y':
                baseDate.setFullYear(baseDate.getFullYear() - 1);
                break;
              case 'all':
                fromDate = undefined;
                break;
            }
            if (dateRange !== 'all') {
              fromDate = baseDate.toISOString();
            }
          }

           const strengthHistory = await getStrengthHistory(d1Db, session.sub, exerciseId, { fromDate, toDate });

           const strengthData = strengthHistory.map(point => ({
             date: point.date,
             weight: point.weight,
           }));

           return Response.json({ strengthData }, {
             headers: {
               'Cache-Control': 'no-store, no-cache, must-revalidate',
             },
           });
         } catch (err) {
           if (err instanceof ApiError) {
             return createApiError(err.message, err.status, err.code);
           }
           console.error('Get strength progress error:', err);
           return createApiError('Server error', 500, 'SERVER_ERROR');
         }
      },
    },
  },
});

export default function ApiProgressStrength() {
  return null;
}

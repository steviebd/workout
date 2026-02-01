import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getStrengthHistory } from '../../lib/db/workout';
import { getSession } from '../../lib/session';

export const Route = createFileRoute('/api/progress/strength')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const url = new URL(request.url);
          const exerciseId = url.searchParams.get('exerciseId');
          const dateRange = url.searchParams.get('dateRange') as '1m' | '3m' | '6m' | '1y' | 'all' | undefined;

          if (!exerciseId) {
            return Response.json({ error: 'exerciseId is required' }, { status: 400 });
          }

          if (!exerciseId.trim()) {
            return Response.json({ error: 'exerciseId cannot be empty' }, { status: 400 });
          }

          if (dateRange && !['1m', '3m', '6m', '1y', 'all'].includes(dateRange)) {
            return Response.json({ error: 'dateRange must be one of: 1m, 3m, 6m, 1y, all' }, { status: 400 });
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

           const strengthHistory = await getStrengthHistory(db, session.workosId, exerciseId, { fromDate, toDate });

          const strengthData = strengthHistory.map(point => ({
            date: point.date,
            weight: point.weight,
          }));

           return Response.json({ strengthData });
         } catch (err) {
           console.error('Get strength progress error:', err);
           return Response.json({ error: 'Server error' }, { status: 500 });
         }
       },
    },
  },
});

export default function ApiProgressStrength() {
  return null;
}

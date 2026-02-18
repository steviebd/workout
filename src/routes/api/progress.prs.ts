import { createFileRoute } from '@tanstack/react-router';
import { getRecentPRs, getAllTimeBestPRs } from '../../lib/db/workout';
import { getLocalPersonalRecords, getAllTimeLocalBestPRs } from '../../lib/db/local-repository';
import { apiRoute, parseQueryParams } from '~/lib/api/handler';
import { createApiError, API_ERROR_CODES } from '~/lib/api/errors';

export const Route = createFileRoute('/api/progress/prs')({
  server: {
    handlers: {
      GET: apiRoute('Get recent PRs', async ({ session, d1Db, request }) => {
        const url = new URL(request.url);
        const { limit: limitParam, mode, dateRange } = parseQueryParams<{
          limit?: string;
          mode?: string;
          dateRange?: '1m' | '3m' | '6m' | '1y' | 'all';
        }>(url);
        const limit = limitParam ? parseInt(limitParam, 10) : 5;

        if (!d1Db) {
          const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
          if (online) {
            return createApiError('Database not available', 503, API_ERROR_CODES.DATABASE_ERROR);
          }
          const localPRs = mode === 'allTime'
            ? await getAllTimeLocalBestPRs(session.sub, limit)
            : await getLocalPersonalRecords(session.sub, limit);
          return Response.json({
            recentPRs: localPRs.map(pr => ({
              id: pr.id,
              exerciseName: pr.exerciseName,
              date: pr.date,
              weight: pr.weight,
              reps: pr.reps,
              previousRecord: pr.previousRecord,
            })),
          }, {
            headers: {
              'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=600',
              'X-Offline-Mode': 'local',
            },
          });
        }

        if (mode === 'allTime') {
          const bestPRs = await getAllTimeBestPRs(d1Db, session.sub, { limit });
          return Response.json({
            recentPRs: bestPRs.map(pr => ({
              id: pr.id,
              exerciseName: pr.exerciseName,
              date: pr.date,
              weight: pr.weight,
              reps: pr.reps,
            })),
          }, {
            headers: {
              'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=600',
            },
          });
        }

        let fromDate: string | undefined;
        if (dateRange && dateRange !== 'all') {
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
          }
          fromDate = baseDate.toISOString();
        }

        const recentPRs = await getRecentPRs(d1Db, session.sub, { limit, fromDate });

        return Response.json({
          recentPRs: recentPRs.map(pr => ({
            id: pr.id,
            exerciseName: pr.exerciseName,
            date: pr.date,
            weight: pr.weight,
            reps: pr.reps,
            previousRecord: pr.previousRecord,
          })),
        }, {
          headers: {
            'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=600',
          },
        });
      }),
    },
  },
});

export default function ApiProgressPrs() {
  return null;
}

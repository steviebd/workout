import { createFileRoute } from '@tanstack/react-router';
import { getRecentPRs, getAllTimeBestPRs } from '../../lib/db/workout';
import { getLocalPersonalRecords, getAllTimeLocalBestPRs } from '../../lib/db/local-repository';
import { withApiContext } from '../../lib/api/context';
import { createApiError, ApiError } from '../../lib/api/errors';

export const Route = createFileRoute('/api/progress/prs')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { session, d1Db } = await withApiContext(request);

          const url = new URL(request.url);
          const limitParam = url.searchParams.get('limit');
          const limit = limitParam ? parseInt(limitParam, 10) : 5;
          const mode = url.searchParams.get('mode') ?? 'recent';

          if (!d1Db) {
            const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
            if (online) {
              return createApiError('Database not available', 503, 'DATABASE_ERROR');
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

          const dateRange = url.searchParams.get('dateRange') as '1m' | '3m' | '6m' | '1y' | 'all' | undefined;

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
        } catch (err) {
          if (err instanceof ApiError) {
            return createApiError(err.message, err.status, err.code);
          }
          console.error('Get recent PRs error:', err);
          return createApiError('Server error', 500, 'SERVER_ERROR');
        }
      },
    },
  },
});

export default function ApiProgressPrs() {
  return null;
}

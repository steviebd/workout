import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getRecentPRs, getAllTimeBestPRs } from '../../lib/db/workout';
import { getLocalPersonalRecords, getAllTimeLocalBestPRs } from '../../lib/db/local-repository';
import { requireAuth } from '../../lib/api/route-helpers';

export const Route = createFileRoute('/api/progress/prs')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await requireAuth(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const url = new URL(request.url);
          const limitParam = url.searchParams.get('limit');
          const limit = limitParam ? parseInt(limitParam, 10) : 5;
          const mode = url.searchParams.get('mode') ?? 'recent';

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
            if (online) {
              return Response.json({ error: 'Database not available' }, { status: 503 });
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
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'X-Offline-Mode': 'local',
              },
            });
          }

          if (mode === 'allTime') {
            const bestPRs = await getAllTimeBestPRs(db, session.sub, { limit });
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
                'Cache-Control': 'no-store, no-cache, must-revalidate',
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

          const recentPRs = await getRecentPRs(db, session.sub, { limit, fromDate });

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
              'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
          });
        } catch (err) {
          console.error('Get recent PRs error:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          return Response.json({ error: 'Server error', details: errorMessage }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiProgressPrs() {
  return null;
}

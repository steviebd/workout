import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getRecentPRs } from '../../lib/db/workout';
import { getSession } from '../../lib/session';

export const Route = createFileRoute('/api/progress/prs')({
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
          const limitParam = url.searchParams.get('limit');
          const limit = limitParam ? parseInt(limitParam, 10) : 5;

           const recentPRs = await getRecentPRs(db, session.workosId, limit);

          return Response.json({
            recentPRs: recentPRs.map(pr => ({
              id: pr.id,
              exerciseName: pr.exerciseName,
              date: pr.date,
              weight: pr.weight,
              reps: pr.reps,
              previousRecord: pr.previousRecord,
            })),
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

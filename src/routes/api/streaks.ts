import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import {
  getWeeklyWorkoutCount,
  getTotalWorkouts,
  calculateThirtyDayStreak,
  getRolling30DayWorkoutCount,
} from '~/lib/streaks';
import { getUserPreferences } from '~/lib/db/preferences';
import { requireAuth } from '~/lib/api/route-helpers';

export const Route = createFileRoute('/api/streaks' as const)({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await requireAuth(request);
        if (!session) {
          return Response.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const workosId = session.sub;

        const db = (env as { DB?: D1Database }).DB;
        if (!db) {
          return new Response('Database not available', { status: 500 });
        }

        const prefs = await getUserPreferences(db, workosId);
        const weeklyTarget = prefs?.weeklyWorkoutTarget ?? 3;

        const [weeklyCount, totalWorkouts, rolling30Days, thirtyDayStreak] = await Promise.all([
          getWeeklyWorkoutCount(db, workosId),
          getTotalWorkouts(db, workosId),
          getRolling30DayWorkoutCount(db, workosId),
          calculateThirtyDayStreak(db, workosId, weeklyTarget),
        ]);

        return Response.json({
          weeklyCount,
          weeklyTarget,
          thirtyDayStreak,
          totalWorkouts,
          rolling30Days,
        }, {
          headers: {
            'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
          },
        });
      },
    },
  },
});

export default function ApiStreaks() {
  return null;
}

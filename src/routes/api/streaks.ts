import { createFileRoute } from '@tanstack/react-router';
import { apiRoute } from '~/lib/api/handler';
import {
  getWeeklyWorkoutCount,
  getTotalWorkouts,
  calculateThirtyDayStreak,
  getRolling30DayWorkoutCount,
} from '~/lib/gamification';
import { getUserPreferences } from '~/lib/db/preferences';

export const Route = createFileRoute('/api/streaks' as const)({
  server: {
    handlers: {
      GET: apiRoute('Get streaks', async ({ session, d1Db }) => {
        const workosId = session.sub;

        const prefs = await getUserPreferences(d1Db, workosId);
        const weeklyTarget = prefs?.weeklyWorkoutTarget ?? 3;

        const [weeklyCount, totalWorkouts, rolling30Days, thirtyDayStreak] = await Promise.all([
          getWeeklyWorkoutCount(d1Db, workosId),
          getTotalWorkouts(d1Db, workosId),
          getRolling30DayWorkoutCount(d1Db, workosId),
          calculateThirtyDayStreak(d1Db, workosId, weeklyTarget),
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
      }),
    },
  },
});

export default function ApiStreaks() {
  return null;
}

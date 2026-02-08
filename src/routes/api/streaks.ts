import { createFileRoute } from '@tanstack/react-router';
import { withApiContext } from '../../lib/api/context';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import {
  getWeeklyWorkoutCount,
  getTotalWorkouts,
  calculateThirtyDayStreak,
  getRolling30DayWorkoutCount,
} from '~/lib/streaks';
import { getUserPreferences } from '~/lib/db/preferences';

export const Route = createFileRoute('/api/streaks' as const)({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const { session, d1Db } = await withApiContext(request);
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
        } catch (err) {
          console.error('Get streaks error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
    },
  },
});

export default function ApiStreaks() {
  return null;
}

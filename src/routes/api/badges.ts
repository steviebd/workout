import { createFileRoute } from '@tanstack/react-router';
import { eq, isNotNull, sql, and } from 'drizzle-orm';
import { apiRoute } from '~/lib/api/handler';
import { workouts } from '~/lib/db/schema';
import { calculateAllBadges, countWorkoutsInRange } from '~/lib/gamification';

export const Route = createFileRoute('/api/badges' as const)({
  server: {
    handlers: {
      GET: apiRoute('Get badges', async ({ session, db: drizzleDb, d1Db }) => {
        const workosId = session.sub;

        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDay() === 0 ? today.getDate() - 6 : today.getDate() - today.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        const startDateStr = new Date(startOfWeek.getTime() - startOfWeek.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const endDateStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

        const weeklyWorkoutCount = await countWorkoutsInRange(d1Db, workosId, startDateStr, endDateStr);

        const workoutResults = await drizzleDb
          .select({ completedAt: workouts.completedAt })
          .from(workouts)
          .where(and(
            eq(workouts.workosId, workosId),
            eq(workouts.isDeleted, false),
            isNotNull(workouts.completedAt),
            sql`date(${workouts.completedAt}) >= ${startDateStr}`
          ));

        const workoutDatesInWeek = new Set<string>();
        for (const w of workoutResults) {
          if (w.completedAt) {
            workoutDatesInWeek.add(w.completedAt.split('T')[0]);
          }
        }

        const badges = await calculateAllBadges(d1Db, workosId);

        return Response.json({
          weeklyWorkouts: weeklyWorkoutCount,
          totalWorkouts: 0,
          badges,
          workoutDatesInWeek: Array.from(workoutDatesInWeek),
        });
      }),
    },
  },
});

export default function ApiBadges() {
  return null;
}

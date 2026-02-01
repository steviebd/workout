import { createFileRoute } from '@tanstack/react-router';
import { eq, isNotNull, sql, and } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { createDb } from '~/lib/db';
import { userStreaks, workouts } from '~/lib/db/schema';
import { calculateAllBadges } from '~/lib/badges';
import { getSession } from '~/lib/session';

export const Route = createFileRoute('/api/badges' as const)({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await getSession(request);
        if (!session) {
          return Response.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const workosId = session.workosId;

        const db = (env as { DB?: D1Database }).DB;
        if (!db) {
          return new Response('Database not available', { status: 500 });
        }

        const drizzleDb = createDb(db);

        const [streakRecord] = await drizzleDb
          .select()
          .from(userStreaks)
          .where(eq(userStreaks.workosId, workosId));

        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDay() === 0 ? today.getDate() - 6 : today.getDate() - today.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        const startDateStr = startOfWeek.toISOString().split('T')[0];

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

        const badges = await calculateAllBadges(db, workosId);

        return Response.json({
          currentStreak: streakRecord?.currentStreak ?? 0,
          longestStreak: streakRecord?.longestStreak ?? 0,
          weeklyWorkouts: workoutDatesInWeek.size,
          totalWorkouts: 0,
          badges,
          workoutDatesInWeek: Array.from(workoutDatesInWeek),
        });
      },
    },
  },
});

export default function ApiBadges() {
  return null;
}

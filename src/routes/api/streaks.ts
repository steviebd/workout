import { createFileRoute } from '@tanstack/react-router';
import { eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { createDb } from '~/lib/db';
import { userStreaks } from '~/lib/db/schema';
import { getWeeklyWorkouts, getTotalWorkouts } from '~/lib/streaks';
import { getSession } from '~/lib/session';

export const Route = createFileRoute('/api/streaks' as const)({
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

        const weeklyWorkouts = await getWeeklyWorkouts(db, workosId);
        const totalWorkouts = await getTotalWorkouts(db, workosId);

        return Response.json({
          currentStreak: streakRecord?.currentStreak ?? 0,
          longestStreak: streakRecord?.longestStreak ?? 0,
          weeklyWorkouts,
          totalWorkouts,
        });
      },
    },
  },
});

export default function ApiStreaks() {
  return null;
}

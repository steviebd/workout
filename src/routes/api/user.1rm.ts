import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getLatestOneRMs } from '~/lib/db/program';
import { getSession } from '~/lib/session';

export const Route = createFileRoute('/api/user/1rm')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await getSession(request);
          if (!session?.sub) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const oneRMs = await getLatestOneRMs(db, session.sub);

          if (!oneRMs) {
            return Response.json({
              squat1rm: null,
              bench1rm: null,
              deadlift1rm: null,
              ohp1rm: null,
            });
          }

          return Response.json(oneRMs);
        } catch (err) {
          console.error('Get latest 1RM error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiUser1rm() {
  return null;
}

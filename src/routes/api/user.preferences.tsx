import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getUserPreferences } from '~/lib/db/preferences';
import { requireAuth } from '~/lib/api/route-helpers';

export const Route = createFileRoute('/api/user/preferences')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await requireAuth(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const prefs = await getUserPreferences(db, session.sub);
          if (!prefs) {
            return Response.json({ weightUnit: 'kg', dateFormat: 'dd/mm/yyyy', theme: 'light' });
          }
          return Response.json(prefs);
        } catch (err) {
          console.error('Get preferences error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiUserPreferences() {
  return null;
}

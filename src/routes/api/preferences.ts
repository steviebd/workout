import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { type UpdatePreferencesData, getUserPreferences, upsertUserPreferences } from '../../lib/db/preferences';
import { getSession } from '../../lib/session';

export const Route = createFileRoute('/api/preferences')({
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

           const preferences = await getUserPreferences(db, session.workosId);

          return Response.json(preferences ?? { weightUnit: 'kg', theme: 'light', dateFormat: 'dd/mm/yyyy' });
        } catch (err) {
          console.error('Get preferences error:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          return Response.json({ error: 'Server error', details: errorMessage }, { status: 500 });
        }
      },
      PUT: async ({ request }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

        const body = await request.json();
        const { weightUnit, theme, dateFormat } = body as UpdatePreferencesData;

        const db = (env as { DB?: D1Database }).DB;
        if (!db) {
          return Response.json({ error: 'Database not available' }, { status: 500 });
        }

         const preferences = await upsertUserPreferences(db, session.workosId, {
          weightUnit,
          theme,
          dateFormat,
        });

          return Response.json(preferences);
        } catch (err) {
          console.error('Update preferences error:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          return Response.json({ error: 'Server error', details: errorMessage }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiPreferences() {
  return null;
}

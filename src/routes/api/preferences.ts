import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { type UpdatePreferencesData, getUserPreferences, upsertUserPreferences } from '../../lib/db/preferences';
import { requireAuth } from '../../lib/api/route-helpers';

export const Route = createFileRoute('/api/preferences')({
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

           const preferences = await getUserPreferences(db, session.sub);

           return Response.json(preferences ?? { weightUnit: 'kg', theme: 'light', dateFormat: 'dd/mm/yyyy', weeklyWorkoutTarget: 3 });
         } catch (err) {
           console.error('Get preferences error:', err);
           return Response.json({ error: 'Server error' }, { status: 500 });
         }
       },
       PUT: async ({ request }) => {
        try {
          const session = await requireAuth(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

        const body = await request.json();
        const { weightUnit, theme, dateFormat, weeklyWorkoutTarget } = body as UpdatePreferencesData;

        const db = (env as { DB?: D1Database }).DB;
        if (!db) {
          return Response.json({ error: 'Database not available' }, { status: 500 });
        }

         const preferences = await upsertUserPreferences(db, session.sub, {
          weightUnit,
          theme,
          dateFormat,
          weeklyWorkoutTarget,
        });

           return Response.json(preferences);
         } catch (err) {
           console.error('Update preferences error:', err);
           return Response.json({ error: 'Server error' }, { status: 500 });
         }
       },
    },
  },
});

export default function ApiPreferences() {
  return null;
}

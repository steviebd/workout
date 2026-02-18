import { createFileRoute } from '@tanstack/react-router';
import { apiRoute } from '~/lib/api/api-route';
import { getUserPreferences } from '~/lib/db/preferences';

export const Route = createFileRoute('/api/user/preferences')({
  server: {
    handlers: {
      GET: apiRoute('Get user preferences', async ({ d1Db, session }) => {
        const prefs = await getUserPreferences(d1Db, session.sub);
        if (!prefs) {
          return Response.json({ weightUnit: 'kg', dateFormat: 'dd/mm/yyyy', theme: 'light' });
        }
        return Response.json(prefs);
      }),
    },
  },
});

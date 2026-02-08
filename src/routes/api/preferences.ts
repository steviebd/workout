import { createFileRoute } from '@tanstack/react-router';
import { type UpdatePreferencesData, getUserPreferences, upsertUserPreferences } from '../../lib/db/preferences';
import { withApiContext } from '../../lib/api/context';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';

export const Route = createFileRoute('/api/preferences')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { session, d1Db } = await withApiContext(request);

          const preferences = await getUserPreferences(d1Db, session.sub);

          return Response.json(preferences ?? { weightUnit: 'kg', theme: 'light', dateFormat: 'dd/mm/yyyy', weeklyWorkoutTarget: 3 });
        } catch (err) {
          console.error('Get preferences error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
      PUT: async ({ request }) => {
        try {
          const { session, d1Db } = await withApiContext(request);

          const body = await request.json();
          const { weightUnit, theme, dateFormat, weeklyWorkoutTarget } = body as UpdatePreferencesData;

          const preferences = await upsertUserPreferences(d1Db, session.sub, {
            weightUnit,
            theme,
            dateFormat,
            weeklyWorkoutTarget,
          });

          return Response.json(preferences);
        } catch (err) {
          console.error('Update preferences error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
    },
  },
});

export default function ApiPreferences() {
  return null;
}

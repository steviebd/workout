import { createFileRoute } from '@tanstack/react-router';
import { getUserPreferences, upsertUserPreferences } from '../../lib/db/preferences';
import { apiRoute } from '~/lib/api/handler';
import { createApiError, API_ERROR_CODES } from '~/lib/api/errors';
import { validateBody } from '~/lib/api/route-helpers';
import { updatePreferencesSchema } from '~/lib/validators';

export const Route = createFileRoute('/api/preferences')({
  server: {
    handlers: {
      GET: apiRoute('Get preferences', async ({ session, d1Db }) => {
        const preferences = await getUserPreferences(d1Db, session.sub);

        return Response.json(preferences ?? { weightUnit: 'kg', theme: 'light', dateFormat: 'dd/mm/yyyy', weeklyWorkoutTarget: 3 });
      }),
      PUT: apiRoute('Update preferences', async ({ session, d1Db, request }) => {
        const body = await validateBody(request, updatePreferencesSchema);
        if (!body) {
          return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }
        const { weightUnit, theme, dateFormat, weeklyWorkoutTarget } = body;

        const preferences = await upsertUserPreferences(d1Db, session.sub, {
          weightUnit,
          theme,
          dateFormat,
          weeklyWorkoutTarget,
        });

        return Response.json(preferences);
      }),
    },
  },
});

export default function ApiPreferences() {
  return null;
}

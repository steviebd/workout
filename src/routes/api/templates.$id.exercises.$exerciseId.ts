import { createFileRoute } from '@tanstack/react-router';
import { removeExerciseFromTemplate } from '../../lib/db/template';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { apiRouteWithParams } from '~/lib/api/handler';

export const Route = createFileRoute('/api/templates/$id/exercises/$exerciseId')({
  server: {
    handlers: {
      DELETE: apiRouteWithParams('Remove exercise from template', async ({ d1Db, session, params }) => {
        const { id, exerciseId } = params;

        const removed = await removeExerciseFromTemplate(
          d1Db,
          id,
          exerciseId,
          session.sub
        );

        if (!removed) {
          return createApiError('Template or exercise not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        return new Response(null, { status: 204 });
      }),
    },
  },
});

export default function ApiTemplateExerciseId() {
  return null;
}

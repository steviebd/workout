import { createFileRoute } from '@tanstack/react-router';
import { reorderTemplateExercises } from '../../lib/db/template';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { validateBody } from '~/lib/api/route-helpers';
import { reorderTemplateExercisesSchema } from '~/lib/validators';
import { apiRouteWithParams } from '~/lib/api/handler';

export const Route = createFileRoute('/api/templates/$id/exercises/reorder')({
  server: {
    handlers: {
      PUT: apiRouteWithParams('Reorder template exercises', async ({ db, session, params, request }) => {
        const body = await validateBody(request, reorderTemplateExercisesSchema);
        if (!body) {
          return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }
        const { exerciseOrders } = body;

        const reordered = await reorderTemplateExercises(
          db,
          params.id,
          exerciseOrders,
          session.sub
        );

        if (!reordered) {
          return createApiError('Template not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        return new Response(null, { status: 204 });
      }),
    },
  },
});

export default function ApiTemplateExercisesReorder() {
  return null;
}

import { createFileRoute } from '@tanstack/react-router';
import { addExerciseToTemplate, getTemplateExercises } from '../../lib/db/template';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { validateBody } from '~/lib/api/route-helpers';
import { addExerciseToTemplateSchema } from '~/lib/validators';
import { apiRouteWithParams } from '~/lib/api/handler';

export const Route = createFileRoute('/api/templates/$id/exercises')({
  server: {
    handlers: {
      GET: apiRouteWithParams('Get template exercises', async ({ db, session, params }) => {
        const exercises = await getTemplateExercises(db, params.id, session.sub);

        return Response.json(exercises, {
          headers: {
            'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
          },
        });
      }),
      POST: apiRouteWithParams('Add exercise to template', async ({ d1Db, params, request }) => {
        const body = await validateBody(request, addExerciseToTemplateSchema);
        if (!body) {
          return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }
        const { exerciseId, orderIndex } = body;

        await addExerciseToTemplate(
          d1Db,
          params.id,
          exerciseId,
          orderIndex ?? 0
        );

        return Response.json({ success: true }, { status: 201 });
      }),
    },
  },
});

export default function ApiTemplateExercises() {
  return null;
}

import { createFileRoute } from '@tanstack/react-router';
import { getExerciseById, softDeleteExercise, updateExercise } from '../../lib/db/exercise';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { validateBody } from '~/lib/api/route-helpers';
import { updateExerciseSchema } from '~/lib/validators';
import { apiRouteWithParams } from '~/lib/api/handler';

export const Route = createFileRoute('/api/exercises/$id')({
  server: {
    handlers: {
      GET: apiRouteWithParams('Get exercise', async ({ session, d1Db, params }) => {
        const exercise = await getExerciseById(d1Db, params.id, session.sub);

        if (!exercise) {
          return createApiError('Exercise not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        return Response.json(exercise);
      }),
      PUT: apiRouteWithParams('Update exercise', async ({ session, d1Db, params, request }) => {
        const body = await validateBody(request, updateExerciseSchema);
        if (!body) {
          return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }
        const { name, muscleGroup, description } = body;

        const exercise = await updateExercise(d1Db, params.id, session.sub, {
          name,
          muscleGroup,
          description,
        });

        if (!exercise) {
          return createApiError('Exercise not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        return Response.json(exercise);
      }),
      DELETE: apiRouteWithParams('Delete exercise', async ({ session, d1Db, params }) => {
        const deleted = await softDeleteExercise(d1Db, params.id, session.sub);

        if (!deleted) {
          return createApiError('Exercise not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        return new Response(null, { status: 204 });
      }),
    },
  },
});

export default function ApiExerciseId() {
  return null;
}

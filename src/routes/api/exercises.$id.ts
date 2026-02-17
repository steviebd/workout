import { createFileRoute } from '@tanstack/react-router';
import { getExerciseById, softDeleteExercise, updateExercise } from '../../lib/db/exercise';
import { withApiContext } from '../../lib/api/context';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { validateBody } from '~/lib/api/route-helpers';
import { updateExerciseSchema } from '~/lib/validators';

export const Route = createFileRoute('/api/exercises/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { session, d1Db } = await withApiContext(request);

          const exercise = await getExerciseById(d1Db, params.id, session.sub);

          if (!exercise) {
            return createApiError('Exercise not found', 404, API_ERROR_CODES.NOT_FOUND);
          }

          return Response.json(exercise);
        } catch (err) {
          console.error('Get exercise error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
      PUT: async ({ request, params }) => {
        try {
          const { session, d1Db } = await withApiContext(request);

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
        } catch (err) {
          console.error('Update exercise error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          const { session, d1Db } = await withApiContext(request);

          const deleted = await softDeleteExercise(d1Db, params.id, session.sub);

          if (!deleted) {
            return createApiError('Exercise not found', 404, API_ERROR_CODES.NOT_FOUND);
          }

          return new Response(null, { status: 204 });
        } catch (err) {
          console.error('Delete exercise error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
    },
  },
});

export default function ApiExerciseId() {
  return null;
}

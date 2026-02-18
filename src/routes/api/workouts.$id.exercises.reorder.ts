import { createFileRoute } from '@tanstack/react-router';
import { reorderWorkoutExercises } from '../../lib/db/workout';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { validateBody } from '~/lib/api/route-helpers';
import { reorderWorkoutExercisesSchema } from '~/lib/validators';
import { apiRouteWithParams } from '~/lib/api/handler';

export const Route = createFileRoute('/api/workouts/$id/exercises/reorder')({
  server: {
    handlers: {
      PUT: apiRouteWithParams('Reorder exercises', async ({ db, session, params, request }) => {
        const body = await validateBody(request, reorderWorkoutExercisesSchema);
        if (!body) {
          return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }
        const { exerciseOrders } = body;

        const reordered = await reorderWorkoutExercises(db, params.id, exerciseOrders, session.sub);

        if (!reordered) {
          return createApiError('Workout not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        return Response.json({ success: true });
      }),
    },
  },
});

export default function ApiWorkoutExercisesReorder() {
  return null;
}

import { createFileRoute } from '@tanstack/react-router';
import {
  createWorkoutExercise,
  getWorkoutExercises,
  removeWorkoutExercise,
  reorderWorkoutExercises
} from '../../lib/db/workout';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { parseQueryParams , apiRouteWithParams } from '~/lib/api/handler';
import { validateBody } from '~/lib/api/route-helpers';
import { createWorkoutExerciseSchema, reorderWorkoutExercisesSchema } from '~/lib/validators';

export const Route = createFileRoute('/api/workouts/$id/exercises')({
  server: {
    handlers: {
      GET: apiRouteWithParams('Get workout exercises', async ({ db, session, params }) => {
        const exercises = await getWorkoutExercises(db, params.id, session.sub);
        return Response.json(exercises);
      }),
      POST: apiRouteWithParams('Add exercise', async ({ d1Db, session, params, request }) => {
        const body = await validateBody(request, createWorkoutExerciseSchema);
        if (!body) {
          return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }
        const { exerciseId, orderIndex, notes, localId } = body;

        const workoutExercise = await createWorkoutExercise(
          d1Db,
          params.id,
          session.sub,
          exerciseId,
          orderIndex,
          notes,
          localId
        );

        if (!workoutExercise) {
          return createApiError('Workout not found or does not belong to you', 404, API_ERROR_CODES.NOT_FOUND);
        }

        return Response.json(workoutExercise, { status: 201 });
      }),
      DELETE: apiRouteWithParams('Remove exercise', async ({ d1Db, session, params, request }) => {
        const url = new URL(request.url);
        const { exerciseId } = parseQueryParams<{
          exerciseId?: string;
        }>(url);

        if (!exerciseId) {
          return createApiError('Exercise ID is required', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }

        const removed = await removeWorkoutExercise(d1Db, params.id, exerciseId, session.sub);

        if (!removed) {
          return createApiError('Exercise not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        return new Response(null, { status: 204 });
      }),
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

export default function ApiWorkoutExercises() {
  return null;
}

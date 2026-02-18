import { createFileRoute } from '@tanstack/react-router';
import {
  deleteWorkout,
  getWorkoutWithExercises,
  updateWorkout
} from '../../lib/db/workout';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { updateWorkoutSchema } from '~/lib/validators';
import { validateBody } from '~/lib/api/route-helpers';
import { apiRouteWithParams } from '~/lib/api/handler';

export const Route = createFileRoute('/api/workouts/$id')({
  server: {
    handlers: {
      GET: apiRouteWithParams('Get workout', async ({ session, d1Db, params }) => {
        const workout = await getWorkoutWithExercises(d1Db, params.id, session.sub);

        if (!workout) {
          return createApiError('Workout not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        const response = {
          ...workout,
          exercises: workout.exercises.map(ex => ({
            id: ex.id,
            exerciseId: ex.exerciseId,
            name: ex.exercise?.name ?? 'Unknown Exercise',
            muscleGroup: ex.exercise?.muscleGroup ?? null,
            orderIndex: ex.orderIndex,
            notes: ex.notes,
            sets: ex.sets,
          })),
        };

        return Response.json(response, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        });
      }),
      PUT: apiRouteWithParams('Update workout', async ({ session, d1Db, params, request }) => {
        const body = await validateBody(request, updateWorkoutSchema);
        if (!body) {
          return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }

        const workout = await updateWorkout(d1Db, params.id, session.sub, body);

        if (!workout) {
          return createApiError('Workout not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        return Response.json(workout);
      }),
      DELETE: apiRouteWithParams('Delete workout', async ({ session, d1Db, params }) => {
        const deleted = await deleteWorkout(d1Db, params.id, session.sub);

        if (!deleted) {
          return createApiError('Workout not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        return new Response(null, { status: 204 });
      }),
    },
  },
});

export default function ApiWorkoutId() {
  return null;
}

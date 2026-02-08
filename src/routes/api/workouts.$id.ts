import { createFileRoute } from '@tanstack/react-router'
import {
  deleteWorkout,
  getWorkoutWithExercises,
  updateWorkout
} from '../../lib/db/workout';
import { withApiContext } from '../../lib/api/context';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { updateWorkoutSchema } from '~/lib/validators';
import { validateBody } from '~/lib/api/route-helpers';

export const Route = createFileRoute('/api/workouts/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { session, d1Db } = await withApiContext(request);

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
        } catch (err) {
          console.error('Get workout error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
      PUT: async ({ request, params }) => {
        try {
          const { session, d1Db } = await withApiContext(request);

          const body = await validateBody(request, updateWorkoutSchema);
          if (!body) {
            return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
          }

          const workout = await updateWorkout(d1Db, params.id, session.sub, body);

          if (!workout) {
            return createApiError('Workout not found', 404, API_ERROR_CODES.NOT_FOUND);
          }

          return Response.json(workout);
        } catch (err) {
          console.error('Update workout error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          const { session, d1Db } = await withApiContext(request);

          const deleted = await deleteWorkout(d1Db, params.id, session.sub);

          if (!deleted) {
            return createApiError('Workout not found', 404, API_ERROR_CODES.NOT_FOUND);
          }

          return new Response(null, { status: 204 });
        } catch (err) {
          console.error('Delete workout error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
    },
  },
});

export default function ApiWorkoutId() {
  return null;
}

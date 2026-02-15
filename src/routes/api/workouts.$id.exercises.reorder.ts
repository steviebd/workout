import { createFileRoute } from '@tanstack/react-router';
import { type ExerciseOrder, reorderWorkoutExercises } from '../../lib/db/workout';
import { withApiContext } from '../../lib/api/context';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';

export const Route = createFileRoute('/api/workouts/$id/exercises/reorder')({
  server: {
    handlers: {
       PUT: async ({ request, params }) => {
          try {
            const { db, session } = await withApiContext(request);

            const body = await request.json();
            const { exerciseOrders } = body as { exerciseOrders: ExerciseOrder[] };

            if (!exerciseOrders || !Array.isArray(exerciseOrders)) {
              return createApiError('Exercise orders array is required', 400, API_ERROR_CODES.VALIDATION_ERROR);
            }

            const reordered = await reorderWorkoutExercises(db, params.id, exerciseOrders, session.sub);

            if (!reordered) {
              return createApiError('Workout not found', 404, API_ERROR_CODES.NOT_FOUND);
            }

            return Response.json({ success: true });
          } catch (err) {
            console.error('Reorder exercises error:', err);
            return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
          }
        },
    },
  },
});

export default function ApiWorkoutExercisesReorder() {
  return null;
}
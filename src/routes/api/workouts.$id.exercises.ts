import { createFileRoute } from '@tanstack/react-router';
import {
  type ExerciseOrder,
  createWorkoutExercise,
  getWorkoutExercises,
  removeWorkoutExercise,
  reorderWorkoutExercises
} from '../../lib/db/workout';
import { withApiContext } from '../../lib/api/context';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';

export const Route = createFileRoute('/api/workouts/$id/exercises')({
  server: {
    handlers: {
       GET: async ({ request, params }) => {
          try {
            const { db, session } = await withApiContext(request);

            const exercises = await getWorkoutExercises(db, params.id, session.sub);
            return Response.json(exercises);
          } catch (err) {
            console.error('Get workout exercises error:', err);
            return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
          }
        },
       POST: async ({ request, params }) => {
          try {
            const { d1Db, session } = await withApiContext(request);

            const body = await request.json();
            const { exerciseId, orderIndex, notes, localId } = body as { exerciseId: string; orderIndex: number; notes?: string; localId?: string };

            if (!exerciseId || orderIndex === undefined) {
              return createApiError('Exercise ID and order index are required', 400, API_ERROR_CODES.VALIDATION_ERROR);
            }

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
          } catch (err) {
            console.error('Add exercise error:', err);
            return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
          }
        },
       DELETE: async ({ request, params }) => {
          try {
            const { d1Db, session } = await withApiContext(request);

            const url = new URL(request.url);
            const exerciseId = url.searchParams.get('exerciseId');

            if (!exerciseId) {
              return createApiError('Exercise ID is required', 400, API_ERROR_CODES.VALIDATION_ERROR);
            }

            const removed = await removeWorkoutExercise(d1Db, params.id, exerciseId, session.sub);

            if (!removed) {
              return createApiError('Exercise not found', 404, API_ERROR_CODES.NOT_FOUND);
            }

            return new Response(null, { status: 204 });
          } catch (err) {
            console.error('Remove exercise error:', err);
            return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
          }
      },
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

export default function ApiWorkoutExercises() {
  return null;
}

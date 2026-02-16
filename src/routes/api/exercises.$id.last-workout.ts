import { createFileRoute } from '@tanstack/react-router';
import { getLastWorkoutForExercise } from '../../lib/db/workout';
import { withApiContext } from '../../lib/api/context';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';

export const Route = createFileRoute('/api/exercises/$id/last-workout')({
  server: {
    handlers: {
        GET: async ({ request, params }) => {
          try {
            const { d1Db, session } = await withApiContext(request);

            const lastWorkout = await getLastWorkoutForExercise(d1Db, session.sub, params.id);

            if (!lastWorkout) {
              return Response.json(null);
            }

            return Response.json(lastWorkout);
          } catch (err) {
            console.error('Get last workout error:', err);
            return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
          }
        },
    },
  },
});

export default function ApiExerciseLastWorkout() {
  return null;
}

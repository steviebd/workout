import { createFileRoute } from '@tanstack/react-router';
import { getLastWorkoutSetsForExercise } from '../../lib/db/workout';
import { withApiContext } from '../../lib/api/context';
import { createApiError } from '../../lib/api/errors';

export const Route = createFileRoute('/api/exercises/$id/last-workout-sets')({
  server: {
    handlers: {
        GET: async ({ request, params }) => {
          try {
            const { d1Db, session } = await withApiContext(request);

            const lastWorkoutSets = await getLastWorkoutSetsForExercise(d1Db, session.sub, params.id);

            return Response.json({
              exerciseId: params.id,
              sets: lastWorkoutSets,
              totalSets: lastWorkoutSets.length,
            });
          } catch (err) {
            console.error('Get last workout sets error:', err);
            return createApiError('Server error', 500, 'SERVER_ERROR');
          }
        },
    },
  },
});

export default function ApiExerciseLastWorkoutSets() {
  return null;
}

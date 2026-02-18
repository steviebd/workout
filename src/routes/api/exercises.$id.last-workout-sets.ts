import { createFileRoute } from '@tanstack/react-router';
import { getLastWorkoutSetsForExercise } from '../../lib/db/workout';
import { apiRouteWithParams } from '~/lib/api/handler';

export const Route = createFileRoute('/api/exercises/$id/last-workout-sets')({
  server: {
    handlers: {
      GET: apiRouteWithParams('Get last workout sets', async ({ d1Db, session, params }) => {
        const lastWorkoutSets = await getLastWorkoutSetsForExercise(d1Db, session.sub, params.id);

        return Response.json({
          exerciseId: params.id,
          sets: lastWorkoutSets,
          totalSets: lastWorkoutSets.length,
        });
      }),
    },
  },
});

export default function ApiExerciseLastWorkoutSets() {
  return null;
}

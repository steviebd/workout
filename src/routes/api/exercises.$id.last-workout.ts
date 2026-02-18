import { createFileRoute } from '@tanstack/react-router';
import { getLastWorkoutForExercise } from '../../lib/db/workout';
import { apiRouteWithParams } from '~/lib/api/handler';

export const Route = createFileRoute('/api/exercises/$id/last-workout')({
  server: {
    handlers: {
      GET: apiRouteWithParams('Get last workout', async ({ d1Db, session, params }) => {
        const lastWorkout = await getLastWorkoutForExercise(d1Db, session.sub, params.id);

        if (!lastWorkout) {
          return Response.json(null);
        }

        return Response.json(lastWorkout);
      }),
    },
  },
});

export default function ApiExerciseLastWorkout() {
  return null;
}

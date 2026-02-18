import { createFileRoute } from '@tanstack/react-router';
import { createWorkoutSet } from '../../lib/db/workout';
import { apiRoute } from '~/lib/api/handler';
import { createApiError, API_ERROR_CODES } from '~/lib/api/errors';
import { validateBody } from '~/lib/api/route-helpers';
import { createWorkoutSetSchema } from '~/lib/validators';

export const Route = createFileRoute('/api/workouts/sets')({
  server: {
    handlers: {
      POST: apiRoute('Create set', async ({ d1Db, session, request }) => {
        const body = await validateBody(request, createWorkoutSetSchema);
        if (!body) {
          return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }
        const { workoutExerciseId, setNumber, weight, reps, rpe, localId } = body;

        const workoutSet = await createWorkoutSet(
          d1Db,
          workoutExerciseId,
          session.sub,
          setNumber,
          weight,
          reps,
          rpe,
          localId
        );

        if (!workoutSet) {
          return createApiError('Workout exercise not found or does not belong to you', 404, API_ERROR_CODES.NOT_FOUND);
        }

        return Response.json(workoutSet, { status: 201 });
      }),
    },
  },
});

export default function ApiWorkoutSets() {
  return null;
}

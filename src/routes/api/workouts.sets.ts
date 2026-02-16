import { createFileRoute } from '@tanstack/react-router';
import { createWorkoutSet } from '../../lib/db/workout';
import { withApiContext } from '../../lib/api/context';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { validateBody } from '~/lib/api/route-helpers';
import { createWorkoutSetSchema } from '~/lib/validators';

export const Route = createFileRoute('/api/workouts/sets')({
  server: {
    handlers: {
       POST: async ({ request }) => {
           try {
             const { d1Db, session } = await withApiContext(request);

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
          } catch (err) {
            console.error('Create set error:', err);
            return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
          }
        },
    },
  },
});

export default function ApiWorkoutSets() {
  return null;
}

import { createFileRoute } from '@tanstack/react-router';
import { createWorkoutSet } from '../../lib/db/workout';
import { withApiContext } from '../../lib/api/context';
import { createApiError } from '../../lib/api/errors';

export const Route = createFileRoute('/api/workouts/sets')({
  server: {
    handlers: {
       POST: async ({ request }) => {
          try {
            const { d1Db, session } = await withApiContext(request);

            const body = await request.json();
            const { workoutExerciseId, setNumber, weight, reps, rpe, localId } = body as {
              workoutExerciseId: string;
              setNumber: number;
              weight?: number;
              reps?: number;
              rpe?: number;
              localId?: string;
            };

            if (!workoutExerciseId || setNumber === undefined) {
              return createApiError('Workout exercise ID and set number are required', 400, 'VALIDATION_ERROR');
            }

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
              return createApiError('Workout exercise not found or does not belong to you', 404, 'NOT_FOUND');
            }

            return Response.json(workoutSet, { status: 201 });
          } catch (err) {
            console.error('Create set error:', err);
            return createApiError('Server error', 500, 'SERVER_ERROR');
          }
        },
    },
  },
});

export default function ApiWorkoutSets() {
  return null;
}

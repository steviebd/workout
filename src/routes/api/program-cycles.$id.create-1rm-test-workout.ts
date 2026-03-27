import { createFileRoute } from '@tanstack/react-router';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { getProgramCycleById } from '~/lib/db/program';
import { createWorkout, createWorkoutExercise, createWorkoutSet } from '~/lib/db/workout';
import { getExercisesByWorkosId, createExercise } from '~/lib/db/exercise';
import { apiRouteWithParams } from '~/lib/api/handler';

export const Route = createFileRoute('/api/program-cycles/$id/create-1rm-test-workout')({
  server: {
    handlers: {
      POST: apiRouteWithParams('Create 1RM test workout', async ({ d1Db, session, params }) => {
        const cycle = await getProgramCycleById(d1Db, params.id, session.sub);
        if (!cycle) {
          return createApiError('Program cycle not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        const workout = await createWorkout(d1Db, {
          workosId: session.sub,
          name: '1RM Test',
          programCycleId: params.id,
        });

        const mainLifts = [
          { name: 'Squat', muscleGroup: 'Legs' },
          { name: 'Bench Press', muscleGroup: 'Chest' },
          { name: 'Deadlift', muscleGroup: 'Back' },
          { name: 'Overhead Press', muscleGroup: 'Shoulders' },
        ];

        await Promise.all(mainLifts.map(async (lift) => {
          const exercises = await getExercisesByWorkosId(d1Db, session.sub, { search: lift.name, limit: 1 });
          let exercise = exercises.find(e => e.name.toLowerCase() === lift.name.toLowerCase());

          exercise ??= await createExercise(d1Db, {
            workosId: session.sub,
            name: lift.name,
            muscleGroup: lift.muscleGroup,
          });

          const workoutExercise = await createWorkoutExercise(
            d1Db,
            workout.id,
            session.sub,
            exercise.id,
            0
          );

          if (workoutExercise) {
            await createWorkoutSet(
              d1Db,
              workoutExercise.id,
              session.sub,
              1,
              0,
              1
            );
          }
        }));

        return Response.json({ workoutId: workout.id, workoutName: workout.name }, { status: 201 });
      }),
    },
  },
});

export default function ApiProgramCycleCreate1rmTestWorkout() {
  return null;
}

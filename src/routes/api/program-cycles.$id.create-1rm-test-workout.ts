import { createFileRoute } from '@tanstack/react-router';
import { withApiContext } from '../../lib/api/context';
import { createApiError } from '../../lib/api/errors';
import { getProgramCycleById } from '~/lib/db/program';
import { createWorkout, createWorkoutExercise, createWorkoutSet } from '~/lib/db/workout';
import { getExercisesByWorkosId, createExercise } from '~/lib/db/exercise';

export const Route = createFileRoute('/api/program-cycles/$id/create-1rm-test-workout')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const { d1Db, session } = await withApiContext(request);

          const cycle = await getProgramCycleById(d1Db, params.id, session.sub);
          if (!cycle) {
            return createApiError('Program cycle not found', 404, 'NOT_FOUND');
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

          let orderIndex = 0;
          for (const lift of mainLifts) {
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
              orderIndex
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

            orderIndex++;
          }

          return Response.json({ workoutId: workout.id, workoutName: workout.name }, { status: 201 });
        } catch (err) {
          console.error('Create 1RM test workout error:', err);
          return createApiError('Server error', 500, 'SERVER_ERROR');
        }
      },
    },
  },
});

export default function ApiProgramCycleCreate1rmTestWorkout() {
  return null;
}

import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getProgramCycleById } from '~/lib/db/program';
import { getSession } from '~/lib/session';
import { createWorkout, createWorkoutExercise, createWorkoutSet } from '~/lib/db/workout';
import { getExercisesByWorkosId, createExercise } from '~/lib/db/exercise';

export const Route = createFileRoute('/api/program-cycles/$id/create-1rm-test-workout')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const cycle = await getProgramCycleById(db, params.id, session.workosId);
          if (!cycle) {
            return Response.json({ error: 'Program cycle not found' }, { status: 404 });
          }

          const workout = await createWorkout(db, {
            workosId: session.workosId,
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
            const exercises = await getExercisesByWorkosId(db, session.workosId, { search: lift.name, limit: 1 });
            let exercise = exercises.find(e => e.name.toLowerCase() === lift.name.toLowerCase());
            
            exercise ??= await createExercise(db, {
              workosId: session.workosId,
              name: lift.name,
              muscleGroup: lift.muscleGroup,
            });

            const workoutExercise = await createWorkoutExercise(
              db,
              workout.id,
              session.workosId,
              exercise.id,
              orderIndex
            );

            if (workoutExercise) {
              await createWorkoutSet(
                db,
                workoutExercise.id,
                session.workosId,
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
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiProgramCycleCreate1rmTestWorkout() {
  return null;
}

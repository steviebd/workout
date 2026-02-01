import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getProgramCycleById, getCurrentWorkout } from '~/lib/db/program';
import { getSession } from '~/lib/session';
import { createWorkout, createWorkoutExercise, createWorkoutSet } from '~/lib/db/workout';
import { getTemplateById, getTemplateExercises } from '~/lib/db/template';

export const Route = createFileRoute('/api/program-cycles/$id/start-workout')({
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

          if (cycle.status === 'completed') {
            return Response.json({ error: 'Program cycle is already completed' }, { status: 400 });
          }

          const currentWorkout = await getCurrentWorkout(db, params.id, session.workosId);
          if (!currentWorkout) {
            const cycleCheck = await getProgramCycleById(db, params.id, session.workosId);
            if (!cycleCheck) {
              return Response.json({ error: 'Program cycle not found' }, { status: 404 });
            }
            return Response.json({ error: 'No pending workouts found for this cycle. The cycle may not have any workouts assigned.' }, { status: 404 });
          }

          const template = await getTemplateById(db, currentWorkout.templateId, session.workosId);
          if (!template) {
            return Response.json({ error: 'Template not found' }, { status: 404 });
          }

          const templateExercises = await getTemplateExercises(db, template.id, session.workosId);

          const workout = await createWorkout(db, {
            workosId: session.workosId,
            templateId: template.id,
            programCycleId: template.programCycleId ?? undefined,
            name: template.name,
          });

          for (const templateExercise of templateExercises) {
            const workoutExercise = await createWorkoutExercise(
              db,
              workout.id,
              session.workosId,
              templateExercise.exerciseId,
              templateExercise.orderIndex
            );

            if (workoutExercise) {
              const numSets = templateExercise.sets ?? 1;
              const targetWeight = templateExercise.targetWeight ?? 0;
              const reps = templateExercise.reps ?? 0;

              for (let setNumber = 1; setNumber <= numSets; setNumber++) {
                await createWorkoutSet(
                  db,
                  workoutExercise.id,
                  session.workosId,
                  setNumber,
                  targetWeight,
                  reps,
                  undefined
                );
              }
            }
          }

          return Response.json({ workoutId: workout.id, workoutName: workout.name }, { status: 201 });
        } catch (err) {
          console.error('Start workout error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiProgramCycleStartWorkout() {
  return null;
}

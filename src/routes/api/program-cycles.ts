import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import type { OneRMValues } from '~/lib/programs/types';
import {
  addWorkoutToCycle,
  createProgramCycle,
  getActiveProgramCycles,
  getProgramCyclesByWorkosId,
} from '~/lib/db/program';
import { getSession } from '~/lib/session';
import { stronglifts } from '~/lib/programs/stronglifts';
import { wendler531 } from '~/lib/programs/wendler531';
import { madcow } from '~/lib/programs/madcow';
import { createTemplate, addExerciseToTemplate } from '~/lib/db/template';
import { createExercise, getExercisesByWorkosId } from '~/lib/db/exercise';

const PROGRAM_MAP: Record<string, typeof stronglifts | typeof wendler531 | typeof madcow> = {
  'stronglifts-5x5': stronglifts,
  '531': wendler531,
  'madcow-5x5': madcow,
};

async function getOrCreateExercise(db: D1Database, workosId: string, name: string, muscleGroup: string) {
  const exercises = await getExercisesByWorkosId(db, workosId, { search: name, limit: 1 });
  let exercise = exercises.find(e => e.name.toLowerCase() === name.toLowerCase());
  exercise ??= await createExercise(db, {
    workosId,
    name,
    muscleGroup,
  });
  return exercise;
}

export const Route = createFileRoute('/api/program-cycles')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const url = new URL(request.url);
          const status = url.searchParams.get('status') ?? undefined;
          const activeOnly = url.searchParams.get('active') === 'true';

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          let cycles;
          if (activeOnly) {
            cycles = await getActiveProgramCycles(db, session.workosId);
          } else {
            cycles = await getProgramCyclesByWorkosId(db, session.workosId, { status });
          }

          return Response.json(cycles);
        } catch (err) {
          console.error('Get program cycles error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
      POST: async ({ request }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const body = await request.json();
          const { programSlug, squat1rm, bench1rm, deadlift1rm, ohp1rm } = body as {
            programSlug: string;
            squat1rm: number;
            bench1rm: number;
            deadlift1rm: number;
            ohp1rm: number;
          };

          if (!programSlug || !squat1rm || !bench1rm || !deadlift1rm || !ohp1rm) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
          }

          const programConfig = PROGRAM_MAP[programSlug];
          if (!programConfig) {
            return Response.json({ error: 'Invalid program' }, { status: 400 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const oneRMs: OneRMValues = { squat: squat1rm, bench: bench1rm, deadlift: deadlift1rm, ohp: ohp1rm };
          const workouts = programConfig.generateWorkouts(oneRMs);

          const cycle = await createProgramCycle(db, session.workosId, {
            programSlug,
            name: `${programConfig.info.name}`,
            squat1rm,
            bench1rm,
            deadlift1rm,
            ohp1rm,
            totalSessionsPlanned: workouts.length,
          });

          for (const workout of workouts) {
            const template = await createTemplate(db, {
              workosId: session.workosId,
              name: `${programConfig.info.name} - ${workout.sessionName}`,
              description: `Week ${workout.weekNumber} - ${workout.sessionName}`,
              programCycleId: cycle.id,
            });

            let orderIndex = 0;
            for (const exercise of workout.exercises) {
              const muscleGroup = exercise.lift === 'squat' || exercise.lift === 'deadlift' || exercise.lift === 'row' 
                ? 'Back' 
                : exercise.lift === 'bench' || exercise.lift === 'ohp' 
                  ? 'Chest' 
                  : 'Shoulders';
              
              const dbExercise = await getOrCreateExercise(db, session.workosId, exercise.name, muscleGroup);
              
              await addExerciseToTemplate(
                db, template.id, session.workosId, dbExercise.id, orderIndex,
                exercise.targetWeight, exercise.sets, exercise.reps
              );
              orderIndex++;
            }

            await addWorkoutToCycle(db, cycle.id, session.workosId, {
              templateId: template.id,
              weekNumber: workout.weekNumber,
              sessionNumber: workout.sessionNumber,
              sessionName: workout.sessionName,
              targetLifts: JSON.stringify(workout.exercises.map(e => ({ name: e.name, lift: e.lift, targetWeight: e.targetWeight, sets: e.sets, reps: e.reps }))),
            });
          }

          return Response.json(cycle, { status: 201 });
        } catch (err) {
          console.error('Create program cycle error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiProgramCycles() {
  return null;
}

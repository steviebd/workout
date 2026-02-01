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
import { nsuns } from '~/lib/programs/nsuns';
import { candito } from '~/lib/programs/candito';
import { sheiko } from '~/lib/programs/sheiko';
import { nuckols } from '~/lib/programs/nuckols';
import { createTemplate, addExerciseToTemplate, getTemplateExerciseSetCount } from '~/lib/db/template';
import { createExercise, getExercisesByWorkosId } from '~/lib/db/exercise';

const PROGRAM_MAP: Record<string, typeof stronglifts | typeof wendler531 | typeof madcow | typeof nsuns | typeof candito | typeof sheiko | typeof nuckols> = {
  'stronglifts-5x5': stronglifts,
  '531': wendler531,
  'madcow-5x5': madcow,
  'nsuns-lp': nsuns,
  'candito-6-week': candito,
  'sheiko': sheiko,
  'nuckols-28-programs': nuckols,
};

function normalizeExerciseName(name: string): string {
  return name.replace(/\s*\d+(\+)?$/, '').trim();
}

function getSetInfo(name: string, isAmrap?: boolean): { isAmrap: boolean; setNumber: number } {
  return {
    isAmrap: isAmrap ?? name.includes('+'),
    setNumber: 0,
  };
}

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

          const monthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          const cycleName = `${programConfig.info.name} - ${monthYear}`;

          const cycle = await createProgramCycle(db, session.workosId, {
            programSlug,
            name: cycleName,
            squat1rm,
            bench1rm,
            deadlift1rm,
            ohp1rm,
            totalSessionsPlanned: workouts.length,
          });

          for (const workout of workouts) {
            const template = await createTemplate(db, {
              workosId: session.workosId,
              name: `${cycleName} - ${workout.sessionName}`,
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

              const normalizedName = normalizeExerciseName(exercise.name);
              const dbExercise = await getOrCreateExercise(db, session.workosId, normalizedName, muscleGroup);

              const existingSets = await getTemplateExerciseSetCount(db, template.id, dbExercise.id);
              const nextSetNumber = existingSets + 1;

              const { isAmrap } = getSetInfo(exercise.name, exercise.isAmrap);

              await addExerciseToTemplate(
                db, template.id, session.workosId, dbExercise.id, orderIndex,
                exercise.targetWeight, exercise.sets, exercise.reps,
                isAmrap, nextSetNumber
              );
              orderIndex++;
            }

            const cycleWorkout = await addWorkoutToCycle(db, cycle.id, {
              templateId: template.id,
              weekNumber: workout.weekNumber,
              sessionNumber: workout.sessionNumber,
              sessionName: workout.sessionName,
              targetLifts: JSON.stringify(workout.exercises.map(e => ({ name: e.name, lift: e.lift, targetWeight: e.targetWeight, sets: e.sets, reps: e.reps }))),
            });
            
            if (!cycleWorkout) {
              throw new Error(`Failed to add workout ${workout.sessionName} to cycle`);
            }
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

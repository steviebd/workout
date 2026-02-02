import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import type { OneRMValues } from '~/lib/programs/types';
import {
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

const PROGRAM_MAP: Record<string, typeof stronglifts | typeof wendler531 | typeof madcow | typeof nsuns | typeof candito | typeof sheiko | typeof nuckols> = {
  'stronglifts-5x5': stronglifts,
  '531': wendler531,
  'madcow-5x5': madcow,
  'nsuns-lp': nsuns,
  'candito-6-week': candito,
  'sheiko': sheiko,
  'nuckols-28-programs': nuckols,
};

function generateUUID(): string {
  return crypto.randomUUID();
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

          const cycleWorkoutStatements = workouts.map((workout) => {
            const targetLifts = JSON.stringify([
              ...workout.exercises.map(e => ({ name: e.name, lift: e.lift, targetWeight: e.targetWeight, sets: e.sets, reps: e.reps })),
              ...(workout.accessories?.map(a => ({
                name: a.name,
                accessoryId: a.accessoryId,
                targetWeight: a.targetWeight,
                addedWeight: a.addedWeight,
                sets: a.sets,
                reps: a.reps,
                isAccessory: true,
                isRequired: a.isRequired,
              })) ?? []),
            ]);

            return db.prepare(
              `INSERT INTO program_cycle_workouts (id, cycle_id, template_id, week_number, session_number, session_name, target_lifts, is_complete, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
            ).bind(
              generateUUID(),
              cycle.id,
              null,
              workout.weekNumber,
              workout.sessionNumber,
              workout.sessionName,
              targetLifts
            );
          });
          await db.batch(cycleWorkoutStatements);

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

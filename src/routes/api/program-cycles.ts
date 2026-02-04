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
import { megsquats } from '~/lib/programs/megsquats';
import { jenSinkler } from '~/lib/programs/jen-sinkler';
import { generateWorkoutSchedule, DAYS_OF_WEEK } from '~/lib/programs/scheduler';

const PROGRAM_MAP: Record<string, typeof stronglifts | typeof wendler531 | typeof madcow | typeof nsuns | typeof candito | typeof sheiko | typeof nuckols | typeof megsquats | typeof jenSinkler> = {
  'stronglifts-5x5': stronglifts,
  '531': wendler531,
  'madcow-5x5': madcow,
  'nsuns-lp': nsuns,
  'candito-6-week': candito,
  'sheiko': sheiko,
  'nuckols-28-programs': nuckols,
      'stronger-by-the-day': megsquats,
      'unapologetically-strong': jenSinkler,
    };
interface CreateProgramCycleRequest {
  programSlug: string;
  squat1rm: number;
  bench1rm: number;
  deadlift1rm: number;
  ohp1rm: number;
  preferredGymDays: string[];
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening';
  programStartDate: string;
  firstSessionDate: string;
}

export const Route = createFileRoute('/api/program-cycles')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await getSession(request);
          if (!session?.sub) {
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
            cycles = await getActiveProgramCycles(db, session.sub);
          } else {
            cycles = await getProgramCyclesByWorkosId(db, session.sub, { status });
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
          if (!session?.sub) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const body = await request.json() as CreateProgramCycleRequest;
          const {
            programSlug,
            squat1rm,
            bench1rm,
            deadlift1rm,
            ohp1rm,
            preferredGymDays,
            preferredTimeOfDay,
            programStartDate,
            firstSessionDate,
          } = body;

          if (!programSlug || !squat1rm || !bench1rm || !deadlift1rm || !ohp1rm || !preferredGymDays || !programStartDate || !firstSessionDate) {
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
          const generatedWorkouts = programConfig.generateWorkouts(oneRMs);

          const monthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          const cycleName = `${programConfig.info.name} - ${monthYear}`;

          const schedule = generateWorkoutSchedule(
            generatedWorkouts,
            new Date(`${programStartDate}T00:00:00Z`),
            {
              preferredDays: preferredGymDays.map((d: string) => d.toLowerCase() as typeof DAYS_OF_WEEK[number]),
              preferredTimeOfDay: preferredTimeOfDay,
              forceFirstSessionDate: new Date(`${firstSessionDate}T00:00:00Z`),
            }
          );

          const workouts = schedule.map((w, index) => {
            const generatedWorkout = generatedWorkouts[index];
            return {
              weekNumber: w.weekNumber,
              sessionNumber: w.sessionNumber,
              sessionName: w.sessionName,
              scheduledDate: w.scheduledDate.toISOString().split('T')[0],
              scheduledTime: w.scheduledTime,
              targetLifts: JSON.stringify({
                exercises: generatedWorkout?.exercises ?? [],
                accessories: generatedWorkout?.accessories ?? [],
              }),
            };
          });

          const cycle = await createProgramCycle(db, session.sub, {
            programSlug,
            name: cycleName,
            squat1rm,
            bench1rm,
            deadlift1rm,
            ohp1rm,
            totalSessionsPlanned: workouts.length,
            preferredGymDays: preferredGymDays.join(','),
            preferredTimeOfDay,
            programStartDate,
            firstSessionDate,
            workouts,
          });

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

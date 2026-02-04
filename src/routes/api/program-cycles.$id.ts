import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getProgramCycleById, updateProgramCycle1RM, updateProgramCycleProgress, softDeleteProgramCycle, completeProgramCycle, getCycleWorkouts } from '~/lib/db/program';
import { getSession } from '~/lib/session';

interface ProgramCycleUpdateBody {
  squat1rm?: number;
  bench1rm?: number;
  deadlift1rm?: number;
  ohp1rm?: number;
  currentWeek?: number;
  currentSession?: number;
  isComplete?: boolean;
}

export const Route = createFileRoute('/api/program-cycles/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
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

          const workouts = await getCycleWorkouts(db, params.id, session.workosId);
          const completedCount = workouts.filter((w) => w.isComplete).length;

          const responseData = {
            ...cycle,
            preferredGymDays: cycle.preferredGymDays ? cycle.preferredGymDays.split(',') : [],
            totalSessionsCompleted: completedCount,
          };

          return Response.json(responseData);
        } catch (err) {
          console.error('Get program cycle error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
      PUT: async ({ request, params }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const body = await request.json() as ProgramCycleUpdateBody;
          const { squat1rm, bench1rm, deadlift1rm, ohp1rm, currentWeek, currentSession, isComplete } = body;

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          let updated;
          const has1RMUpdate = squat1rm !== undefined || bench1rm !== undefined || deadlift1rm !== undefined || ohp1rm !== undefined;
          const hasProgressUpdate = currentWeek !== undefined || currentSession !== undefined;
          
          if (has1RMUpdate) {
            updated = await updateProgramCycle1RM(db, params.id, session.workosId, { squat1rm, bench1rm, deadlift1rm, ohp1rm });
          }
          if (hasProgressUpdate) {
            updated = await updateProgramCycleProgress(db, params.id, session.workosId, { currentWeek, currentSession });
          }
          if (isComplete) {
            updated = await completeProgramCycle(db, params.id, session.workosId);
          }

          if (!updated) {
            return Response.json({ error: 'Program cycle not found' }, { status: 404 });
          }

          return Response.json(updated);
        } catch (err) {
          console.error('Update program cycle error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const success = await softDeleteProgramCycle(db, params.id, session.workosId);
          if (!success) {
            return Response.json({ error: 'Program cycle not found' }, { status: 404 });
          }

          return Response.json({ success: true });
        } catch (err) {
          console.error('Delete program cycle error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiProgramCycleId() {
  return null;
}

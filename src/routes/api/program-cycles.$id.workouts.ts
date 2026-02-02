import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getCycleWorkouts } from '~/lib/db/program';
import { getSession } from '~/lib/session';

export const Route = createFileRoute('/api/program-cycles/$id/workouts')({
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

          const workouts = await getCycleWorkouts(db, params.id, session.workosId);
          const responseData = workouts.map(w => ({
            id: w.id,
            cycleId: w.cycleId,
            templateId: w.templateId,
            weekNumber: w.weekNumber,
            sessionNumber: w.sessionNumber,
            sessionName: w.sessionName,
            targetLifts: w.targetLifts,
            isComplete: w.isComplete,
            workoutId: w.workoutId,
            scheduledDate: w.scheduledDate,
            scheduledTime: w.scheduledTime,
            createdAt: w.createdAt,
            updatedAt: w.updatedAt,
          }));
          return Response.json(responseData);
        } catch (err) {
          console.error('Get cycle workouts error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiProgramCycleWorkouts() {
  return null;
}

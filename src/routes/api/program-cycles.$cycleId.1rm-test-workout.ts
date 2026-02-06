import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth } from '../../lib/api/route-helpers';
import { workouts } from '../../lib/db/schema';
import { createDb } from '../../lib/db';

interface OneRmTestUpdateBody {
  squat1rm?: number;
  bench1rm?: number;
  deadlift1rm?: number;
  ohp1rm?: number;
  startingSquat1rm?: number;
  startingBench1rm?: number;
  startingDeadlift1rm?: number;
  startingOhp1rm?: number;
}

export const Route = createFileRoute('/api/program-cycles/$cycleId/1rm-test-workout')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const session = await requireAuth(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const drizzleDb = createDb(db);

          const workout = await drizzleDb
            .select()
            .from(workouts)
            .where(and(eq(workouts.programCycleId, params.cycleId), eq(workouts.workosId, session.sub)))
            .orderBy(desc(workouts.completedAt))
            .get();

          if (!workout) {
            return Response.json({ error: '1RM test workout not found' }, { status: 404 });
          }

          return Response.json(workout);
        } catch (err) {
          console.error('Get 1RM test workout error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
      PUT: async ({ request, params }) => {
        try {
          const session = await requireAuth(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const body = (await request.json()) as OneRmTestUpdateBody;

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const drizzleDb = createDb(db);

          const workout = await drizzleDb
            .select()
            .from(workouts)
            .where(and(eq(workouts.programCycleId, params.cycleId), eq(workouts.workosId, session.sub)))
            .orderBy(desc(workouts.completedAt))
            .get();

          if (!workout) {
            return Response.json({ error: '1RM test workout not found' }, { status: 404 });
          }

          const updated = await drizzleDb
            .update(workouts)
            .set({
              squat1rm: body.squat1rm,
              bench1rm: body.bench1rm,
              deadlift1rm: body.deadlift1rm,
              ohp1rm: body.ohp1rm,
              startingSquat1rm: body.startingSquat1rm,
              startingBench1rm: body.startingBench1rm,
              startingDeadlift1rm: body.startingDeadlift1rm,
              startingOhp1rm: body.startingOhp1rm,
            })
            .where(eq(workouts.id, workout.id))
            .returning()
            .get();

          return Response.json(updated);
        } catch (err) {
          console.error('Update 1RM test workout error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiProgramCycleId1rmTestWorkout() {
  return null;
}

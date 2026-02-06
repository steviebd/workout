import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { asc, desc, eq } from 'drizzle-orm';
import { createWorkoutWithDetails } from '../../lib/db/workout';
import { workouts } from '../../lib/db/schema';
import { createDb } from '../../lib/db';
import { getTemplateExercises } from '../../lib/db/template';
import { requireAuth, validateBody } from '../../lib/api/route-helpers';
import { createWorkoutSchema } from '../../lib/validators';

type WorkoutSortColumn = typeof workouts.startedAt | typeof workouts.createdAt | typeof workouts.name;

const validSortColumns: Record<string, WorkoutSortColumn> = {
  startedAt: workouts.startedAt,
  createdAt: workouts.createdAt,
  name: workouts.name,
};

export const Route = createFileRoute('/api/workouts')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await requireAuth(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const url = new URL(request.url);
          const limitParam = url.searchParams.get('limit');
          const limit = limitParam ? parseInt(limitParam, 10) : 10;
          const sortBy = url.searchParams.get('sortBy') ?? 'startedAt';
          const sortOrder = url.searchParams.get('sortOrder') ?? 'DESC';

          if (isNaN(limit) || limit < 1 || limit > 100) {
            return Response.json({ error: 'Invalid limit (1-100)' }, { status: 400 });
          }

          const d1Db = (env as { DB?: D1Database }).DB;
          if (!d1Db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const db = createDb(d1Db);
          const sortColumn = validSortColumns[sortBy] ?? workouts.startedAt;
          const orderFn = sortOrder === 'DESC' ? desc : asc;

          const userWorkouts = await db
            .select({
              id: workouts.id,
              name: workouts.name,
              notes: workouts.notes,
              startedAt: workouts.startedAt,
              completedAt: workouts.completedAt,
              workosId: workouts.workosId,
              createdAt: workouts.createdAt,
            })
            .from(workouts)
            .where(eq(workouts.workosId, session.sub))
            .orderBy(orderFn(sortColumn))
            .limit(limit)
            .all();

          return Response.json(userWorkouts);
        } catch (err) {
          console.error('Fetch workouts error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
      POST: async ({ request }) => {
        try {
          const session = await requireAuth(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const d1Db = (env as { DB?: D1Database }).DB;
          if (!d1Db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const body = await validateBody(request, createWorkoutSchema);
          if (!body) {
            return Response.json({ error: 'Invalid request body' }, { status: 400 });
          }

          let exercisesToAdd: string[] = body.exerciseIds ?? [];

          if (exercisesToAdd.length === 0 && body.templateId) {
            const templateExercises = await getTemplateExercises(d1Db, body.templateId, session.sub);
            exercisesToAdd = templateExercises.map((te) => te.exerciseId);
          }

          const workout = await createWorkoutWithDetails(d1Db, {
            workosId: session.sub,
            name: body.name.trim(),
            templateId: body.templateId,
            notes: body.notes?.trim(),
            exerciseIds: exercisesToAdd,
            localId: body.localId,
          });

          return Response.json(workout, { status: 201 });
        } catch (err) {
          console.error('Create workout error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiWorkouts() {
  return null;
}

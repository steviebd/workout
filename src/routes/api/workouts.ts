import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { asc, desc, eq } from 'drizzle-orm';
import {
  type CreateWorkoutData,
  createWorkoutWithDetails,
} from '../../lib/db/workout';
import { workouts } from '../../lib/db/schema';
import { createDb } from '../../lib/db';
import { getSession } from '../../lib/session';
import { getTemplateExercises } from '../../lib/db/template';

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
          const session = await getSession(request);
          if (!session?.workosId) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const url = new URL(request.url);
          const limit = parseInt(url.searchParams.get('limit') ?? '10');
          const sortBy = url.searchParams.get('sortBy') ?? 'startedAt';
          const sortOrder = url.searchParams.get('sortOrder') ?? 'DESC';

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
          const session = await getSession(request);
          if (!session?.workosId) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          console.log('API: Create workout - session workosId:', session.sub);

          const body = await request.json();
          const { name, templateId, notes, exerciseIds, localId } = body as CreateWorkoutData & { exerciseIds?: string[]; localId?: string };

          console.log('API: Create workout request:', { name, templateId, exerciseIdsCount: exerciseIds?.length });

          if (!name) {
            return Response.json({ error: 'Name is required' }, { status: 400 });
          }

          const d1Db = (env as { DB?: D1Database }).DB;
          if (!d1Db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          let exercisesToAdd: string[] = exerciseIds ?? [];

          if (exercisesToAdd.length === 0 && templateId) {
             const templateExercises = await getTemplateExercises(d1Db, templateId, session.sub);
             console.log('API: Template exercises found:', templateExercises.length);
             exercisesToAdd = templateExercises.map((te) => te.exerciseId);
           }

           const workout = await createWorkoutWithDetails(d1Db, {
             workosId: session.sub,
             name,
             templateId,
             notes,
             exerciseIds: exercisesToAdd,
             localId,
           });

           console.log('API: Workout created successfully:', {
             workoutId: workout.id,
             workosId: session.sub,
             workoutWorkosId: workout.workosId,
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

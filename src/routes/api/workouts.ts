import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import {
  type CreateWorkoutData,
  createWorkoutWithDetails,
  getWorkoutsByWorkosId,
} from '../../lib/db/workout';
import { getSession } from '../../lib/session';
import { getTemplateExercises } from '../../lib/db/template';

export const Route = createFileRoute('/api/workouts')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const url = new URL(request.url);
          const sortBy = url.searchParams.get('sortBy') as 'createdAt' | 'startedAt' | undefined;
          const sortOrder = url.searchParams.get('sortOrder') as 'ASC' | 'DESC' | undefined;
          const page = parseInt(url.searchParams.get('page') ?? '1', 10);
          const limit = parseInt(url.searchParams.get('limit') ?? '20', 10);
          const offset = (page - 1) * limit;
          const fromDate = url.searchParams.get('fromDate') ?? undefined;
          const toDate = url.searchParams.get('toDate') ?? undefined;
          const exerciseId = url.searchParams.get('exerciseId') ?? undefined;

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

           const workouts = await getWorkoutsByWorkosId(db, session.workosId, {
            sortBy,
            sortOrder,
            limit,
            offset,
            fromDate,
            toDate,
            exerciseId,
          });

          return Response.json(workouts);
        } catch (err) {
          console.error('Get workouts error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
        POST: async ({ request }) => {
          try {
            const session = await getSession(request);
            if (!session) {
              return Response.json({ error: 'Not authenticated' }, { status: 401 });
            }

             console.log('API: Create workout - session workosId:', session.workosId);

            const body = await request.json();
            const { name, templateId, notes, exerciseIds, localId } = body as CreateWorkoutData & { exerciseIds?: string[]; localId?: string };

            console.log('API: Create workout request:', { name, templateId, exerciseIdsCount: exerciseIds?.length });

            if (!name) {
              return Response.json({ error: 'Name is required' }, { status: 400 });
            }

            const db = (env as { DB?: D1Database }).DB;
            if (!db) {
              return Response.json({ error: 'Database not available' }, { status: 500 });
            }

            let exercisesToAdd: string[] = exerciseIds ?? [];

            if (exercisesToAdd.length === 0 && templateId) {
               const templateExercises = await getTemplateExercises(db, templateId, session.workosId);
              console.log('API: Template exercises found:', templateExercises.length);
              exercisesToAdd = templateExercises.map((te) => te.exerciseId);
            }

             const workout = await createWorkoutWithDetails(db, {
              workosId: session.workosId,
              name,
              templateId,
              notes,
              exerciseIds: exercisesToAdd,
              localId,
            });

             console.log('API: Workout created successfully:', {
               workoutId: workout.id,
               workosId: session.workosId,
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

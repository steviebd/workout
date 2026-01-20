import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import {
  type CreateWorkoutData,
  createWorkout,
  createWorkoutExercise,
  createWorkoutSet,
  getLastWorkoutSetsForExercise,
  getWorkoutsByUserId,
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

          const workouts = await getWorkoutsByUserId(db, session.userId, {
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
          const errorMessage = err instanceof Error ? err.message : String(err);
          return Response.json({ error: 'Server error', details: errorMessage }, { status: 500 });
        }
      },
      POST: async ({ request }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const body = await request.json();
          const { name, templateId, notes, exerciseIds } = body as CreateWorkoutData & { exerciseIds?: string[] };

          if (!name) {
            return Response.json({ error: 'Name is required' }, { status: 400 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const workout = await createWorkout(db, {
            userId: session.userId,
            name,
            templateId,
            notes,
          });

          let exercisesToAdd = exerciseIds ?? [];

          if (exercisesToAdd.length === 0 && templateId) {
            const templateExercises = await getTemplateExercises(db, templateId, session.userId);
            exercisesToAdd = templateExercises.map((te) => te.exerciseId);
          }

          for (let i = 0; i < exercisesToAdd.length; i++) {
            const workoutExercise = await createWorkoutExercise(db, workout.id, session.userId, exercisesToAdd[i], i);

            if (workoutExercise) {
              const lastWorkoutSets = await getLastWorkoutSetsForExercise(db, session.userId, exercisesToAdd[i]);

              if (lastWorkoutSets.length > 0) {
                for (const setData of lastWorkoutSets) {
                  await createWorkoutSet(
                    db,
                    workoutExercise.id,
                    session.userId,
                    setData.setNumber,
                    setData.weight ?? undefined,
                    setData.reps ?? undefined,
                    setData.rpe ?? undefined
                  );
                }
              } else {
                await createWorkoutSet(db, workoutExercise.id, session.userId, 1);
              }
            }
          }

          return Response.json(workout, { status: 201 });
        } catch (err) {
          console.error('Create workout error:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          return Response.json({ error: 'Server error', details: errorMessage }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiWorkouts() {
  return null;
}

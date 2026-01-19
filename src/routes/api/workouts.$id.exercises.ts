import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getSession } from '../../lib/session';
import {
  createWorkoutExercise,
  removeWorkoutExercise,
  reorderWorkoutExercises,
  getWorkoutExercises,
  type ExerciseOrder
} from '../../lib/db/workout';

export const Route = createFileRoute('/api/workouts/$id/exercises')({
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

          const exercises = await getWorkoutExercises(db, params.id);
          return Response.json(exercises);
        } catch (err) {
          console.error('Get workout exercises error:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          return Response.json({ error: 'Server error', details: errorMessage }, { status: 500 });
        }
      },
      POST: async ({ request, params }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const body = await request.json();
          const { exerciseId, orderIndex, notes } = body as { exerciseId: string; orderIndex: number; notes?: string };

          if (!exerciseId || orderIndex === undefined) {
            return Response.json({ error: 'Exercise ID and order index are required' }, { status: 400 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const workoutExercise = await createWorkoutExercise(
            db,
            params.id,
            exerciseId,
            orderIndex,
            notes
          );

          return Response.json(workoutExercise, { status: 201 });
        } catch (err) {
          console.error('Add exercise error:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          return Response.json({ error: 'Server error', details: errorMessage }, { status: 500 });
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const url = new URL(request.url);
          const exerciseId = url.searchParams.get('exerciseId');

          if (!exerciseId) {
            return Response.json({ error: 'Exercise ID is required' }, { status: 400 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const removed = await removeWorkoutExercise(db, params.id, exerciseId, session.userId);

          if (!removed) {
            return Response.json({ error: 'Exercise not found' }, { status: 404 });
          }

          return new Response(null, { status: 204 });
        } catch (err) {
          console.error('Remove exercise error:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          return Response.json({ error: 'Server error', details: errorMessage }, { status: 500 });
        }
      },
    },
  },
});

export const Route2 = createFileRoute('/api/workouts/$id/exercises/reorder')({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const body = await request.json();
          const { exerciseOrders } = body as { exerciseOrders: ExerciseOrder[] };

          if (!exerciseOrders || !Array.isArray(exerciseOrders)) {
            return Response.json({ error: 'Exercise orders array is required' }, { status: 400 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const reordered = await reorderWorkoutExercises(db, params.id, exerciseOrders, session.userId);

          if (!reordered) {
            return Response.json({ error: 'Workout not found' }, { status: 404 });
          }

          return Response.json({ success: true });
        } catch (err) {
          console.error('Reorder exercises error:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          return Response.json({ error: 'Server error', details: errorMessage }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiWorkoutExercises() {
  return null;
}

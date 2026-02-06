import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { type ExerciseOrder, reorderWorkoutExercises } from '../../lib/db/workout';
import { requireAuth } from '~/lib/api/route-helpers';

export const Route = createFileRoute('/api/workouts/$id/exercises/reorder')({
  server: {
    handlers: {
       PUT: async ({ request, params }) => {
         try {
           const session = await requireAuth(request);
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

           const reordered = await reorderWorkoutExercises(db, params.id, exerciseOrders, session.sub);

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

export default function ApiWorkoutExercisesReorder() {
  return null;
}
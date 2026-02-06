import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getLastWorkoutForExercise } from '../../lib/db/workout';
import { requireAuth } from '~/lib/api/route-helpers';

export const Route = createFileRoute('/api/exercises/$id/last-workout')({
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

           const lastWorkout = await getLastWorkoutForExercise(db, session.sub, params.id);

          if (!lastWorkout) {
            return Response.json(null);
          }

          return Response.json(lastWorkout);
        } catch (err) {
          console.error('Get last workout error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiExerciseLastWorkout() {
  return null;
}

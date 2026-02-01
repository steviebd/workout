import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getLastWorkoutSetsForExercise } from '../../lib/db/workout';
import { getSession } from '../../lib/session';

export const Route = createFileRoute('/api/exercises/$id/last-workout-sets')({
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

           const lastWorkoutSets = await getLastWorkoutSetsForExercise(db, session.workosId, params.id);

          return Response.json({
            exerciseId: params.id,
            sets: lastWorkoutSets,
            totalSets: lastWorkoutSets.length,
          });
        } catch (err) {
          console.error('Get last workout sets error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiExerciseLastWorkoutSets() {
  return null;
}

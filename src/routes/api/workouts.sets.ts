import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { createWorkoutSet } from '../../lib/db/workout';
import { getSession } from '../../lib/session';

export const Route = createFileRoute('/api/workouts/sets')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const session = await getSession(request);
          if (!session?.sub) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const body = await request.json();
          const { workoutExerciseId, setNumber, weight, reps, rpe, localId } = body as {
            workoutExerciseId: string;
            setNumber: number;
            weight?: number;
            reps?: number;
            rpe?: number;
            localId?: string;
          };

          if (!workoutExerciseId || setNumber === undefined) {
            return Response.json({ error: 'Workout exercise ID and set number are required' }, { status: 400 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

           const workoutSet = await createWorkoutSet(
             db,
             workoutExerciseId,
             session.sub,
            setNumber,
            weight,
            reps,
            rpe,
            localId
          );

          if (!workoutSet) {
            return Response.json({ error: 'Workout exercise not found or does not belong to you' }, { status: 404 });
          }

          return Response.json(workoutSet, { status: 201 });
        } catch (err) {
          console.error('Create set error:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          return Response.json({ error: 'Server error', details: errorMessage }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiWorkoutSets() {
  return null;
}

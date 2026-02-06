import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getExerciseById, getExerciseByIdOnly } from '../../lib/db/exercise';
import { getExerciseHistory, getExerciseHistoryStats } from '../../lib/db/workout';
import { requireAuth } from '~/lib/api/route-helpers';

export const Route = createFileRoute('/api/exercises/$exerciseId/history')({
  server: {
    handlers: {
        GET: async ({ request, params }) => {
          try {
            const session = await requireAuth(request);
            if (!session) {
              console.log('[ExerciseHistory] No session found');
              return Response.json({ error: 'Not authenticated' }, { status: 401 });
            }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            console.log('[ExerciseHistory] Database not available');
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

           console.log('[ExerciseHistory] Fetching history for exercise:', params.exerciseId, 'user:', session.sub);

          const url = new URL(request.url);
          const fromDate = url.searchParams.get('fromDate') ?? undefined;
          const toDate = url.searchParams.get('toDate') ?? undefined;
          const page = parseInt(url.searchParams.get('page') ?? '1', 10);
          const limit = parseInt(url.searchParams.get('limit') ?? '20', 10);
          const offset = (page - 1) * limit;

          const [history, stats] = await Promise.all([
            getExerciseHistory(db, session.sub, params.exerciseId, {
              fromDate,
              toDate,
              limit,
              offset,
            }),
            getExerciseHistoryStats(db, session.sub, params.exerciseId),
          ]);

          let exercise = await getExerciseById(db, params.exerciseId, session.sub);
          if (!exercise) {
            const fallback = await getExerciseByIdOnly(db, params.exerciseId);
            exercise ??= fallback;
          }

          console.log('[ExerciseHistory] Exercise info:', exercise?.name ?? 'Unknown');

          return Response.json({
            exercise: exercise ? {
              id: exercise.id,
              name: exercise.name,
              muscleGroup: exercise.muscleGroup,
            } : {
              id: params.exerciseId,
              name: 'Unknown Exercise',
              muscleGroup: null,
            },
            stats,
            history,
          });
        } catch (err) {
          console.error('[ExerciseHistory] Error:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          return Response.json({ error: 'Server error', details: errorMessage }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiExerciseHistory() {
  return null;
}

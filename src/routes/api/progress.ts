import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getExercisesByUserId } from '../../lib/db/exercise';
import { getWeeklyVolume, getStrengthHistory, getRecentPRs } from '../../lib/db/workout';
import { getSession } from '../../lib/session';

export const Route = createFileRoute('/api/progress')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const url = new URL(request.url);
          const exerciseId = url.searchParams.get('exerciseId') ?? undefined;
          const dateRange = url.searchParams.get('dateRange') as '1m' | '3m' | '6m' | '1y' | 'all' | undefined;
          const volumeScope = url.searchParams.get('volumeScope') as 'all' | 'selected' | undefined;

          let fromDate: string | undefined;
          const toDate = new Date().toISOString();

          if (dateRange) {
            const baseDate = new Date();
            switch (dateRange) {
              case '1m':
                baseDate.setMonth(baseDate.getMonth() - 1);
                break;
              case '3m':
                baseDate.setMonth(baseDate.getMonth() - 3);
                break;
              case '6m':
                baseDate.setMonth(baseDate.getMonth() - 6);
                break;
              case '1y':
                baseDate.setFullYear(baseDate.getFullYear() - 1);
                break;
              case 'all':
                fromDate = undefined;
                break;
            }
            if (dateRange !== 'all') {
              fromDate = baseDate.toISOString();
            }
          }

          const [exercises, weeklyVolume, strengthHistory, recentPRs] = await Promise.all([
            getExercisesByUserId(db, session.userId, { sortBy: 'name' }),
            getWeeklyVolume(db, session.userId, {
              fromDate,
              toDate,
              exerciseId: volumeScope === 'selected' ? exerciseId : undefined,
            }),
            exerciseId ? getStrengthHistory(db, session.userId, exerciseId, { fromDate, toDate }) : Promise.resolve([]),
            getRecentPRs(db, session.userId, 5),
          ]);

          const strengthData = strengthHistory.map(point => ({
            date: point.date,
            weight: point.weight,
          }));

          const selectedExercise = exercises.find(e => e.id === exerciseId);

          return Response.json({
            exercises: exercises.map(e => ({ id: e.id, name: e.name })),
            weeklyVolume,
            strengthData,
            recentPRs: recentPRs.map(pr => ({
              id: pr.id,
              exerciseName: pr.exerciseName,
              date: pr.date,
              weight: pr.weight,
              reps: pr.reps,
              previousRecord: pr.previousRecord,
            })),
            selectedExerciseId: exerciseId,
            selectedExerciseName: selectedExercise?.name ?? null,
          });
        } catch (err) {
          console.error('Get progress error:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          return Response.json({ error: 'Server error', details: errorMessage }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiProgress() {
  return null;
}

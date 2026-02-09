import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getSession } from '~/lib/session';
import { whoopRepository } from '~/lib/whoop';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export const Route = createFileRoute('/api/health/data')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSession(request);
        if (!session?.sub) {
          return new Response('Unauthorized', { status: 401 });
        }

        const workosId = session.sub;
        const d1Db = (env as { DB?: D1Database }).DB;
        if (!d1Db) {
          return new Response('Database not available', { status: 500 });
        }

        const connection = await whoopRepository.getConnection(d1Db, workosId);
        if (!connection) {
          return Response.json({ error: 'Whoop not connected' }, { status: 400 });
        }

        const now = new Date();
        const endDate = formatDate(now);
        const startDate = formatDate(addDays(now, -30));

        const [recoveries, sleeps, cycles, workouts] = await Promise.all([
          whoopRepository.getRecoveries(d1Db, workosId, startDate, endDate),
          whoopRepository.getSleeps(d1Db, workosId, startDate, endDate),
          whoopRepository.getCycles(d1Db, workosId, startDate, endDate),
          whoopRepository.getWorkouts(d1Db, workosId, startDate, endDate),
        ]);

        return Response.json({
          recoveries: recoveries.map(r => ({
            id: r.id,
            date: r.date,
            score: r.score,
            status: r.status,
            restingHeartRate: r.restingHeartRate,
            hrv: r.hrv,
          })),
          sleeps: sleeps.map(s => ({
            id: s.id,
            sleepDate: s.sleepDate,
            qualityScore: s.qualityScore,
            asleepDurationMs: s.asleepDurationMs,
            isNap: s.isNap,
          })),
          cycles: cycles.map(c => ({
            id: c.id,
            date: c.date,
            score: c.score,
            totalStrain: c.totalStrain,
          })),
          workouts: workouts.map(w => ({
            id: w.id,
            startTime: w.startTime,
            name: w.name,
            strain: w.strain,
            durationMs: w.durationMs,
          })),
        });
      },
    },
  },
});

export default function ApiHealthData() {
  return null;
}

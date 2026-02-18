import { createFileRoute } from '@tanstack/react-router';
import { apiRoute } from '~/lib/api/api-route';
import { whoopRepository } from '~/lib/whoop';
import { parseQueryParams } from '~/lib/api/handler';

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
      GET: apiRoute('Get health data', async ({ d1Db, session, request }) => {
        const workosId = session.sub;
        const connection = await whoopRepository.getConnection(d1Db, workosId);
        if (!connection) {
          return Response.json({ error: 'Whoop not connected' }, { status: 400 });
        }

        const url = new URL(request.url);
        const { days: daysParam, startDate: startDateParam } = parseQueryParams<{
          days?: string;
          startDate?: string;
        }>(url);
        const days = daysParam ? Math.min(Math.max(parseInt(daysParam, 10) || 30, 1), 365) : 30;

        const now = new Date();
        const endDate = formatDate(now);
        const startDate = startDateParam ?? formatDate(addDays(now, -days));

        const [recoveries, sleeps, cycles, workouts] = await Promise.all([
          whoopRepository.getRecoveries(d1Db, workosId, startDate, endDate),
          whoopRepository.getSleeps(d1Db, workosId, startDate, endDate),
          whoopRepository.getCycles(d1Db, workosId, startDate, endDate),
          whoopRepository.getWorkouts(d1Db, workosId, startDate, endDate),
        ]);

        console.log('[health-data] query:', { workosId, startDate, endDate, sleepCount: sleeps.length, cycleCount: cycles.length });
        if (sleeps.length > 0) {
          console.log('[health-data] sleep date range:', sleeps[0].sleepDate, 'to', sleeps[sleeps.length - 1].sleepDate);
        }

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
      }),
    },
  },
});

import { createFileRoute } from '@tanstack/react-router';
import { apiRoute } from '~/lib/api/api-route';
import { whoopRepository } from '~/lib/whoop';
import { parseQueryParams } from '~/lib/api/handler';
import { getTodayStr, getDaysAgoStr } from '~/lib/utils/date';

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

        const endDate = getTodayStr();
        const startDate = startDateParam ?? getDaysAgoStr(days);

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
      }),
    },
  },
});

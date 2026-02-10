import { createFileRoute } from '@tanstack/react-router';
import { withApiContext } from '~/lib/api/context';
import { whoopRepository } from '~/lib/whoop/repository';
import { WhoopApiClient, mapWhoopSleepToDb, mapWhoopRecoveryToDb, mapWhoopCycleToDb, mapWhoopWorkoutToDb } from '~/lib/whoop/api';

function formatDate(date: Date): string {
  return date.toISOString();
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export const Route = createFileRoute('/api/integrations/whoop/sync' as const)({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const { session, d1Db } = await withApiContext(request);
          const workosId = session.sub;

          const connection = await whoopRepository.getConnection(d1Db, workosId);
          if (!connection) {
            return Response.json({ error: 'Whoop not connected' }, { status: 400 });
          }

          const lockAcquired = await whoopRepository.acquireSyncLock(d1Db, workosId);
          if (!lockAcquired) {
            return Response.json({ error: 'Sync already in progress' }, { status: 409 });
          }

          try {
            const whoopClient = new WhoopApiClient(workosId, d1Db);
            const now = new Date();
            const endDate = formatDate(now);
            const startDate = formatDate(addDays(now, -30));

            const [cyclesResult, sleepsResult, recoveriesResult, workoutsResult] = await Promise.allSettled([
              whoopClient.getCycles(startDate, endDate),
              whoopClient.getSleeps(startDate, endDate),
              whoopClient.getRecoveries(startDate, endDate),
              whoopClient.getWorkouts(startDate, endDate),
            ]);

            const errors: string[] = [];
            const settled = [
              { name: 'cycles', result: cyclesResult },
              { name: 'sleeps', result: sleepsResult },
              { name: 'recoveries', result: recoveriesResult },
              { name: 'workouts', result: workoutsResult },
            ];
            for (const { name, result } of settled) {
              if (result.status === 'rejected') {
                console.warn(`Whoop ${name} sync failed:`, result.reason);
                errors.push(name);
              }
            }

            const synced = { cycles: 0, sleeps: 0, recoveries: 0, workouts: 0 };

            if (cyclesResult.status === 'fulfilled') {
              for (const cycle of cyclesResult.value.records) {
                await whoopRepository.upsertCycle(d1Db, workosId, mapWhoopCycleToDb(cycle, workosId));
              }
              synced.cycles = cyclesResult.value.records.length;
            }

            if (sleepsResult.status === 'fulfilled') {
              for (const sleep of sleepsResult.value.records) {
                await whoopRepository.upsertSleep(d1Db, workosId, mapWhoopSleepToDb(sleep, workosId));
              }
              synced.sleeps = sleepsResult.value.records.length;
            }

            if (recoveriesResult.status === 'fulfilled') {
              for (const recovery of recoveriesResult.value.records) {
                await whoopRepository.upsertRecovery(d1Db, workosId, mapWhoopRecoveryToDb(recovery, workosId));
              }
              synced.recoveries = recoveriesResult.value.records.length;
            }

            if (workoutsResult.status === 'fulfilled') {
              for (const workout of workoutsResult.value.records) {
                await whoopRepository.upsertWorkout(d1Db, workosId, mapWhoopWorkoutToDb(workout, workosId));
              }
              synced.workouts = workoutsResult.value.records.length;
            }

            await whoopRepository.updateLastSyncAt(d1Db, workosId);

            return Response.json({
              success: errors.length === 0,
              partialSync: errors.length > 0,
              synced,
              ...(errors.length > 0 && { failedEndpoints: errors }),
            });
          } finally {
            await whoopRepository.releaseSyncLock(d1Db, workosId);
          }
        } catch (err) {
          console.error('Whoop sync error:', err);
          return Response.json({ error: 'Sync failed' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiWhoopSync() {
  return null;
}

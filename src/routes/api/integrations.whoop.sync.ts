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
            return Response.json({ error: 'Whoop not connected', debug: { workosId } }, { status: 400 });
          }

          const lockAcquired = await whoopRepository.acquireSyncLock(d1Db, workosId);
          if (!lockAcquired) {
            return Response.json({ error: 'Sync already in progress' }, { status: 409 });
          }

          try {
            const whoopClient = new WhoopApiClient(workosId, d1Db);
            const now = new Date();
            const endDate = formatDate(now);

            const url = new URL(request.url);
            const forceFullSync = url.searchParams.get('forceFullSync') === 'true';
            const isFirstSync = !connection.lastSyncAt;

            let startDate: string;
            if (forceFullSync || isFirstSync) {
              startDate = formatDate(addDays(now, -200));
            } else {
              const lastSyncAt = connection.lastSyncAt ? new Date(connection.lastSyncAt) : new Date();
              startDate = formatDate(addDays(lastSyncAt, -1));
            }

            const debugInfo = {
              workosId,
              forceFullSync,
              isFirstSync,
              lastSyncAt: connection.lastSyncAt,
              syncStatus: connection.syncStatus,
              tokenExpiresAt: connection.tokenExpiresAt,
              startDate,
              endDate,
            };

            console.log('[whoop-sync] starting:', debugInfo);

            const [cyclesResult, sleepsResult, recoveriesResult, workoutsResult] = await Promise.allSettled([
              whoopClient.getCyclesWithPagination(startDate, endDate),
              whoopClient.getSleepsWithPagination(startDate, endDate),
              whoopClient.getRecoveriesWithPagination(startDate, endDate),
              whoopClient.getWorkoutsWithPagination(startDate, endDate),
            ]);

            const errors: string[] = [];
            const errorDetails: Record<string, string> = {};
            const settled = [
              { name: 'cycles', result: cyclesResult },
              { name: 'sleeps', result: sleepsResult },
              { name: 'recoveries', result: recoveriesResult },
              { name: 'workouts', result: workoutsResult },
            ];
            for (const { name, result } of settled) {
              if (result.status === 'rejected') {
                const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
                console.warn(`Whoop ${name} sync failed:`, reason);
                errors.push(name);
                errorDetails[name] = reason;
              }
            }

            const synced = { cycles: 0, sleeps: 0, recoveries: 0, workouts: 0 };

            if (cyclesResult.status === 'fulfilled') {
              for (const cycle of cyclesResult.value) {
                await whoopRepository.upsertCycle(d1Db, workosId, mapWhoopCycleToDb(cycle, workosId));
              }
              synced.cycles = cyclesResult.value.length;
            }

            if (sleepsResult.status === 'fulfilled') {
              for (const sleep of sleepsResult.value) {
                await whoopRepository.upsertSleep(d1Db, workosId, mapWhoopSleepToDb(sleep, workosId));
              }
              synced.sleeps = sleepsResult.value.length;
            }

            if (recoveriesResult.status === 'fulfilled') {
              for (const recovery of recoveriesResult.value) {
                await whoopRepository.upsertRecovery(d1Db, workosId, mapWhoopRecoveryToDb(recovery, workosId));
              }
              synced.recoveries = recoveriesResult.value.length;
            }

            if (workoutsResult.status === 'fulfilled') {
              for (const workout of workoutsResult.value) {
                await whoopRepository.upsertWorkout(d1Db, workosId, mapWhoopWorkoutToDb(workout, workosId));
              }
              synced.workouts = workoutsResult.value.length;
            }

            const hadAnySuccess =
              cyclesResult.status === 'fulfilled' ||
              sleepsResult.status === 'fulfilled' ||
              recoveriesResult.status === 'fulfilled' ||
              workoutsResult.status === 'fulfilled';

            if (hadAnySuccess && errors.length === 0) {
              await whoopRepository.updateLastSyncAt(d1Db, workosId);
            }

            const result = {
              success: errors.length === 0,
              partialSync: errors.length > 0 && hadAnySuccess,
              synced,
              debug: debugInfo,
              ...(errors.length > 0 && { failedEndpoints: errors, errorDetails }),
            };
            console.log('[whoop-sync] result:', result);
            return Response.json(result);
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

import { eq, and, desc, gte, lte, sql, isNull } from 'drizzle-orm';
import { createDb } from '~/lib/db';
import { API } from '~/lib/constants';
import {
  whoopConnections,
  whoopSleeps,
  whoopRecoveries,
  whoopCycles,
  whoopWorkouts,
  whoopWebhookEvents,
  type WhoopConnection,
  type NewWhoopSleep,
  type NewWhoopRecovery,
  type NewWhoopCycle,
  type NewWhoopWorkout,
  type NewWhoopWebhookEvent,
} from '~/lib/db/schema';

type WhoopSleepWithoutJson = Omit<typeof whoopSleeps.$inferSelect, 'rawJson'>;
type WhoopRecoveryWithoutJson = Omit<typeof whoopRecoveries.$inferSelect, 'rawJson'>;
type WhoopCycleWithoutJson = Omit<typeof whoopCycles.$inferSelect, 'rawJson'>;
type WhoopWorkoutWithoutJson = Omit<typeof whoopWorkouts.$inferSelect, 'rawJson'>;

const SYNC_LOCK_TIMEOUT_MS = API.TIMEOUTS.SYNC_LOCK_TIMEOUT_MS;

export const whoopRepository = {
  async createConnection(
    db: D1Database,
    workosId: string,
    encryptedAccessToken: string,
    encryptedRefreshToken: string,
    expiresAt: string,
    whoopUserId: string,
    scopesGranted: string
  ): Promise<WhoopConnection | null> {
    const drizzleDb = createDb(db);

    const [connection] = await drizzleDb
      .insert(whoopConnections)
      .values({
        workosId,
        accessTokenEncrypted: encryptedAccessToken,
        refreshTokenEncrypted: encryptedRefreshToken,
        tokenExpiresAt: expiresAt,
        whoopUserId,
        scopesGranted,
        syncStatus: 'active',
      })
      .onConflictDoUpdate({
        target: whoopConnections.workosId,
        set: {
          accessTokenEncrypted: encryptedAccessToken,
          refreshTokenEncrypted: encryptedRefreshToken,
          tokenExpiresAt: expiresAt,
          whoopUserId,
          scopesGranted,
          syncStatus: 'active',
          lastSyncAt: null,
          syncInProgress: false,
          syncStartedAt: null,
          updatedAt: new Date().toISOString(),
        },
      })
      .returning();

    return connection || null;
  },

  async getConnection(
    db: D1Database,
    workosId: string
  ): Promise<WhoopConnection | null> {
    const drizzleDb = createDb(db);

    const [connection] = await drizzleDb
      .select()
      .from(whoopConnections)
      .where(eq(whoopConnections.workosId, workosId));

    return connection || null;
  },

  async updateTokens(
    db: D1Database,
    workosId: string,
    encryptedAccessToken: string,
    encryptedRefreshToken: string,
    expiresAt: string
  ): Promise<void> {
    const drizzleDb = createDb(db);

    await drizzleDb
      .update(whoopConnections)
      .set({
        accessTokenEncrypted: encryptedAccessToken,
        refreshTokenEncrypted: encryptedRefreshToken,
        tokenExpiresAt: expiresAt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(whoopConnections.workosId, workosId));
  },

  async acquireSyncLock(db: D1Database, workosId: string): Promise<boolean> {
    const drizzleDb = createDb(db);
    const now = new Date().toISOString();
    const staleThreshold = new Date(Date.now() - SYNC_LOCK_TIMEOUT_MS).toISOString();

    const result = await drizzleDb
      .update(whoopConnections)
      .set({
        syncInProgress: true,
        syncStartedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(whoopConnections.workosId, workosId),
          sql`(sync_in_progress = 0 OR sync_started_at < ${staleThreshold})`
        )
      )
      .run();

    const changes = result.meta?.changes ?? 0;
    return changes > 0;
  },

  async releaseSyncLock(db: D1Database, workosId: string): Promise<void> {
    const drizzleDb = createDb(db);

    await drizzleDb
      .update(whoopConnections)
      .set({
        syncInProgress: false,
        syncStartedAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(whoopConnections.workosId, workosId));
  },

  async deleteConnection(db: D1Database, workosId: string): Promise<void> {
    const drizzleDb = createDb(db);

    await drizzleDb
      .delete(whoopConnections)
      .where(eq(whoopConnections.workosId, workosId));
  },

  async updateLastSyncAt(db: D1Database, workosId: string): Promise<void> {
    const drizzleDb = createDb(db);

    await drizzleDb
      .update(whoopConnections)
      .set({
        lastSyncAt: new Date().toISOString(),
        syncInProgress: false,
        syncStartedAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(whoopConnections.workosId, workosId));
  },

  async upsertSleep(
    db: D1Database,
    workosId: string,
    sleepData: NewWhoopSleep
  ): Promise<void> {
    const drizzleDb = createDb(db);

    await drizzleDb
      .insert(whoopSleeps)
      .values({ ...sleepData, workosId })
      .onConflictDoUpdate({
        target: whoopSleeps.id,
        set: {
          ...sleepData,
          workosId,
          updatedAt: new Date().toISOString(),
        },
      });
  },

  async upsertRecovery(
    db: D1Database,
    workosId: string,
    recoveryData: NewWhoopRecovery
  ): Promise<void> {
    const drizzleDb = createDb(db);

    await drizzleDb
      .insert(whoopRecoveries)
      .values({ ...recoveryData, workosId })
      .onConflictDoUpdate({
        target: whoopRecoveries.id,
        set: {
          ...recoveryData,
          workosId,
          updatedAt: new Date().toISOString(),
        },
      });
  },

  async upsertCycle(
    db: D1Database,
    workosId: string,
    cycleData: NewWhoopCycle
  ): Promise<void> {
    const drizzleDb = createDb(db);

    await drizzleDb
      .insert(whoopCycles)
      .values({ ...cycleData, workosId })
      .onConflictDoUpdate({
        target: whoopCycles.id,
        set: {
          ...cycleData,
          workosId,
          updatedAt: new Date().toISOString(),
        },
      });
  },

  async upsertWorkout(
    db: D1Database,
    workosId: string,
    workoutData: NewWhoopWorkout
  ): Promise<void> {
    const drizzleDb = createDb(db);

    await drizzleDb
      .insert(whoopWorkouts)
      .values({ ...workoutData, workosId })
      .onConflictDoUpdate({
        target: whoopWorkouts.id,
        set: {
          ...workoutData,
          workosId,
          updatedAt: new Date().toISOString(),
        },
      });
  },

  async updateWorkoutDeletedAt(
    db: D1Database,
    workosId: string,
    id: string,
    deletedAt: string | null
  ): Promise<void> {
    const drizzleDb = createDb(db);

    await drizzleDb
      .update(whoopWorkouts)
      .set({
        deletedAt,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(whoopWorkouts.workosId, workosId), eq(whoopWorkouts.id, id)));
  },

  async updateSleepDeletedAt(
    db: D1Database,
    workosId: string,
    id: string,
    deletedAt: string | null
  ): Promise<void> {
    const drizzleDb = createDb(db);

    await drizzleDb
      .update(whoopSleeps)
      .set({
        deletedAt,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(whoopSleeps.workosId, workosId), eq(whoopSleeps.id, id)));
  },

  async updateRecoveryDeletedAt(
    db: D1Database,
    workosId: string,
    id: string,
    deletedAt: string | null
  ): Promise<void> {
    const drizzleDb = createDb(db);

    await drizzleDb
      .update(whoopRecoveries)
      .set({
        deletedAt,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(whoopRecoveries.workosId, workosId), eq(whoopRecoveries.id, id)));
  },

  async getSleeps(
    db: D1Database,
    workosId: string,
    startDate: string,
    endDate: string
  ): Promise<WhoopSleepWithoutJson[]> {
    const drizzleDb = createDb(db);

    return drizzleDb
      .select({
        id: whoopSleeps.id,
        workosId: whoopSleeps.workosId,
        sleepDate: whoopSleeps.sleepDate,
        startTime: whoopSleeps.startTime,
        endTime: whoopSleeps.endTime,
        timezoneOffset: whoopSleeps.timezoneOffset,
        isNap: whoopSleeps.isNap,
        cycleId: whoopSleeps.cycleId,
        qualityScore: whoopSleeps.qualityScore,
        needBase: whoopSleeps.needBase,
        needStrain: whoopSleeps.needStrain,
        needDebt: whoopSleeps.needDebt,
        inBedDurationMs: whoopSleeps.inBedDurationMs,
        awakeDurationMs: whoopSleeps.awakeDurationMs,
        asleepDurationMs: whoopSleeps.asleepDurationMs,
        lightSleepDurationMs: whoopSleeps.lightSleepDurationMs,
        remSleepDurationMs: whoopSleeps.remSleepDurationMs,
        slowWaveSleepDurationMs: whoopSleeps.slowWaveSleepDurationMs,
        disruptions: whoopSleeps.disruptions,
        efficiency: whoopSleeps.efficiency,
        respiratoryRate: whoopSleeps.respiratoryRate,
        whoopCreatedAt: whoopSleeps.whoopCreatedAt,
        whoopUpdatedAt: whoopSleeps.whoopUpdatedAt,
        deletedAt: whoopSleeps.deletedAt,
        createdAt: whoopSleeps.createdAt,
        updatedAt: whoopSleeps.updatedAt,
      })
      .from(whoopSleeps)
      .where(
        and(
          eq(whoopSleeps.workosId, workosId),
          gte(whoopSleeps.sleepDate, startDate),
          lte(whoopSleeps.sleepDate, endDate),
          isNull(whoopSleeps.deletedAt)
        )
      )
      .orderBy(desc(whoopSleeps.startTime));
  },

  async getRecoveries(
    db: D1Database,
    workosId: string,
    startDate: string,
    endDate: string
  ): Promise<WhoopRecoveryWithoutJson[]> {
    const drizzleDb = createDb(db);

    return drizzleDb
      .select({
        id: whoopRecoveries.id,
        workosId: whoopRecoveries.workosId,
        sleepId: whoopRecoveries.sleepId,
        cycleId: whoopRecoveries.cycleId,
        date: whoopRecoveries.date,
        score: whoopRecoveries.score,
        status: whoopRecoveries.status,
        restingHeartRate: whoopRecoveries.restingHeartRate,
        hrv: whoopRecoveries.hrv,
        spo2: whoopRecoveries.spo2,
        skinTemp: whoopRecoveries.skinTemp,
        cardiovascularLoad: whoopRecoveries.cardiovascularLoad,
        musculoskeletalLoad: whoopRecoveries.musculoskeletalLoad,
        whoopCreatedAt: whoopRecoveries.whoopCreatedAt,
        whoopUpdatedAt: whoopRecoveries.whoopUpdatedAt,
        deletedAt: whoopRecoveries.deletedAt,
        createdAt: whoopRecoveries.createdAt,
        updatedAt: whoopRecoveries.updatedAt,
      })
      .from(whoopRecoveries)
      .where(
        and(
          eq(whoopRecoveries.workosId, workosId),
          gte(whoopRecoveries.date, startDate),
          lte(whoopRecoveries.date, endDate),
          isNull(whoopRecoveries.deletedAt)
        )
      )
      .orderBy(desc(whoopRecoveries.date));
  },

  async getCycles(
    db: D1Database,
    workosId: string,
    startDate: string,
    endDate: string
  ): Promise<WhoopCycleWithoutJson[]> {
    const drizzleDb = createDb(db);

    return drizzleDb
      .select({
        id: whoopCycles.id,
        workosId: whoopCycles.workosId,
        date: whoopCycles.date,
        startTime: whoopCycles.startTime,
        endTime: whoopCycles.endTime,
        score: whoopCycles.score,
        effort: whoopCycles.effort,
        totalStrain: whoopCycles.totalStrain,
        averageHeartRate: whoopCycles.averageHeartRate,
        maxHeartRate: whoopCycles.maxHeartRate,
        caloriesBurned: whoopCycles.caloriesBurned,
        distance: whoopCycles.distance,
        steps: whoopCycles.steps,
        timeAwakeMs: whoopCycles.timeAwakeMs,
        zone1Ms: whoopCycles.zone1Ms,
        zone2Ms: whoopCycles.zone2Ms,
        zone3Ms: whoopCycles.zone3Ms,
        zone4Ms: whoopCycles.zone4Ms,
        zone5Ms: whoopCycles.zone5Ms,
        whoopCreatedAt: whoopCycles.whoopCreatedAt,
        whoopUpdatedAt: whoopCycles.whoopUpdatedAt,
        createdAt: whoopCycles.createdAt,
        updatedAt: whoopCycles.updatedAt,
      })
      .from(whoopCycles)
      .where(
        and(
          eq(whoopCycles.workosId, workosId),
          gte(whoopCycles.date, startDate),
          lte(whoopCycles.date, endDate)
        )
      )
      .orderBy(desc(whoopCycles.startTime));
  },

  async getWorkouts(
    db: D1Database,
    workosId: string,
    startDate: string,
    endDate: string
  ): Promise<WhoopWorkoutWithoutJson[]> {
    const drizzleDb = createDb(db);

    return drizzleDb
      .select({
        id: whoopWorkouts.id,
        workosId: whoopWorkouts.workosId,
        name: whoopWorkouts.name,
        sportId: whoopWorkouts.sportId,
        sportName: whoopWorkouts.sportName,
        startTime: whoopWorkouts.startTime,
        endTime: whoopWorkouts.endTime,
        durationMs: whoopWorkouts.durationMs,
        strain: whoopWorkouts.strain,
        averageHeartRate: whoopWorkouts.averageHeartRate,
        maxHeartRate: whoopWorkouts.maxHeartRate,
        calories: whoopWorkouts.calories,
        distance: whoopWorkouts.distance,
        zone1Ms: whoopWorkouts.zone1Ms,
        zone2Ms: whoopWorkouts.zone2Ms,
        zone3Ms: whoopWorkouts.zone3Ms,
        zone4Ms: whoopWorkouts.zone4Ms,
        zone5Ms: whoopWorkouts.zone5Ms,
        whoopCreatedAt: whoopWorkouts.whoopCreatedAt,
        whoopUpdatedAt: whoopWorkouts.whoopUpdatedAt,
        deletedAt: whoopWorkouts.deletedAt,
        createdAt: whoopWorkouts.createdAt,
        updatedAt: whoopWorkouts.updatedAt,
      })
      .from(whoopWorkouts)
      .where(
        and(
          eq(whoopWorkouts.workosId, workosId),
          gte(whoopWorkouts.startTime, startDate),
          lte(whoopWorkouts.startTime, endDate),
          isNull(whoopWorkouts.deletedAt)
        )
      )
      .orderBy(desc(whoopWorkouts.startTime));
  },

  async getLatestSyncDate(
    db: D1Database,
    workosId: string
  ): Promise<string | null> {
    const drizzleDb = createDb(db);

    const [connection] = await drizzleDb
      .select({ lastSyncAt: whoopConnections.lastSyncAt })
      .from(whoopConnections)
      .where(eq(whoopConnections.workosId, workosId));

    return connection?.lastSyncAt ?? null;
  },

  async insertWebhookEvent(
    db: D1Database,
    event: NewWhoopWebhookEvent
  ): Promise<boolean> {
    const drizzleDb = createDb(db);

    try {
      await drizzleDb.insert(whoopWebhookEvents).values(event);
      return true;
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'SQLITE_CONSTRAINT') {
        return false;
      }
      throw error;
    }
  },

  async markWebhookProcessed(
    db: D1Database,
    eventId: string,
    error?: string
  ): Promise<void> {
    const drizzleDb = createDb(db);

    await drizzleDb
      .update(whoopWebhookEvents)
      .set({
        processedAt: new Date().toISOString(),
        processingError: error ?? null,
      })
      .where(eq(whoopWebhookEvents.id, eventId));
  },

  async markConnectionRevoked(db: D1Database, workosId: string): Promise<void> {
    const drizzleDb = createDb(db);

    await drizzleDb
      .update(whoopConnections)
      .set({
        syncStatus: 'revoked',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(whoopConnections.workosId, workosId));
  },

  async getConnectionByWhoopUserId(db: D1Database, whoopUserId: string): Promise<WhoopConnection | null> {
    const drizzleDb = createDb(db);

    const [connection] = await drizzleDb
      .select()
      .from(whoopConnections)
      .where(eq(whoopConnections.whoopUserId, whoopUserId));

    return connection || null;
  },
};

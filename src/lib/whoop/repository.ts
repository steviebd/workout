import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { createDb } from '~/lib/db';
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

const SYNC_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

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
      .onConflictDoNothing()
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

    return result.success;
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

  async getSleeps(
    db: D1Database,
    workosId: string,
    startDate: string,
    endDate: string
  ): Promise<Array<typeof whoopSleeps.$inferSelect>> {
    const drizzleDb = createDb(db);

    return drizzleDb
      .select()
      .from(whoopSleeps)
      .where(
        and(
          eq(whoopSleeps.workosId, workosId),
          gte(whoopSleeps.sleepDate, startDate),
          lte(whoopSleeps.sleepDate, endDate)
        )
      )
      .orderBy(desc(whoopSleeps.startTime));
  },

  async getRecoveries(
    db: D1Database,
    workosId: string,
    startDate: string,
    endDate: string
  ): Promise<Array<typeof whoopRecoveries.$inferSelect>> {
    const drizzleDb = createDb(db);

    return drizzleDb
      .select()
      .from(whoopRecoveries)
      .where(
        and(
          eq(whoopRecoveries.workosId, workosId),
          gte(whoopRecoveries.date, startDate),
          lte(whoopRecoveries.date, endDate)
        )
      )
      .orderBy(desc(whoopRecoveries.date));
  },

  async getCycles(
    db: D1Database,
    workosId: string,
    startDate: string,
    endDate: string
  ): Promise<Array<typeof whoopCycles.$inferSelect>> {
    const drizzleDb = createDb(db);

    return drizzleDb
      .select()
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
  ): Promise<Array<typeof whoopWorkouts.$inferSelect>> {
    const drizzleDb = createDb(db);

    return drizzleDb
      .select()
      .from(whoopWorkouts)
      .where(
        and(
          eq(whoopWorkouts.workosId, workosId),
          gte(whoopWorkouts.startTime, startDate),
          lte(whoopWorkouts.startTime, endDate)
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

    return connection?.lastSyncAt || null;
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
        processingError: error || null,
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

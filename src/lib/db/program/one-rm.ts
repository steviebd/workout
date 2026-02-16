import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { userProgramCycles, workouts } from '../schema';
import { getDb, type DbOrTx } from '../index';
import type { UserProgramCycle } from './types';

/**
 * Updates the 1RM values for a program cycle
 * @param db - D1 database instance
 * @param cycleId - The program cycle ID
 * @param workosId - The user's WorkOS ID for ownership validation
 * @param data - One or more 1RM values to update
 * @returns The updated program cycle, or null if not found
 */
export async function updateProgramCycle1RM(
  dbOrTx: DbOrTx,
  cycleId: string,
  workosId: string,
  data: { squat1rm?: number; bench1rm?: number; deadlift1rm?: number; ohp1rm?: number }
): Promise<UserProgramCycle | null> {
  const db = getDb(dbOrTx);

  const existing = await db
    .select()
    .from(userProgramCycles)
    .where(and(eq(userProgramCycles.id, cycleId), eq(userProgramCycles.workosId, workosId)))
    .get();

  if (!existing) {
    return null;
  }

  const updateData: Partial<UserProgramCycle> = {
    ...data,
    startingSquat1rm: existing.startingSquat1rm ?? existing.squat1rm,
    startingBench1rm: existing.startingBench1rm ?? existing.bench1rm,
    startingDeadlift1rm: existing.startingDeadlift1rm ?? existing.deadlift1rm,
    startingOhp1rm: existing.startingOhp1rm ?? existing.ohp1rm,
    updatedAt: new Date().toISOString(),
  };

  const updated = await db
    .update(userProgramCycles)
    .set(updateData)
    .where(and(eq(userProgramCycles.id, cycleId), eq(userProgramCycles.workosId, workosId)))
    .returning()
    .get();

  return updated as UserProgramCycle | null;
}

/**
 * Retrieves the latest 1RM values from completed workouts or current program cycle
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @returns Object containing squat, bench, deadlift, and OHP 1RM values, or null if none found
 */
export async function getLatestOneRMs(
  dbOrTx: DbOrTx,
  workosId: string
): Promise<{ squat1rm: number | null; bench1rm: number | null; deadlift1rm: number | null; ohp1rm: number | null } | null> {
  const db = getDb(dbOrTx);

  const latestOneRMs = await db
    .select({
      squat1rm: workouts.squat1rm,
      bench1rm: workouts.bench1rm,
      deadlift1rm: workouts.deadlift1rm,
      ohp1rm: workouts.ohp1rm,
      completedAt: workouts.completedAt,
    })
    .from(workouts)
    .where(
      and(
        eq(workouts.workosId, workosId),
        sql`${workouts.name} = '1RM Test'`,
        isNotNull(workouts.completedAt)
      )
    )
    .orderBy(desc(workouts.completedAt))
    .limit(1)
    .get();

  if (latestOneRMs && (latestOneRMs.squat1rm || latestOneRMs.bench1rm || latestOneRMs.deadlift1rm || latestOneRMs.ohp1rm)) {
    return {
      squat1rm: latestOneRMs.squat1rm,
      bench1rm: latestOneRMs.bench1rm,
      deadlift1rm: latestOneRMs.deadlift1rm,
      ohp1rm: latestOneRMs.ohp1rm,
    };
  }

  const latestCycle = await db
    .select({
      squat1rm: userProgramCycles.squat1rm,
      bench1rm: userProgramCycles.bench1rm,
      deadlift1rm: userProgramCycles.deadlift1rm,
      ohp1rm: userProgramCycles.ohp1rm,
      startedAt: userProgramCycles.startedAt,
    })
    .from(userProgramCycles)
    .where(eq(userProgramCycles.workosId, workosId))
    .orderBy(desc(userProgramCycles.startedAt))
    .limit(1)
    .get();

  if (latestCycle) {
    return {
      squat1rm: latestCycle.squat1rm,
      bench1rm: latestCycle.bench1rm,
      deadlift1rm: latestCycle.deadlift1rm,
      ohp1rm: latestCycle.ohp1rm,
    };
  }

  return null;
}

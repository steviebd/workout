import { and, eq } from 'drizzle-orm';
import { userProgramCycles } from '../schema';
import { getDb, type DbOrTx } from '../index';
import type { UserProgramCycle } from './types';

/**
 * Updates the current week and session progress for a program cycle
 * @param dbOrTx - D1 database instance or transaction
 * @param cycleId - The program cycle ID
 * @param workosId - The user's WorkOS ID for ownership validation
 * @param data - Progress updates for current week and/or session
 * @returns The updated program cycle, or null if not found
 */
export async function updateProgramCycleProgress(
  dbOrTx: DbOrTx,
  cycleId: string,
  workosId: string,
  data: { currentWeek?: number; currentSession?: number }
): Promise<UserProgramCycle | null> {
  const db = getDb(dbOrTx);

  const updates: Partial<UserProgramCycle> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.currentWeek !== undefined) updates.currentWeek = data.currentWeek;
  if (data.currentSession !== undefined) updates.currentSession = data.currentSession;

  const updated = await db
    .update(userProgramCycles)
    .set(updates)
    .where(and(eq(userProgramCycles.id, cycleId), eq(userProgramCycles.workosId, workosId)))
    .returning()
    .get();

  return updated as UserProgramCycle | null;
}

/**
 * Marks a program cycle as completed
 * @param dbOrTx - D1 database instance or transaction
 * @param cycleId - The program cycle ID
 * @param workosId - The user's WorkOS ID for ownership validation
 * @returns The completed program cycle, or null if not found
 */
export async function completeProgramCycle(
  dbOrTx: DbOrTx,
  cycleId: string,
  workosId: string
): Promise<UserProgramCycle | null> {
  const db = getDb(dbOrTx);

  const updated = await db
    .update(userProgramCycles)
    .set({
      status: 'completed',
      isComplete: true,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(userProgramCycles.id, cycleId), eq(userProgramCycles.workosId, workosId)))
    .returning()
    .get();

  return updated as UserProgramCycle | null;
}

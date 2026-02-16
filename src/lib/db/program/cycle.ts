import { and, desc, eq, type SQL } from 'drizzle-orm';
import { userProgramCycles, programCycleWorkouts, generateId } from '../schema';
import { getDb, type DbOrTx } from '../index';
import type { UserProgramCycle, ProgramCycleWorkout, ProgramCycleWithWorkouts, CreateProgramCycleData } from './types';

export type { UserProgramCycle, ProgramCycleWorkout, ProgramCycleWithWorkouts, CreateProgramCycleData };

export async function getProgramCycleWithWorkouts(
  dbOrTx: DbOrTx,
  cycleId: string,
  workosId: string
): Promise<(UserProgramCycle & { workouts: ProgramCycleWorkout[] }) | null> {
  const db = getDb(dbOrTx);

  const cycle = await db
    .select()
    .from(userProgramCycles)
    .where(and(eq(userProgramCycles.id, cycleId), eq(userProgramCycles.workosId, workosId)))
    .get();

  if (!cycle) {
    return null;
  }

  const cycleWorkouts = await db
    .select()
    .from(programCycleWorkouts)
    .where(eq(programCycleWorkouts.cycleId, cycleId))
    .orderBy(programCycleWorkouts.weekNumber, programCycleWorkouts.sessionNumber)
    .all();

  return { ...cycle, workouts: cycleWorkouts };
}

/**
 * Creates a new program cycle with optional workouts for a user
 * @param dbOrTx - D1 database instance or transaction
 * @param workosId - The user's WorkOS ID
 * @param data - Program cycle creation data including workout schedule
 * @returns The newly created program cycle
 */
export async function createProgramCycle(
  dbOrTx: DbOrTx,
  workosId: string,
  data: CreateProgramCycleData
): Promise<UserProgramCycle> {
  const db = getDb(dbOrTx);

  const cycle = await db
    .insert(userProgramCycles)
    .values({
      id: generateId(),
      workosId,
      programSlug: data.programSlug,
      name: data.name,
      squat1rm: data.squat1rm,
      bench1rm: data.bench1rm,
      deadlift1rm: data.deadlift1rm,
      ohp1rm: data.ohp1rm,
      totalSessionsPlanned: data.totalSessionsPlanned,
      preferredGymDays: data.preferredGymDays,
      preferredTimeOfDay: data.preferredTimeOfDay,
      programStartDate: data.programStartDate,
      firstSessionDate: data.firstSessionDate,
    })
    .returning()
    .get();

  if (data.workouts && data.workouts.length > 0) {
    const CHUNK_SIZE = 4;
    for (let i = 0; i < data.workouts.length; i += CHUNK_SIZE) {
      const chunk = data.workouts.slice(i, i + CHUNK_SIZE);
      const workoutInserts = chunk.map((workout) => ({
        id: generateId(),
        cycleId: cycle.id,
        templateId: null,
        weekNumber: workout.weekNumber,
        sessionNumber: workout.sessionNumber,
        sessionName: workout.sessionName,
        targetLifts: workout.targetLifts ?? null,
        isComplete: false,
        scheduledDate: workout.scheduledDate,
        scheduledTime: workout.scheduledTime ?? null,
      }));
      await db.insert(programCycleWorkouts).values(workoutInserts).run();
    }
  }

  return cycle;
}

/**
 * Retrieves a program cycle by ID with ownership validation
 * @param dbOrTx - D1 database instance or transaction
 * @param cycleId - The program cycle ID
 * @param workosId - The user's WorkOS ID for ownership validation
 * @returns The program cycle if found, or null
 */
export async function getProgramCycleById(
  dbOrTx: DbOrTx,
  cycleId: string,
  workosId: string
): Promise<UserProgramCycle | null> {
  const db = getDb(dbOrTx);

  const cycle = await db
    .select()
    .from(userProgramCycles)
    .where(and(eq(userProgramCycles.id, cycleId), eq(userProgramCycles.workosId, workosId)))
    .get();

  return cycle as UserProgramCycle | null;
}

/**
 * Retrieves the most recent active program cycles for a user
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @returns Array of up to 3 active program cycles, ordered by start date
 */
export async function getActiveProgramCycles(
  dbOrTx: DbOrTx,
  workosId: string
): Promise<UserProgramCycle[]> {
  const db = getDb(dbOrTx);

  const cycles = await db
    .select()
    .from(userProgramCycles)
    .where(and(eq(userProgramCycles.workosId, workosId), eq(userProgramCycles.status, 'active')))
    .orderBy(desc(userProgramCycles.startedAt))
    .limit(3)
    .all();

  return cycles as UserProgramCycle[];
}

/**
 * Retrieves all program cycles for a user, optionally filtered by status
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @param options - Optional status filter
 * @returns Array of program cycles ordered by start date
 */
export async function getProgramCyclesByWorkosId(
  dbOrTx: DbOrTx,
  workosId: string,
  options?: { status?: string }
): Promise<UserProgramCycle[]> {
  const db = getDb(dbOrTx);

  const conditions: SQL | undefined = options?.status
    ? and(eq(userProgramCycles.workosId, workosId), eq(userProgramCycles.status, options.status))
    : undefined;

  const cycles = await db
    .select()
    .from(userProgramCycles)
    .where(conditions ? and(conditions) : undefined)
    .orderBy(desc(userProgramCycles.startedAt))
    .all();

  return cycles as UserProgramCycle[];
}

/**
 * Soft deletes a program cycle by marking it as deleted
 * @param db - D1 database instance
 * @param cycleId - The program cycle ID
 * @param workosId - The user's WorkOS ID for ownership validation
 * @returns True if the operation succeeded, false if not found
 */
export async function softDeleteProgramCycle(
  dbOrTx: DbOrTx,
  cycleId: string,
  workosId: string
): Promise<boolean> {
  const db = getDb(dbOrTx);

  const deleted = await db
    .update(userProgramCycles)
    .set({
      status: 'deleted',
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(userProgramCycles.id, cycleId), eq(userProgramCycles.workosId, workosId)))
    .run();

  return deleted.success;
}

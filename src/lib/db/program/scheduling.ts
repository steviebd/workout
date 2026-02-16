import { and, eq } from 'drizzle-orm';
import { programCycleWorkouts, userProgramCycles } from '../schema';
import { getDb, type DbOrTx } from '../index';
import type { ProgramCycleWorkout } from './types';

/**
 * Retrieves all workouts associated with a program cycle
 * @param dbOrTx - D1 database instance or transaction
 * @param cycleId - The program cycle ID
 * @param workosId - The user's WorkOS ID for ownership validation
 * @returns Array of program cycle workouts ordered by week and session number
 */
export async function getCycleWorkouts(
  dbOrTx: DbOrTx,
  cycleId: string,
  workosId: string
): Promise<ProgramCycleWorkout[]> {
  const db = getDb(dbOrTx);

  const cycle = await db
    .select({ id: userProgramCycles.id })
    .from(userProgramCycles)
    .where(and(eq(userProgramCycles.id, cycleId), eq(userProgramCycles.workosId, workosId)))
    .get();

  if (!cycle) {
    return [];
  }

  const cycleWorkouts = await db
    .select()
    .from(programCycleWorkouts)
    .where(eq(programCycleWorkouts.cycleId, cycleId))
    .orderBy(programCycleWorkouts.weekNumber, programCycleWorkouts.sessionNumber)
    .all();

  return cycleWorkouts;
}

/**
 * Retrieves the next incomplete workout in a program cycle
 * @param dbOrTx - D1 database instance or transaction
 * @param cycleId - The program cycle ID
 * @param workosId - The user's WorkOS ID for ownership validation
 * @returns The first incomplete workout, or null if all are complete
 */
export async function getCurrentWorkout(
  dbOrTx: DbOrTx,
  cycleId: string,
  workosId: string
): Promise<ProgramCycleWorkout | null> {
  const db = getDb(dbOrTx);

  const cycle = await db
    .select()
    .from(userProgramCycles)
    .where(and(eq(userProgramCycles.id, cycleId), eq(userProgramCycles.workosId, workosId)))
    .get();

  if (!cycle) {
    return null;
  }

  const workout = await db
    .select()
    .from(programCycleWorkouts)
    .where(
      and(
        eq(programCycleWorkouts.cycleId, cycleId),
        eq(programCycleWorkouts.isComplete, false)
      )
    )
    .orderBy(programCycleWorkouts.weekNumber, programCycleWorkouts.sessionNumber)
    .get();

  return workout as ProgramCycleWorkout | null;
}

/**
 * Marks a program cycle workout as complete by linking it to an actual workout
 * @param dbOrTx - D1 database instance or transaction
 * @param workoutId - The program cycle workout ID
 * @param cycleId - The program cycle ID
 * @param workosId - The user's WorkOS ID for ownership validation
 * @param actualWorkoutId - The ID of the completed workout
 * @throws Will throw if the cycle is not found
 */
export async function markWorkoutComplete(
  dbOrTx: DbOrTx,
  workoutId: string,
  cycleId: string,
  workosId: string,
  actualWorkoutId: string
): Promise<void> {
  const db = getDb(dbOrTx);

  const workout = await db
    .select()
    .from(programCycleWorkouts)
    .where(eq(programCycleWorkouts.id, workoutId))
    .get();

  if (!workout || workout.isComplete) {
    return;
  }

  await db
    .update(programCycleWorkouts)
    .set({
      workoutId: actualWorkoutId,
      isComplete: true,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(programCycleWorkouts.id, workoutId))
    .run();

  // Import here to avoid circular dependency
  const { getProgramCycleById } = await import('./cycle');
  const { updateProgramCycleProgress } = await import('./progress');
  const { completeProgramCycle } = await import('./progress');

  const cycle = await getProgramCycleById(db, cycleId, workosId);
  if (cycle) {
    const allWorkouts = await getCycleWorkouts(db, cycleId, workosId);
    const completedCount = allWorkouts.filter((w) => w.isComplete).length;

    await db
      .update(userProgramCycles)
      .set({
        totalSessionsCompleted: completedCount,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userProgramCycles.id, cycleId))
      .run();

    if (completedCount >= cycle.totalSessionsPlanned && !cycle.isComplete) {
      await completeProgramCycle(db, cycleId, workosId);
    }

    const workoutsByWeek = allWorkouts.reduce<Record<number, typeof allWorkouts>>((acc, w) => {
      const week = w.weekNumber;
      if (!acc[week]) acc[week] = [];
      acc[week].push(w);
      return acc;
    }, {});

    const currentWeekWorkouts = workoutsByWeek[workout.weekNumber] || [];
    const currentWeekComplete = currentWeekWorkouts.length > 0 && currentWeekWorkouts.every((w) => w.isComplete);

    if (currentWeekComplete) {
      const weeks = Object.keys(workoutsByWeek).map(Number).sort((a, b) => a - b);
      const nextIncompleteWeek = weeks.find((week) => {
        return !workoutsByWeek[week].every((w) => w.isComplete);
      });

      if (nextIncompleteWeek !== undefined) {
        await updateProgramCycleProgress(db, cycleId, workosId, {
          currentWeek: nextIncompleteWeek,
        });
      }
    }
  }
}

/**
 * Updates scheduled date and/or time for a program cycle workout
 * @param db - D1 database instance
 * @param workoutId - The program cycle workout ID
 * @param data - Updates for scheduled date and/or time
 * @returns The updated workout, or null if not found
 */
export async function updateProgramCycleWorkout(
  dbOrTx: DbOrTx,
  workoutId: string,
  data: { scheduledDate?: string; scheduledTime?: string }
): Promise<ProgramCycleWorkout | null> {
  const db = getDb(dbOrTx);

  const updates: Partial<ProgramCycleWorkout> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.scheduledDate !== undefined) updates.scheduledDate = data.scheduledDate;
  if (data.scheduledTime !== undefined) updates.scheduledTime = data.scheduledTime;

  const updated = await db
    .update(programCycleWorkouts)
    .set(updates)
    .where(eq(programCycleWorkouts.id, workoutId))
    .returning()
    .get();

  return updated as ProgramCycleWorkout | null;
}

/**
 * Retrieves a program cycle workout by ID with optional ownership validation
 * @param dbOrTx - D1 database instance or transaction
 * @param workoutId - The program cycle workout ID
 * @param workosId - Optional WorkOS ID for ownership validation
 * @returns The workout if found, or null
 */
export async function getProgramCycleWorkoutById(
  dbOrTx: DbOrTx,
  workoutId: string,
  workosId?: string
): Promise<ProgramCycleWorkout | null> {
  const db = getDb(dbOrTx);

  if (workosId) {
    const result = await db
      .select({ workout: programCycleWorkouts })
      .from(programCycleWorkouts)
      .innerJoin(userProgramCycles, eq(programCycleWorkouts.cycleId, userProgramCycles.id))
      .where(
        and(
          eq(programCycleWorkouts.id, workoutId),
          eq(userProgramCycles.workosId, workosId)
        )
      )
      .get();
    return result?.workout as ProgramCycleWorkout | null;
  }

  const workout = await db
    .select()
    .from(programCycleWorkouts)
    .where(eq(programCycleWorkouts.id, workoutId))
    .get();

  return workout as ProgramCycleWorkout | null;
}

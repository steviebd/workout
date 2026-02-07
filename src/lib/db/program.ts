/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import {
  type ProgramCycleWorkout,
  type Template,
  type UserProgramCycle,
  exercises,
  programCycleWorkouts,
  templateExercises,
  templates,
  userProgramCycles,
  workouts,
  generateId,
} from './schema';
import { createDb, calculateChunkSize } from './index';

type DbOrTx = D1Database | ReturnType<typeof createDb>;

export type { UserProgramCycle, ProgramCycleWorkout };

export interface ProgramCycleWithWorkouts extends UserProgramCycle {
  workouts: ProgramCycleWorkout[];
  templates?: Template[];
}

export interface CreateProgramCycleData {
  programSlug: string;
  name: string;
  squat1rm: number;
  bench1rm: number;
  deadlift1rm: number;
  ohp1rm: number;
  totalSessionsPlanned: number;
  preferredGymDays: string;
  preferredTimeOfDay?: string;
  programStartDate: string;
  firstSessionDate: string;
  workouts: Array<{
    weekNumber: number;
    sessionNumber: number;
    sessionName: string;
    scheduledDate: string;
    scheduledTime?: string;
    targetLifts?: string;
  }>;
}

export interface ProgramWorkoutData {
  templateId: string;
  weekNumber: number;
  sessionNumber: number;
  sessionName: string;
  targetLifts: string;
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
  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

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
  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

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
  db: D1Database,
  workosId: string
): Promise<UserProgramCycle[]> {
  const drizzleDb = createDb(db);

  const cycles = await drizzleDb
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
  db: D1Database,
  workosId: string,
  options?: { status?: string }
): Promise<UserProgramCycle[]> {
  const drizzleDb = createDb(db);

  const conditions = options?.status
    ? and(eq(userProgramCycles.workosId, workosId), eq(userProgramCycles.status, options.status))
    : eq(userProgramCycles.workosId, workosId);

  const cycles = await drizzleDb
    .select()
    .from(userProgramCycles)
    .where(conditions as any)
    .orderBy(desc(userProgramCycles.startedAt))
    .all();

  return cycles as UserProgramCycle[];
}

/**
 * Updates the 1RM values for a program cycle
 * @param db - D1 database instance
 * @param cycleId - The program cycle ID
 * @param workosId - The user's WorkOS ID for ownership validation
 * @param data - One or more 1RM values to update
 * @returns The updated program cycle, or null if not found
 */
export async function updateProgramCycle1RM(
  db: D1Database,
  cycleId: string,
  workosId: string,
  data: { squat1rm?: number; bench1rm?: number; deadlift1rm?: number; ohp1rm?: number }
): Promise<UserProgramCycle | null> {
  const drizzleDb = createDb(db);

  const existing = await drizzleDb
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

  const updated = await drizzleDb
    .update(userProgramCycles)
    .set(updateData)
    .where(and(eq(userProgramCycles.id, cycleId), eq(userProgramCycles.workosId, workosId)))
    .returning()
    .get();

  return updated as UserProgramCycle | null;
}

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
  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

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
  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

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

/**
 * Soft deletes a program cycle by marking it as deleted
 * @param db - D1 database instance
 * @param cycleId - The program cycle ID
 * @param workosId - The user's WorkOS ID for ownership validation
 * @returns True if the operation succeeded, false if not found
 */
export async function softDeleteProgramCycle(
  db: D1Database,
  cycleId: string,
  workosId: string
): Promise<boolean> {
  const drizzleDb = createDb(db);

  const deleted = await drizzleDb
    .update(userProgramCycles)
    .set({
      status: 'deleted',
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(userProgramCycles.id, cycleId), eq(userProgramCycles.workosId, workosId)))
    .run();

  return deleted.success;
}

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
  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

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
  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

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
  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

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
 * Retrieves the latest 1RM values from completed workouts or current program cycle
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @returns Object containing squat, bench, deadlift, and OHP 1RM values, or null if none found
 */
export async function getLatestOneRMs(
  db: D1Database,
  workosId: string
): Promise<{ squat1rm: number | null; bench1rm: number | null; deadlift1rm: number | null; ohp1rm: number | null } | null> {
  const drizzleDb = createDb(db);

  const latestOneRMs = await drizzleDb
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

  const latestCycle = await drizzleDb
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

export interface TargetLift {
  name: string;
  lift?: string;
  targetWeight: number;
  sets: number;
  reps: number;
  isAccessory?: boolean;
  isRequired?: boolean;
  accessoryId?: string;
  addedWeight?: number;
}

export interface TargetLiftWorkout {
  weekNumber: number;
  sessionNumber: number;
  sessionName: string;
  targetLifts?: TargetLift[];
  exercises?: Array<{ name: string; lift?: string; targetWeight: number; sets: number; reps: number }>;
  accessories?: Array<{ name: string; accessoryId?: string; targetWeight?: number; addedWeight?: number; sets?: number; reps?: number | string; isAccessory?: boolean; isRequired?: boolean }>;
}

/**
 * Creates new workouts for a program cycle with target lift data
 * @param db - D1 database instance
 * @param cycleId - The program cycle ID
 * @param cycleWorkouts - Array of workout definitions with target lifts
 * @param defaultScheduledDate - Optional default date for scheduled workouts
 */
export async function createProgramCycleWorkouts(
  db: D1Database,
  cycleId: string,
  cycleWorkouts: TargetLiftWorkout[],
  defaultScheduledDate?: string
): Promise<void> {
  const drizzleDb = createDb(db);

  const workoutData = cycleWorkouts.map((workout) => {
    const targetLifts = JSON.stringify([
      ...(workout.exercises?.map(e => ({ name: e.name, lift: e.lift, targetWeight: e.targetWeight, sets: e.sets, reps: e.reps })) ?? []),
      ...(workout.accessories?.map(a => ({
        name: a.name,
        accessoryId: a.accessoryId,
        targetWeight: a.targetWeight,
        addedWeight: a.addedWeight,
        sets: a.sets,
        reps: a.reps,
        isAccessory: true,
        isRequired: a.isRequired,
      })) ?? []),
    ]);

    return {
      id: generateId(),
      cycleId,
      templateId: null,
      weekNumber: workout.weekNumber,
      sessionNumber: workout.sessionNumber,
      sessionName: workout.sessionName,
      targetLifts,
      isComplete: false,
      scheduledDate: defaultScheduledDate ?? new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
      scheduledTime: null,
    };
  });

  const BATCH_SIZE = 4;

  for (let i = 0; i < workoutData.length; i += BATCH_SIZE) {
    const batch = workoutData.slice(i, i + BATCH_SIZE);
    await drizzleDb.insert(programCycleWorkouts).values(batch as any).run();
  }
}

/**
 * Finds an existing exercise or creates a new one for a workout
 * @param dbOrTx - D1 database instance or transaction
 * @param workosId - The user's WorkOS ID
 * @param exerciseName - The name of the exercise
 * @param lift - Optional lift type to determine muscle group
 * @returns The exercise ID (existing or newly created)
 */
export async function getOrCreateExerciseForWorkout(
  dbOrTx: DbOrTx,
  workosId: string,
  exerciseName: string,
  lift: string | undefined
): Promise<string> {
  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

  const existing = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.workosId, workosId), eq(exercises.name, exerciseName)))
    .get();

  if (existing) {
    return existing.id;
  }

  const muscleGroup = lift === 'squat' || lift === 'deadlift' || lift === 'row'
    ? 'Back'
    : lift === 'bench' || lift === 'ohp'
      ? 'Chest'
      : 'Shoulders';

  const newExercise = await db
    .insert(exercises)
    .values({
      workosId,
      name: exerciseName,
      muscleGroup,
    })
    .returning()
    .get();

  return newExercise.id;
}

function getBaseExerciseName(name: string): string {
  return name.replace(/\s+\d+$/, '').replace(/\s+\d+\+$/, '');
}

/**
 * Generates a template from a program cycle workout
 * @param dbOrTx - D1 database instance or transaction
 * @param workosId - The user's WorkOS ID
 * @param cycleWorkout - The program cycle workout to generate a template from
 * @param cycle - The program cycle containing the workout
 * @returns The ID of the newly created template
 * @throws Will throw if no target lifts are found for the workout
 */
export async function generateTemplateFromWorkout(
  dbOrTx: DbOrTx,
  workosId: string,
  cycleWorkout: ProgramCycleWorkout,
  cycle: UserProgramCycle
): Promise<string> {
  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

  console.log('generateTemplateFromWorkout - cycleWorkout.targetLifts:', cycleWorkout.targetLifts, 'type:', typeof cycleWorkout.targetLifts);
  
  let targetLifts: TargetLift[] = [];
  if (cycleWorkout.targetLifts) {
    let parsed: unknown;
    if (typeof cycleWorkout.targetLifts === 'string') {
      parsed = JSON.parse(cycleWorkout.targetLifts);
    } else {
      parsed = cycleWorkout.targetLifts;
    }
    
    if (Array.isArray(parsed)) {
      targetLifts = parsed as TargetLift[];
    } else if (parsed && typeof parsed === 'object') {
      const obj = parsed as { exercises?: TargetLift[]; accessories?: TargetLift[] };
      const targetExercises = obj.exercises ?? [];
      const accessories = (obj.accessories ?? []).map(a => ({ ...a, isAccessory: true, isRequired: false }));
      targetLifts = [...targetExercises, ...accessories];
    }
  }

  if (targetLifts.length === 0) {
    throw new Error('No target lifts found for workout');
  }

  const templateName = `${cycle.name} - ${cycleWorkout.sessionName}`;

  const template = await db
    .insert(templates)
    .values({
      workosId,
      name: templateName,
      description: cycleWorkout.sessionName,
      programCycleId: cycle.id,
    })
    .returning()
    .get();

  const templateExercisesData: Array<typeof templateExercises.$inferInsert> = [];
  let orderIndex = 0;
  const exerciseSetCounts = new Map<string, number>();

  for (const lift of targetLifts) {
    const baseName = getBaseExerciseName(lift.name);
    const exerciseId = await getOrCreateExerciseForWorkout(db, workosId, baseName, lift.lift);

    const currentCount = exerciseSetCounts.get(exerciseId) ?? 0;
    const setNumber = currentCount + 1;
    exerciseSetCounts.set(exerciseId, setNumber);

    const isAmrap = lift.name.endsWith('+');

    templateExercisesData.push({
      templateId: template.id,
      exerciseId,
      orderIndex,
      targetWeight: lift.targetWeight,
      addedWeight: lift.addedWeight ?? 0,
      sets: lift.sets,
      reps: lift.reps,
      repsRaw: null,
      isAmrap,
      setNumber,
      isAccessory: lift.isAccessory ?? false,
      isRequired: lift.isRequired ?? true,
    });

    orderIndex++;
  }

  const CHUNK_SIZE = calculateChunkSize(12);

  for (let i = 0; i < templateExercisesData.length; i += CHUNK_SIZE) {
    const batch = templateExercisesData.slice(i, i + CHUNK_SIZE);
    await db.insert(templateExercises).values(batch).run();
  }

  await db
    .update(programCycleWorkouts)
    .set({ templateId: template.id, updatedAt: new Date().toISOString() })
    .where(eq(programCycleWorkouts.id, cycleWorkout.id))
    .run();

  return template.id;
}

/**
 * Updates scheduled date and/or time for a program cycle workout
 * @param db - D1 database instance
 * @param workoutId - The program cycle workout ID
 * @param data - Updates for scheduled date and/or time
 * @returns The updated workout, or null if not found
 */
export async function updateProgramCycleWorkout(
  db: D1Database,
  workoutId: string,
  data: { scheduledDate?: string; scheduledTime?: string }
): Promise<ProgramCycleWorkout | null> {
  const drizzleDb = createDb(db);

  const updates: Partial<ProgramCycleWorkout> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.scheduledDate !== undefined) updates.scheduledDate = data.scheduledDate;
  if (data.scheduledTime !== undefined) updates.scheduledTime = data.scheduledTime;

  const updated = await drizzleDb
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
  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

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

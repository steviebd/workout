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

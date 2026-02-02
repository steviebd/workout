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
import { createDb } from './index';

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
}

export interface ProgramWorkoutData {
  templateId: string;
  weekNumber: number;
  sessionNumber: number;
  sessionName: string;
  targetLifts: string;
}

export async function createProgramCycle(
  db: D1Database,
  workosId: string,
  data: CreateProgramCycleData
): Promise<UserProgramCycle> {
  const drizzleDb = createDb(db);

  const cycle = await drizzleDb
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
    })
    .returning()
    .get();

  return cycle;
}

export async function getProgramCycleById(
  db: D1Database,
  cycleId: string,
  workosId: string
): Promise<UserProgramCycle | null> {
  const drizzleDb = createDb(db);

  const cycle = await drizzleDb
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
    .limit(1)
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
  db: D1Database,
  cycleId: string,
  workosId: string,
  data: { currentWeek?: number; currentSession?: number }
): Promise<UserProgramCycle | null> {
  const drizzleDb = createDb(db);

  const updates: Partial<UserProgramCycle> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.currentWeek !== undefined) updates.currentWeek = data.currentWeek;
  if (data.currentSession !== undefined) updates.currentSession = data.currentSession;

  const updated = await drizzleDb
    .update(userProgramCycles)
    .set(updates)
    .where(and(eq(userProgramCycles.id, cycleId), eq(userProgramCycles.workosId, workosId)))
    .returning()
    .get();

  return updated as UserProgramCycle | null;
}

export async function completeProgramCycle(
  db: D1Database,
  cycleId: string,
  workosId: string
): Promise<UserProgramCycle | null> {
  const drizzleDb = createDb(db);

  const updated = await drizzleDb
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
  db: D1Database,
  cycleId: string,
  workosId: string
): Promise<ProgramCycleWorkout[]> {
  const drizzleDb = createDb(db);

  const cycle = await drizzleDb
    .select({ id: userProgramCycles.id })
    .from(userProgramCycles)
    .where(and(eq(userProgramCycles.id, cycleId), eq(userProgramCycles.workosId, workosId)))
    .get();

  if (!cycle) {
    return [];
  }

  const cycleWorkouts = await drizzleDb
    .select()
    .from(programCycleWorkouts)
    .where(eq(programCycleWorkouts.cycleId, cycleId))
    .orderBy(programCycleWorkouts.weekNumber, programCycleWorkouts.sessionNumber)
    .all();

  return cycleWorkouts;
}

export async function getCurrentWorkout(
  db: D1Database,
  cycleId: string,
  workosId: string
): Promise<ProgramCycleWorkout | null> {
  const drizzleDb = createDb(db);

  const cycle = await drizzleDb
    .select()
    .from(userProgramCycles)
    .where(and(eq(userProgramCycles.id, cycleId), eq(userProgramCycles.workosId, workosId)))
    .get();

  if (!cycle) {
    return null;
  }

  const workout = await drizzleDb
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
  db: D1Database,
  workoutId: string,
  cycleId: string,
  workosId: string,
  actualWorkoutId: string
): Promise<void> {
  const drizzleDb = createDb(db);

  await drizzleDb
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

    if (completedCount >= cycle.totalSessionsPlanned && !cycle.isComplete) {
      await completeProgramCycle(db, cycleId, workosId);
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
  targetLifts: TargetLift[];
}

export async function getOrCreateExerciseForWorkout(
  db: D1Database,
  workosId: string,
  exerciseName: string,
  lift: string | undefined
): Promise<string> {
  const drizzleDb = createDb(db);

  const existing = await drizzleDb
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

  const newExercise = await drizzleDb
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
  db: D1Database,
  workosId: string,
  cycleWorkout: ProgramCycleWorkout,
  cycle: UserProgramCycle
): Promise<string> {
  const drizzleDb = createDb(db);

  const targetLifts: TargetLift[] = cycleWorkout.targetLifts
    ? JSON.parse(cycleWorkout.targetLifts)
    : [];

  if (targetLifts.length === 0) {
    throw new Error('No target lifts found for workout');
  }

  const templateName = `${cycle.name} - ${cycleWorkout.sessionName}`;

  const template = await drizzleDb
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

  const BATCH_SIZE = 7;

  for (let i = 0; i < templateExercisesData.length; i += BATCH_SIZE) {
    const batch = templateExercisesData.slice(i, i + BATCH_SIZE);
    await drizzleDb.insert(templateExercises).values(batch).run();
  }

  await drizzleDb
    .update(programCycleWorkouts)
    .set({ templateId: template.id, updatedAt: new Date().toISOString() })
    .where(eq(programCycleWorkouts.id, cycleWorkout.id))
    .run();

  return template.id;
}

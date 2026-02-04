/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import {
  type NewWorkout,
  type NewWorkoutExercise,
  type NewWorkoutSet,
  type Workout,
  type WorkoutExercise,
  type WorkoutSet,
  exercises,
  userProgramCycles,
  workoutExercises,
  workoutSets,
  workouts,
} from './schema';
import { createDb, calculateChunkSize } from './index';

type DbOrTx = D1Database | ReturnType<typeof createDb>;

export type { Workout, NewWorkout, WorkoutExercise, NewWorkoutExercise, WorkoutSet, NewWorkoutSet };

export interface CreateWorkoutData {
  name: string;
  templateId?: string;
  programCycleId?: string;
  notes?: string;
  localId?: string;
}

export interface UpdateWorkoutData {
  name?: string;
  notes?: string;
  completedAt?: string;
  squat1rm?: number | null;
  bench1rm?: number | null;
  deadlift1rm?: number | null;
  ohp1rm?: number | null;
  startingSquat1rm?: number | null;
  startingBench1rm?: number | null;
  startingDeadlift1rm?: number | null;
  startingOhp1rm?: number | null;
}

export interface GetWorkoutsOptions {
  sortBy?: 'createdAt' | 'startedAt';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
  fromDate?: string;
  toDate?: string;
  exerciseId?: string;
}

export interface WorkoutWithExercises extends Workout {
  exercises: WorkoutExerciseWithDetails[];
}

export interface WorkoutExerciseWithDetails {
  id: string;
  localId: string | null;
  workoutId: string;
  exerciseId: string;
  orderIndex: number;
  notes: string | null;
  isAmrap: boolean;
  setNumber: number | null;
  exercise?: {
    id: string;
    name: string;
    muscleGroup: string | null;
  };
  sets: WorkoutSet[];
}

export interface LastWorkoutData {
  exerciseId: string;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
}

export async function createWorkout(
  dbOrTx: D1Database | ReturnType<typeof createDb>,
  data: CreateWorkoutData & { workosId: string },
  startedAt?: string
): Promise<Workout> {
  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

  const workout = await db
    .insert(workouts)
    .values({
      workosId: data.workosId,
      name: data.name,
      templateId: data.templateId,
      programCycleId: data.programCycleId,
      notes: data.notes,
      startedAt: startedAt ?? new Date().toISOString(),
      localId: data.localId,
    })
    .returning()
    .get();

  return workout;
}

export async function getLastWorkoutSetsForExercises(
  dbOrTx: DbOrTx,
  workosId: string,
  exerciseIds: string[]
): Promise<Map<string, LastWorkoutSetData[]>> {
  if (exerciseIds.length === 0) {
    return new Map();
  }

  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

  const recentWorkoutExercises = await db
    .select({
      exerciseId: workoutExercises.exerciseId,
      workoutExerciseId: workoutExercises.id,
      completedAt: workouts.completedAt,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workouts.workosId, workosId),
      inArray(workoutExercises.exerciseId, exerciseIds),
      isNotNull(workoutSets.completedAt)
    ))
    .orderBy(desc(workouts.completedAt))
    .all();

  if (recentWorkoutExercises.length === 0) {
    return new Map();
  }

  const latestWeByExercise = new Map<string, string>();
  for (const rwe of recentWorkoutExercises) {
    if (!latestWeByExercise.has(rwe.exerciseId)) {
      latestWeByExercise.set(rwe.exerciseId, rwe.workoutExerciseId);
    }
  }

  const workoutExerciseIds = [...latestWeByExercise.values()];

  const sets = await db
    .select({
      workoutExerciseId: workoutSets.workoutExerciseId,
      setNumber: workoutSets.setNumber,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      rpe: workoutSets.rpe,
    })
    .from(workoutSets)
    .where(inArray(workoutSets.workoutExerciseId, workoutExerciseIds))
    .orderBy(workoutSets.setNumber)
    .all();

  const setsByWe = new Map<string, LastWorkoutSetData[]>();
  for (const s of sets) {
    const arr = setsByWe.get(s.workoutExerciseId) ?? [];
    arr.push({
      setNumber: s.setNumber,
      weight: s.weight,
      reps: s.reps,
      rpe: s.rpe,
    });
    setsByWe.set(s.workoutExerciseId, arr);
  }

  const result = new Map<string, LastWorkoutSetData[]>();
  for (const exerciseId of exerciseIds) {
    const weId = latestWeByExercise.get(exerciseId);
    result.set(exerciseId, weId ? (setsByWe.get(weId) ?? []) : []);
  }

  return result;
}

export async function getWorkoutExercises(
  dbOrTx: DbOrTx,
  workoutId: string,
  workosId: string
): Promise<WorkoutExerciseWithDetails[]> {
  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

  const results = await db
    .select({
      id: workoutExercises.id,
      localId: workoutExercises.localId,
      workoutId: workoutExercises.workoutId,
      exerciseId: workoutExercises.exerciseId,
      orderIndex: workoutExercises.orderIndex,
      notes: workoutExercises.notes,
      isAmrap: workoutExercises.isAmrap,
      setNumber: workoutExercises.setNumber,
      exercise: {
        id: exercises.id,
        name: exercises.name,
        muscleGroup: exercises.muscleGroup,
      },
      sets: {
        id: workoutSets.id,
        localId: workoutSets.localId,
        workoutExerciseId: workoutSets.workoutExerciseId,
        setNumber: workoutSets.setNumber,
        weight: workoutSets.weight,
        reps: workoutSets.reps,
        rpe: workoutSets.rpe,
        isComplete: workoutSets.isComplete,
        completedAt: workoutSets.completedAt,
        createdAt: workoutSets.createdAt,
      },
    })
    .from(workoutExercises)

    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .leftJoin(workoutSets, eq(workoutExercises.id, workoutSets.workoutExerciseId))
    .where(and(
      eq(workoutExercises.workoutId, workoutId),
      eq(exercises.workosId, workosId),
      eq(exercises.isDeleted, false)
    ))
    .orderBy(workoutExercises.orderIndex, workoutSets.setNumber)
    .all();

  const exerciseMap = new Map<string, WorkoutExerciseWithDetails>();

  for (const row of results) {
    const existing = exerciseMap.get(row.id);
    const setData = row.sets as WorkoutSet | null;
    if (existing) {
      if (setData?.id) {
        existing.sets.push(setData);
      }
    } else {
      exerciseMap.set(row.id, {
        id: row.id,
        localId: row.localId,
        workoutId: row.workoutId,
        exerciseId: row.exerciseId,
        orderIndex: row.orderIndex,
        notes: row.notes,
        isAmrap: row.isAmrap ?? false,
        setNumber: row.setNumber,
        exercise: row.exercise,
        sets: setData?.id ? [setData] : [],
      });
    }
  }

  return Array.from(exerciseMap.values());
}

export async function createWorkoutWithDetails(
  dbOrTx: DbOrTx,
  data: CreateWorkoutData & { workosId: string; exerciseIds: string[] },
  startedAt?: string
): Promise<WorkoutWithExercises> {
  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

  const workout = await db
    .insert(workouts)
    .values({
      workosId: data.workosId,
      name: data.name,
      templateId: data.templateId,
      programCycleId: data.programCycleId,
      notes: data.notes,
      startedAt: startedAt ?? new Date().toISOString(),
      localId: data.localId,
    })
    .returning()
    .get();

  let workoutExercisesData: NewWorkoutExercise[];

  if (data.templateId) {
    const { getTemplateExercises } = await import('./template');
    const templateExercises = await getTemplateExercises(db, data.templateId, data.workosId);

    workoutExercisesData = templateExercises.map((te) => ({
      workoutId: workout.id,
      exerciseId: te.exerciseId,
      orderIndex: te.orderIndex,
      isAmrap: te.isAmrap ?? false,
      setNumber: te.setNumber ?? null,
    }));
  } else {
    workoutExercisesData = data.exerciseIds.map((exerciseId, index) => ({
      workoutId: workout.id,
      exerciseId,
      orderIndex: index,
      isAmrap: false,
      setNumber: null,
    }));
  }

  let newWorkoutExercises: Array<{ id: string; exerciseId: string }> = [];

  if (workoutExercisesData.length > 0) {
    newWorkoutExercises = await db
      .insert(workoutExercises)
      .values(workoutExercisesData)
      .returning()
      .all();
  }

  const lastSetsByExercise = await getLastWorkoutSetsForExercises(db, data.workosId, data.exerciseIds);

  const setsToInsert: NewWorkoutSet[] = [];

  for (let i = 0; i < newWorkoutExercises.length; i++) {
    const workoutExercise = newWorkoutExercises[i];
    const exerciseId = data.exerciseIds[i];
    const lastSets = lastSetsByExercise.get(exerciseId) ?? [];

    if (lastSets.length > 0) {
      for (const setData of lastSets) {
        setsToInsert.push({
          workoutExerciseId: workoutExercise.id,
          setNumber: setData.setNumber,
          weight: setData.weight,
          reps: setData.reps,
          rpe: setData.rpe,
          isComplete: false,
        });
      }
    } else {
      setsToInsert.push({
        workoutExerciseId: workoutExercise.id,
        setNumber: 1,
        isComplete: false,
      });
    }
  }

  if (setsToInsert.length > 0) {
    const CHUNK_SIZE = calculateChunkSize(7);
    for (let i = 0; i < setsToInsert.length; i += CHUNK_SIZE) {
      const batch = setsToInsert.slice(i, i + CHUNK_SIZE);
      await db.insert(workoutSets).values(batch).run();
    }
  }

  const exercisesWithSets = await getWorkoutExercises(db, workout.id, data.workosId);

  return {
    ...workout,
    exercises: exercisesWithSets,
  };
}

export async function getWorkoutById(
  db: D1Database,
  workoutId: string,
  workosId: string
): Promise<Workout | null> {
  const drizzleDb = createDb(db);

  const workout = await drizzleDb
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.workosId, workosId)))
    .get();

  return workout ?? null;
}

/**
 * Fetches a workout with all its exercises and sets in a single structured response.
 * Joins workouts, exercises, and sets tables, then groups sets by exercise using a map.
 * Used by UI to display complete workout details in one request.
 */
export async function getWorkoutWithExercises(
  db: D1Database,
  workoutId: string,
  workosId: string
): Promise<WorkoutWithExercises | null> {
  const drizzleDb = createDb(db);

  const workout = await drizzleDb
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.workosId, workosId)))
    .get();

  if (!workout) {
    return null;
  }

  const exercisesWithSets = await drizzleDb
    .select({
      id: workoutExercises.id,
      localId: workoutExercises.localId,
      workoutId: workoutExercises.workoutId,
      exerciseId: workoutExercises.exerciseId,
      orderIndex: workoutExercises.orderIndex,
      notes: workoutExercises.notes,
      isAmrap: workoutExercises.isAmrap,
      setNumber: workoutExercises.setNumber,
      exercise: {
        id: exercises.id,
        name: exercises.name,
        muscleGroup: exercises.muscleGroup,
      },
      sets: {
        id: workoutSets.id,
        localId: workoutSets.localId,
        workoutExerciseId: workoutSets.workoutExerciseId,
        setNumber: workoutSets.setNumber,
        weight: workoutSets.weight,
        reps: workoutSets.reps,
        rpe: workoutSets.rpe,
        isComplete: workoutSets.isComplete,
        completedAt: workoutSets.completedAt,
        createdAt: workoutSets.createdAt,
      },
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .leftJoin(workoutSets, eq(workoutExercises.id, workoutSets.workoutExerciseId))
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(workoutExercises.orderIndex, workoutSets.setNumber)
    .all();

  const exerciseMap = new Map<string, WorkoutExerciseWithDetails>();

  for (const row of exercisesWithSets) {
    const existing = exerciseMap.get(row.id);
    const setData = row.sets as WorkoutSet | null;
    if (existing) {
      if (setData?.id) {
        existing.sets.push(setData);
      }
    } else {
      exerciseMap.set(row.id, {
        id: row.id,
        localId: row.localId,
        workoutId: row.workoutId,
        exerciseId: row.exerciseId,
        orderIndex: row.orderIndex,
        notes: row.notes,
        isAmrap: row.isAmrap ?? false,
        setNumber: row.setNumber,
        exercise: row.exercise,
        sets: setData?.id ? [setData] : [],
      });
    }
  }

  return {
    ...workout,
    exercises: Array.from(exerciseMap.values()),
  } as WorkoutWithExercises;
}

export interface WorkoutWithExerciseCount {
  id: string;
  workosId: string;
  name: string;
  startedAt: string;
  completedAt: string | null;
  exerciseCount: number;
  totalSets: number;
  totalVolume: number;
  duration: number;
  programCycleId: string | null;
  squat1rm: number | null;
  bench1rm: number | null;
  deadlift1rm: number | null;
  ohp1rm: number | null;
  startingSquat1rm: number | null;
  startingBench1rm: number | null;
  startingDeadlift1rm: number | null;
  startingOhp1rm: number | null;
  programCycle: {
    name: string;
    programSlug: string;
    squat1rm: number;
    bench1rm: number;
    deadlift1rm: number;
    ohp1rm: number;
    startingSquat1rm: number | null;
    startingBench1rm: number | null;
    startingDeadlift1rm: number | null;
    startingOhp1rm: number | null;
  } | null;
}

export async function getWorkoutsByWorkosId(
  db: D1Database,
  workosId: string,
  options: GetWorkoutsOptions = {}
): Promise<WorkoutWithExerciseCount[]> {
  const drizzleDb = createDb(db);

  const { sortBy = 'startedAt', sortOrder = 'DESC', limit, offset, fromDate, toDate, exerciseId } = options;

  const conditions = [
    eq(workouts.workosId, workosId),
    isNotNull(workouts.completedAt),
  ];

  if (fromDate) {
    conditions.push(sql`${workouts.startedAt} >= ${fromDate}`);
  }

  if (toDate) {
    conditions.push(sql`${workouts.startedAt} <= ${toDate}`);
  }

  if (exerciseId) {
    conditions.push(sql`EXISTS (SELECT 1 FROM workout_exercises we WHERE we.workout_id = ${workouts.id} AND we.exercise_id = ${exerciseId})`);
  }

  let query = drizzleDb
    .select({
      id: workouts.id,
      workosId: workouts.workosId,
      name: workouts.name,
      startedAt: workouts.startedAt,
      completedAt: workouts.completedAt,
      exerciseCount: sql<number>`count(${workoutExercises.id})`,
      totalSets: sql<number>`COALESCE(SUM(CASE WHEN ${workoutSets.isComplete} = 1 THEN 1 ELSE 0 END), 0)`,
      totalVolume: sql<number>`COALESCE(SUM(CASE WHEN ${workoutSets.isComplete} = 1 AND ${workoutSets.weight} > 0 THEN ${workoutSets.weight} * ${workoutSets.reps} ELSE 0 END), 0)`,
      duration: sql<number>`COALESCE(ROUND((julianday(${workouts.completedAt}) - julianday(${workouts.startedAt})) * 1440), 0)`,
      programCycleId: workouts.programCycleId,
      squat1rm: sql<number | null>`CASE WHEN ${workouts.name} = '1RM Test' THEN COALESCE(MAX(CASE WHEN LOWER(${exercises.name}) LIKE '%squat%' AND ${workoutSets.isComplete} = 1 THEN ${workoutSets.weight} END), ${workouts.squat1rm}) ELSE ${workouts.squat1rm} END`,
      bench1rm: sql<number | null>`CASE WHEN ${workouts.name} = '1RM Test' THEN COALESCE(MAX(CASE WHEN LOWER(${exercises.name}) LIKE '%bench%' AND ${workoutSets.isComplete} = 1 THEN ${workoutSets.weight} END), ${workouts.bench1rm}) ELSE ${workouts.bench1rm} END`,
      deadlift1rm: sql<number | null>`CASE WHEN ${workouts.name} = '1RM Test' THEN COALESCE(MAX(CASE WHEN LOWER(${exercises.name}) LIKE '%deadlift%' AND ${workoutSets.isComplete} = 1 THEN ${workoutSets.weight} END), ${workouts.deadlift1rm}) ELSE ${workouts.deadlift1rm} END`,
      ohp1rm: sql<number | null>`CASE WHEN ${workouts.name} = '1RM Test' THEN COALESCE(MAX(CASE WHEN (LOWER(${exercises.name}) LIKE '%overhead%' OR LOWER(${exercises.name}) LIKE '%ohp%') AND ${workoutSets.isComplete} = 1 THEN ${workoutSets.weight} END), ${workouts.ohp1rm}) ELSE ${workouts.ohp1rm} END`,
      startingSquat1rm: sql<number | null>`COALESCE(${workouts.startingSquat1rm}, ${userProgramCycles.startingSquat1rm})`,
      startingBench1rm: sql<number | null>`COALESCE(${workouts.startingBench1rm}, ${userProgramCycles.startingBench1rm})`,
      startingDeadlift1rm: sql<number | null>`COALESCE(${workouts.startingDeadlift1rm}, ${userProgramCycles.startingDeadlift1rm})`,
      startingOhp1rm: sql<number | null>`COALESCE(${workouts.startingOhp1rm}, ${userProgramCycles.startingOhp1rm})`,
      programCycle: {
        name: userProgramCycles.name,
        programSlug: userProgramCycles.programSlug,
        squat1rm: userProgramCycles.squat1rm,
        bench1rm: userProgramCycles.bench1rm,
        deadlift1rm: userProgramCycles.deadlift1rm,
        ohp1rm: userProgramCycles.ohp1rm,
        startingSquat1rm: userProgramCycles.startingSquat1rm,
        startingBench1rm: userProgramCycles.startingBench1rm,
        startingDeadlift1rm: userProgramCycles.startingDeadlift1rm,
        startingOhp1rm: userProgramCycles.startingOhp1rm,
      },
    })
    .from(workouts)
    .leftJoin(workoutExercises, eq(workouts.id, workoutExercises.workoutId))
    .leftJoin(workoutSets, eq(workoutExercises.id, workoutSets.workoutExerciseId))
    .leftJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .leftJoin(userProgramCycles, eq(workouts.programCycleId, userProgramCycles.id))
    .where(and(...conditions))
    .groupBy(workouts.id, userProgramCycles.id, userProgramCycles.name, userProgramCycles.programSlug, userProgramCycles.squat1rm, userProgramCycles.bench1rm, userProgramCycles.deadlift1rm, userProgramCycles.ohp1rm, userProgramCycles.startingSquat1rm, userProgramCycles.startingBench1rm, userProgramCycles.startingDeadlift1rm, userProgramCycles.startingOhp1rm);

  if (sortBy === 'startedAt') {
    query = sortOrder === 'DESC'
      ? (query as any).orderBy(desc(workouts.startedAt))
      : (query as any).orderBy(asc(workouts.startedAt));
  } else {
    query = sortOrder === 'DESC'
      ? (query as any).orderBy(desc(workouts.createdAt))
      : (query as any).orderBy(asc(workouts.createdAt));
  }

  if (offset !== undefined) {
    query = (query as any).offset(offset);
  }

  if (limit !== undefined) {
    query = (query as any).limit(limit);
  }

  const results = await query;

  return results as WorkoutWithExerciseCount[];
}

export async function updateWorkout(
  db: D1Database,
  workoutId: string,
  workosId: string,
  data: UpdateWorkoutData
): Promise<Workout | null> {
  const drizzleDb = createDb(db);

  const updated = await drizzleDb
    .update(workouts)
    .set(data)
    .where(and(eq(workouts.id, workoutId), eq(workouts.workosId, workosId)))
    .returning()
    .get();

   
  return updated ?? null;
}

export async function completeWorkout(
  db: D1Database,
  workoutId: string,
  workosId: string
): Promise<Workout | null> {
  return updateWorkout(db, workoutId, workosId, {
    completedAt: new Date().toISOString(),
  });
}

export async function deleteWorkout(
  db: D1Database,
  workoutId: string,
  workosId: string
): Promise<boolean> {
  const drizzleDb = createDb(db);

  const result = await drizzleDb
    .delete(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.workosId, workosId)))
    .run();

  return result.success;
}

export async function createWorkoutExercise(
  db: D1Database,
  workoutId: string,
  workosId: string,
  exerciseId: string,
  orderIndex: number,
  notes?: string,
  localId?: string,
  isAmrap?: boolean,
  setNumber?: number
): Promise<WorkoutExercise | null> {
  const drizzleDb = createDb(db);

  const workout = await drizzleDb
    .select({ id: workouts.id })
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.workosId, workosId)))
    .get();

  if (!workout) {
    return null;
  }

  const workoutExercise = await drizzleDb
    .insert(workoutExercises)
    .values({
      workoutId,
      exerciseId,
      orderIndex,
      notes,
      localId,
      isAmrap: isAmrap ?? false,
      setNumber: setNumber ?? null,
    })
    .returning()
    .get();

  return workoutExercise;
}

export async function removeWorkoutExercise(
  db: D1Database,
  workoutId: string,
  exerciseId: string,
  workosId: string
): Promise<boolean> {
  const drizzleDb = createDb(db);

  const workout = await drizzleDb
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.workosId, workosId)))
    .get();

  if (!workout) {
    return false;
  }

  const result = await drizzleDb
    .delete(workoutExercises)
    .where(and(
      eq(workoutExercises.workoutId, workoutId),
      eq(workoutExercises.exerciseId, exerciseId)
    ))
    .run();

  return result.success;
}

export interface ExerciseOrder {
  exerciseId: string;
  orderIndex: number;
}

export async function reorderWorkoutExercises(
  dbOrTx: DbOrTx,
  workoutId: string,
  exerciseOrders: ExerciseOrder[],
  workosId: string
): Promise<boolean> {
  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

  const workout = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.workosId, workosId)))
    .get();

  if (!workout) {
    return false;
  }

  const updates = exerciseOrders.map(order =>
    db
      .update(workoutExercises)
      .set({ orderIndex: order.orderIndex })
      .where(and(
        eq(workoutExercises.workoutId, workoutId),
        eq(workoutExercises.exerciseId, order.exerciseId)
      ))
      .run()
  );

  await Promise.all(updates);

  return true;
}

export async function createWorkoutSet(
  db: D1Database,
  workoutExerciseId: string,
  workosId: string,
  setNumber: number,
  weight?: number,
  reps?: number,
  rpe?: number,
  localId?: string
): Promise<WorkoutSet | null> {
  const drizzleDb = createDb(db);

  const exerciseWithOwnership = await drizzleDb
    .select({
      exerciseId: workoutExercises.id,
    })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workoutExercises.id, workoutExerciseId),
      eq(workouts.workosId, workosId)
    ))
    .get();

  if (!exerciseWithOwnership) {
    return null;
  }

  const workoutSet = await drizzleDb
    .insert(workoutSets)
    .values({
      workoutExerciseId,
      setNumber,
      weight,
      reps,
      rpe,
      isComplete: false,
      localId,
    })
    .returning()
    .get();

  return workoutSet;
}

export async function updateWorkoutSet(
  db: D1Database,
  setId: string,
  workosId: string,
  data: Partial<NewWorkoutSet>
): Promise<WorkoutSet | null> {
  const drizzleDb = createDb(db);

  const setWithOwnership = await drizzleDb
    .select({
      setId: workoutSets.id,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workoutSets.id, setId),
      eq(workouts.workosId, workosId)
    ))
    .get();

  if (!setWithOwnership) {
    return null;
  }

  const updated = await drizzleDb
    .update(workoutSets)
    .set(data)
    .where(eq(workoutSets.id, setId))
    .returning()
    .get();

     
  return updated ?? null;
}

export async function completeWorkoutSet(
  db: D1Database,
  setId: string,
  workosId: string
): Promise<WorkoutSet | null> {
  return updateWorkoutSet(db, setId, workosId, {
    isComplete: true,
    completedAt: new Date().toISOString(),
  });
}

export async function deleteWorkoutSet(
  db: D1Database,
  setId: string,
  workosId: string
): Promise<boolean> {
  const drizzleDb = createDb(db);

  const setWithOwnership = await drizzleDb
    .select({
      setId: workoutSets.id,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workoutSets.id, setId),
      eq(workouts.workosId, workosId)
    ))
    .get();

  if (!setWithOwnership) {
    return false;
  }

  const result = await drizzleDb
    .delete(workoutSets)
    .where(eq(workoutSets.id, setId))
    .run();

  return result.success;
}

export async function getLastWorkoutForExercise(
  db: D1Database,
  workosId: string,
  exerciseId: string
): Promise<LastWorkoutData | null> {
  const drizzleDb = createDb(db);

  const recentSet = await drizzleDb
    .select({
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      rpe: workoutSets.rpe,
      completedAt: workoutSets.completedAt,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workouts.workosId, workosId),
      eq(workoutExercises.exerciseId, exerciseId),
      isNotNull(workoutSets.completedAt)
    ))
    .orderBy(desc(workoutSets.completedAt))
    .limit(1)
    .get();

  return recentSet ? {
    exerciseId,
    weight: recentSet.weight,
    reps: recentSet.reps,
    rpe: recentSet.rpe,
  } : null;
}

export interface LastWorkoutSetData {
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
}

export async function getLastWorkoutSetsForExercise(
  db: D1Database,
  workosId: string,
  exerciseId: string
): Promise<LastWorkoutSetData[]> {
  const drizzleDb = createDb(db);

  const recentWorkoutExercise = await drizzleDb
    .select({
      workoutExerciseId: workoutExercises.id,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workouts.workosId, workosId),
      eq(workoutExercises.exerciseId, exerciseId),
      isNotNull(workoutSets.completedAt)
    ))
    .orderBy(desc(workouts.completedAt))
    .limit(1)
    .get();

  if (!recentWorkoutExercise) {
    return [];
  }

  const sets = await drizzleDb
    .select({
      setNumber: workoutSets.setNumber,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      rpe: workoutSets.rpe,
    })
    .from(workoutSets)
    .where(eq(workoutSets.workoutExerciseId, recentWorkoutExercise.workoutExerciseId))
    .orderBy(workoutSets.setNumber)
    .all();

  return sets.map(set => ({
    setNumber: set.setNumber,
    weight: set.weight,
    reps: set.reps,
    rpe: set.rpe,
  }));
}

export async function getCompletedWorkoutsCount(
  db: D1Database,
  workosId: string
): Promise<number> {
  const drizzleDb = createDb(db);

  const result = await drizzleDb
    .select({ count: sql<number>`count(*)` })
    .from(workouts)
    .where(and(
      eq(workouts.workosId, workosId),
      isNotNull(workouts.completedAt)
    ))
    .get();

  return result?.count ?? 0;
}

export async function getTotalVolume(
  db: D1Database,
  workoutId: string,
  workosId: string
): Promise<number> {
  const drizzleDb = createDb(db);

  const workout = await drizzleDb
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.workosId, workosId)))
    .get();

  if (!workout) {
    return 0;
  }

  const sets = await drizzleDb
    .select({
      weight: workoutSets.weight,
      reps: workoutSets.reps,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, and(
      eq(workoutSets.workoutExerciseId, workoutExercises.id),
      eq(workoutExercises.workoutId, workoutId)
    ))
    .innerJoin(workouts, and(
      eq(workoutExercises.workoutId, workouts.id),
      eq(workouts.workosId, workosId)
    ))
    .where(eq(workoutSets.isComplete, true))
    .all();

  let totalVolume = 0;
  for (const set of sets) {
    if (set.weight !== null && set.reps !== null) {
      totalVolume += set.weight * set.reps;
    }
  }

  return totalVolume;
}

export interface WorkoutHistoryStats {
  totalWorkouts: number;
  thisWeek: number;
  thisMonth: number;
  totalVolume: number;
  totalSets: number;
}

export interface ExerciseHistoryItem {
  workoutId: string;
  workoutName: string;
  workoutDate: string;
  maxWeight: number;
  repsAtMax: number;
  est1rm: number;
  isPR: boolean;
}

export interface ExerciseHistoryStats {
  maxWeight: number;
  est1rm: number;
  totalWorkouts: number;
}

export interface GetExerciseHistoryOptions {
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Calculates estimated one-rep max using the Epley formula.
 * Used to normalize different rep ranges for PR tracking.
 * Formula: weight * (1 + reps/30)
 */
export function calculateE1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

/**
 * Retrieves exercise history with PR tracking and estimated 1RM calculations.
 * Aggregates workout sets to find max weight per workout, calculates E1RM for each,
 * and flags records that exceeded previous maximums. Results sorted by date.
 */
export async function getExerciseHistory(
  db: D1Database,
  workosId: string,
  exerciseId: string,
  options: GetExerciseHistoryOptions = {}
): Promise<ExerciseHistoryItem[]> {
  const drizzleDb = createDb(db);
  const { fromDate, toDate, limit, offset } = options;

  const conditions = [
    eq(workouts.workosId, workosId),
    isNotNull(workouts.completedAt),
    eq(workoutExercises.exerciseId, exerciseId),
  ];

  if (fromDate) {
    conditions.push(sql`${workouts.startedAt} >= ${fromDate}`);
  }

  if (toDate) {
    conditions.push(sql`${workouts.startedAt} <= ${toDate}`);
  }

  const workoutSetsData = await drizzleDb
    .select({
      workoutId: workouts.id,
      workoutName: workouts.name,
      workoutDate: workouts.startedAt,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
    })
    .from(workouts)
    .innerJoin(workoutExercises, eq(workouts.id, workoutExercises.workoutId))
    .innerJoin(workoutSets, eq(workoutExercises.id, workoutSets.workoutExerciseId))
    .where(and(...conditions))
    .orderBy(asc(workouts.startedAt))
    .all();

  const workoutMap = new Map<string, { maxWeight: number; repsAtMax: number }>();

  for (const set of workoutSetsData) {
    if (set.weight === null) continue;

    const existing = workoutMap.get(set.workoutId);
    if (!existing || set.weight > existing.maxWeight) {
      workoutMap.set(set.workoutId, {
        maxWeight: set.weight,
        repsAtMax: set.reps ?? 0,
      });
    }
  }

  const history: ExerciseHistoryItem[] = [];
  let currentMaxWeight = 0;

  for (const [workoutId, data] of workoutMap) {
    const est1rm = calculateE1RM(data.maxWeight, data.repsAtMax);
    const isPR = data.maxWeight > currentMaxWeight;
    if (data.maxWeight > currentMaxWeight) {
      currentMaxWeight = data.maxWeight;
    }

    const workoutDate = workoutSetsData.find(s => s.workoutId === workoutId)?.workoutDate ?? '';

    history.push({
      workoutId,
      workoutName: workoutSetsData.find(s => s.workoutId === workoutId)?.workoutName ?? '',
      workoutDate,
      maxWeight: data.maxWeight,
      repsAtMax: data.repsAtMax,
      est1rm,
      isPR,
    });
  }

  let sortedHistory = history.sort((a, b) =>
    new Date(b.workoutDate).getTime() - new Date(a.workoutDate).getTime()
  );

  if (offset !== undefined) {
    sortedHistory = sortedHistory.slice(offset);
  }

  if (limit !== undefined) {
    sortedHistory = sortedHistory.slice(0, limit);
  }

  return sortedHistory;
}

export async function getExerciseHistoryStats(
  db: D1Database,
  workosId: string,
  exerciseId: string
): Promise<ExerciseHistoryStats> {
  const history = await getExerciseHistory(db, workosId, exerciseId);

  let maxWeight = 0;
  let est1rm = 0;

  for (const item of history) {
    if (item.maxWeight > maxWeight) {
      maxWeight = item.maxWeight;
      est1rm = item.est1rm;
    }
  }

  return {
    maxWeight,
    est1rm,
    totalWorkouts: history.length,
  };
}

export async function getWorkoutHistoryStats(
  db: D1Database,
  workosId: string
): Promise<WorkoutHistoryStats> {
  const drizzleDb = createDb(db);

  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const weekStart = monday.toISOString();

  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  firstDay.setHours(0, 0, 0, 0);
  const monthStart = firstDay.toISOString();

  const [totalWorkouts, thisWeek, thisMonth, volumeResult, setsResult] = await Promise.all([
    drizzleDb
      .select({ count: sql<number>`count(*)` })
      .from(workouts)
      .where(and(
        eq(workouts.workosId, workosId),
        isNotNull(workouts.completedAt)
      ))
      .get(),
    drizzleDb
      .select({ count: sql<number>`count(*)` })
      .from(workouts)
      .where(and(
        eq(workouts.workosId, workosId),
        isNotNull(workouts.completedAt),
        sql`${workouts.startedAt} >= ${weekStart}`
      ))
      .get(),
    drizzleDb
      .select({ count: sql<number>`count(*)` })
      .from(workouts)
      .where(and(
        eq(workouts.workosId, workosId),
        isNotNull(workouts.completedAt),
        sql`${workouts.startedAt} >= ${monthStart}`
      ))
      .get(),
    drizzleDb
      .select({ total: sql<number>`COALESCE(SUM(${workoutSets.weight} * ${workoutSets.reps}), 0)` })
      .from(workoutSets)
      .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
      .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
      .where(and(
        eq(workouts.workosId, workosId),
        eq(workoutSets.isComplete, true)
      ))
      .get(),
    drizzleDb
      .select({ total: sql<number>`count(*)` })
      .from(workoutSets)
      .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
      .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
      .where(and(
        eq(workouts.workosId, workosId),
        eq(workoutSets.isComplete, true)
      ))
      .get(),
  ]);

  return {
    totalWorkouts: totalWorkouts?.count ?? 0,
    thisWeek: thisWeek?.count ?? 0,
    thisMonth: thisMonth?.count ?? 0,
    totalVolume: volumeResult?.total ?? 0,
    totalSets: setsResult?.total ?? 0,
  };
}

/**
 * Counts total personal records across all exercises for a user.
 * Tracks max weight per exercise per workout, then counts how many times
 * a new maximum was set. Used for gamification and progress metrics.
 */
export async function getPrCount(
  db: D1Database,
  workosId: string
): Promise<number> {
  const drizzleDb = createDb(db);
  const workoutMaxes = await drizzleDb
    .select({
      exerciseId: workoutExercises.exerciseId,
      workoutId: workouts.id,
      workoutStartedAt: workouts.startedAt,
      maxWeight: sql<number>`max(${workoutSets.weight})`.mapWith(Number),
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(eq(workouts.workosId, workosId), eq(workoutSets.isComplete, true), sql`${workoutSets.weight} > 0`))
    .groupBy(workoutExercises.exerciseId, workouts.id, workouts.startedAt)
    .orderBy(workouts.startedAt);

  let prCount = 0;
  const previousMaxByExercise: Record<string, number> = {};

  for (const workoutMax of workoutMaxes) {
    const prevMax = previousMaxByExercise[workoutMax.exerciseId] ?? 0;
    if (workoutMax.maxWeight > prevMax) {
      prCount++;
    }
    previousMaxByExercise[workoutMax.exerciseId] = workoutMax.maxWeight;
  }

  return prCount;
}

export interface WeeklyVolumeData {
  week: string;
  weekStart: string;
  volume: number;
}

export interface GetWeeklyVolumeOptions {
  fromDate?: string;
  toDate?: string;
  exerciseId?: string;
}

export async function getWeeklyVolume(
  db: D1Database,
  workosId: string,
  options: GetWeeklyVolumeOptions = {}
): Promise<WeeklyVolumeData[]> {
  const drizzleDb = createDb(db);
  const { fromDate, toDate, exerciseId } = options;

  const baseConditions = [
    eq(workouts.workosId, workosId),
    eq(workoutSets.isComplete, true),
    sql`${workoutSets.weight} > 0`,
    sql`${workoutSets.reps} > 0`,
  ];

  if (fromDate) {
    baseConditions.push(sql`${workouts.startedAt} >= ${fromDate}`);
  }

  if (toDate) {
    baseConditions.push(sql`${workouts.startedAt} <= ${toDate}`);
  }

  const allConditions = exerciseId
    ? [...baseConditions, eq(workoutExercises.exerciseId, exerciseId)]
    : baseConditions;

  const results = await drizzleDb
    .select({
      weekStart: sql<string>`date(${workouts.startedAt}, 'weekday 0', '-6 days')`.mapWith(String),
      volume: sql<number>`COALESCE(SUM(${workoutSets.weight} * ${workoutSets.reps}), 0)`.mapWith(Number),
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(...allConditions))
    .groupBy(sql`date(${workouts.startedAt}, 'weekday 0', '-6 days')`)
    .orderBy(sql`date(${workouts.startedAt}, 'weekday 0', '-6 days')`)
    .all();

  return results.map(r => ({
    week: `Week of ${r.weekStart}`,
    weekStart: r.weekStart,
    volume: r.volume,
  }));
}

export interface StrengthDataPoint {
  date: string;
  workoutId: string;
  weight: number;
  reps: number;
  est1rm: number;
}

export interface GetStrengthHistoryOptions {
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export async function getStrengthHistory(
  db: D1Database,
  workosId: string,
  exerciseId: string,
  options: GetStrengthHistoryOptions = {}
): Promise<StrengthDataPoint[]> {
  const drizzleDb = createDb(db);
  const { fromDate, toDate, limit = 50 } = options;

  const conditions = [
    eq(workouts.workosId, workosId),
    eq(workoutExercises.exerciseId, exerciseId),
    isNotNull(workouts.completedAt),
    sql`${workoutSets.weight} > 0`,
  ];

  if (fromDate) {
    conditions.push(sql`${workouts.startedAt} >= ${fromDate}`);
  }

  if (toDate) {
    conditions.push(sql`${workouts.startedAt} <= ${toDate}`);
  }

  const setsData = await drizzleDb
    .select({
      workoutId: workouts.id,
      workoutDate: workouts.startedAt,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
    })
    .from(workouts)
    .innerJoin(workoutExercises, eq(workouts.id, workoutExercises.workoutId))
    .innerJoin(workoutSets, eq(workoutExercises.id, workoutSets.workoutExerciseId))
    .where(and(...conditions))
    .orderBy(asc(workouts.startedAt))
    .limit(limit)
    .all();

  const workoutMaxMap = new Map<string, { maxWeight: number; repsAtMax: number; date: string }>();

  for (const set of setsData) {
    if (set.weight === null) continue;

    const existing = workoutMaxMap.get(set.workoutId);
    if (!existing || set.weight > existing.maxWeight) {
      workoutMaxMap.set(set.workoutId, {
        maxWeight: set.weight,
        repsAtMax: set.reps ?? 1,
        date: set.workoutDate,
      });
    }
  }

  const result: StrengthDataPoint[] = [];
  for (const [workoutId, data] of workoutMaxMap) {
    result.push({
      date: data.date.split('T')[0],
      workoutId,
      weight: data.maxWeight,
      reps: data.repsAtMax,
      est1rm: calculateE1RM(data.maxWeight, data.repsAtMax),
    });
  }

  return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  date: string;
  weight: number;
  reps: number;
  est1rm: number;
  previousRecord?: number;
}

export async function getRecentPRs(
  db: D1Database,
  workosId: string,
  limit = 5
): Promise<PersonalRecord[]> {
  const drizzleDb = createDb(db);

  const workoutMaxes = await drizzleDb
    .select({
      exerciseId: workoutExercises.exerciseId,
      exerciseName: exercises.name,
      workoutId: workouts.id,
      workoutDate: workouts.startedAt,
      maxWeight: sql<number>`max(${workoutSets.weight})`.mapWith(Number),
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workouts.workosId, workosId),
      eq(workoutSets.isComplete, true),
      sql`${workoutSets.weight} > 0`
    ))
    .groupBy(workoutExercises.exerciseId, workouts.id, workouts.startedAt, exercises.name)
    .orderBy(desc(workouts.startedAt))
    .limit(limit)
    .all();

  if (workoutMaxes.length === 0) {
    return [];
  }

  const workoutExerciseIds: string[] = [];

  const workoutIdToData = new Map<string, { exerciseId: string; exerciseName: string; workoutDate: string; maxWeight: number }>();

  for (const wm of workoutMaxes) {
    workoutIdToData.set(wm.workoutId, {
      exerciseId: wm.exerciseId,
      exerciseName: wm.exerciseName,
      workoutDate: wm.workoutDate,
      maxWeight: wm.maxWeight,
    });
    workoutExerciseIds.push(wm.workoutId);
  }

  const setsWithMaxWeight = await drizzleDb
    .select({
      workoutExerciseId: workoutExercises.id,
      workoutId: workouts.id,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workouts.workosId, workosId),
      eq(workoutSets.isComplete, true),
      inArray(workouts.id, workoutExerciseIds)
    ))
    .all();

  const repsAtMaxMap = new Map<string, number>();

  for (const set of setsWithMaxWeight) {
    if (set.weight === null) continue;

    const data = workoutIdToData.get(set.workoutId);
    if (!data) continue;

    if (set.weight === data.maxWeight) {
      const key = set.workoutId;
      const currentReps = repsAtMaxMap.get(key) ?? 0;
      if (set.reps !== null && set.reps > currentReps) {
        repsAtMaxMap.set(key, set.reps);
      }
    }
  }

  const prs: PersonalRecord[] = [];
  const previousMaxByExercise: Record<string, number> = {};

  for (const workoutMax of workoutMaxes) {
    const prevMax = previousMaxByExercise[workoutMax.exerciseId] ?? 0;
    const isPR = workoutMax.maxWeight > prevMax;
    const repsAtMax = repsAtMaxMap.get(workoutMax.workoutId) ?? 1;

    if (isPR) {
      prs.push({
        id: `${workoutMax.workoutId}-${workoutMax.exerciseId}`,
        exerciseId: workoutMax.exerciseId,
        exerciseName: workoutMax.exerciseName,
        date: workoutMax.workoutDate.split('T')[0],
        weight: workoutMax.maxWeight,
        reps: repsAtMax,
        est1rm: calculateE1RM(workoutMax.maxWeight, repsAtMax),
        previousRecord: prevMax > 0 ? prevMax : undefined,
      });
      previousMaxByExercise[workoutMax.exerciseId] = workoutMax.maxWeight;
    }

    previousMaxByExercise[workoutMax.exerciseId] = workoutMax.maxWeight;
  }

  return prs.slice(0, limit);
}

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import {
  type NewWorkout,
  type NewWorkoutExercise,
  type NewWorkoutSet,
  type Workout,
  type WorkoutExercise,
  type WorkoutSet,
  exercises,
  workoutExercises,
  workoutSets,
  workouts,
} from './schema';
import { createDb } from './index';

export type { Workout, NewWorkout, WorkoutExercise, NewWorkoutExercise, WorkoutSet, NewWorkoutSet };

export interface CreateWorkoutData {
  name: string;
  templateId?: string;
  notes?: string;
}

export interface UpdateWorkoutData {
  name?: string;
  notes?: string;
  completedAt?: string;
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

export interface WorkoutExerciseWithDetails extends WorkoutExercise {
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
  db: D1Database,
  data: CreateWorkoutData & { userId: string }
): Promise<Workout> {
  const drizzleDb = createDb(db);

  const workout = await drizzleDb
    .insert(workouts)
    .values({
      userId: data.userId,
      name: data.name,
      templateId: data.templateId,
      notes: data.notes,
      startedAt: new Date().toISOString(),
    })
    .returning()
    .get();

  return workout;
}

export async function getWorkoutById(
  db: D1Database,
  workoutId: string,
  userId: string
): Promise<Workout | null> {
  const drizzleDb = createDb(db);

  const workout = await drizzleDb
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .get();

  return workout ?? null;
}

export async function getWorkoutWithExercises(
  db: D1Database,
  workoutId: string,
  userId: string
): Promise<WorkoutWithExercises | null> {
  const drizzleDb = createDb(db);

  const workout = await drizzleDb
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .get();

  if (!workout) {
    return null;
  }

  const exercisesWithSets = await drizzleDb
    .select({
      id: workoutExercises.id,
      workoutId: workoutExercises.workoutId,
      exerciseId: workoutExercises.exerciseId,
      orderIndex: workoutExercises.orderIndex,
      notes: workoutExercises.notes,
      exercise: {
        id: exercises.id,
        name: exercises.name,
        muscleGroup: exercises.muscleGroup,
      },
      sets: {
        id: workoutSets.id,
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
        workoutId: row.workoutId,
        exerciseId: row.exerciseId,
        orderIndex: row.orderIndex,
        notes: row.notes,
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

export async function getWorkoutsByUserId(
  db: D1Database,
  userId: string,
  options: GetWorkoutsOptions = {}
): Promise<Workout[]> {
  const drizzleDb = createDb(db);

  const { sortBy = 'startedAt', sortOrder = 'DESC', limit, offset, fromDate, toDate, exerciseId } = options;

  const conditions = [
    eq(workouts.userId, userId),
    isNotNull(workouts.completedAt),
  ];

  if (fromDate) {
    conditions.push(sql`${workouts.startedAt} >= ${fromDate}`);
  }

  if (toDate) {
    conditions.push(sql`${workouts.startedAt} <= ${toDate}`);
  }

  if (exerciseId) {
    conditions.push(inArray(workouts.id, drizzleDb.select({ value: workoutExercises.workoutId }).from(workoutExercises).where(eq(workoutExercises.exerciseId, exerciseId))));
  }

  let query = drizzleDb
    .select()
    .from(workouts)
    .where(and(...conditions));

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

  return results as Workout[];
}

export async function updateWorkout(
  db: D1Database,
  workoutId: string,
  userId: string,
  data: UpdateWorkoutData
): Promise<Workout | null> {
  const drizzleDb = createDb(db);

  const updated = await drizzleDb
    .update(workouts)
    .set(data)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .returning()
    .get();

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return updated ?? null;
}

export async function completeWorkout(
  db: D1Database,
  workoutId: string,
  userId: string
): Promise<Workout | null> {
  return updateWorkout(db, workoutId, userId, {
    completedAt: new Date().toISOString(),
  });
}

export async function deleteWorkout(
  db: D1Database,
  workoutId: string,
  userId: string
): Promise<boolean> {
  const drizzleDb = createDb(db);

  const result = await drizzleDb
    .delete(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .run();

  return result.success;
}

export async function createWorkoutExercise(
  db: D1Database,
  workoutId: string,
  userId: string,
  exerciseId: string,
  orderIndex: number,
  notes?: string
): Promise<WorkoutExercise | null> {
  const drizzleDb = createDb(db);

  const workout = await drizzleDb
    .select({ id: workouts.id })
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .get();

  if (!workout) {
    console.log('createWorkoutExercise: Workout not found or does not belong to user');
    return null;
  }

  const workoutExercise = await drizzleDb
    .insert(workoutExercises)
    .values({
      workoutId,
      exerciseId,
      orderIndex,
      notes,
    })
    .returning()
    .get();

  return workoutExercise;
}

export async function getWorkoutExercises(
  db: D1Database,
  workoutId: string,
  userId: string
): Promise<WorkoutExerciseWithDetails[]> {
  const drizzleDb = createDb(db);

  const results = await drizzleDb
    .select({
      id: workoutExercises.id,
      workoutId: workoutExercises.workoutId,
      exerciseId: workoutExercises.exerciseId,
      orderIndex: workoutExercises.orderIndex,
      notes: workoutExercises.notes,
      exercise: {
        id: exercises.id,
        name: exercises.name,
        muscleGroup: exercises.muscleGroup,
      },
      sets: {
        id: workoutSets.id,
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
      eq(exercises.userId, userId),
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
        workoutId: row.workoutId,
        exerciseId: row.exerciseId,
        orderIndex: row.orderIndex,
        notes: row.notes,
        exercise: row.exercise,
        sets: setData?.id ? [setData] : [],
      });
    }
  }

  return Array.from(exerciseMap.values());
}

export async function removeWorkoutExercise(
  db: D1Database,
  workoutId: string,
  exerciseId: string,
  userId: string
): Promise<boolean> {
  const drizzleDb = createDb(db);

  const workout = await drizzleDb
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
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
  db: D1Database,
  workoutId: string,
  exerciseOrders: ExerciseOrder[],
  userId: string
): Promise<boolean> {
  const drizzleDb = createDb(db);

  const workout = await drizzleDb
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .get();

  if (!workout) {
    return false;
  }

  for (const order of exerciseOrders) {
    await drizzleDb
      .update(workoutExercises)
      .set({ orderIndex: order.orderIndex })
      .where(and(
        eq(workoutExercises.workoutId, workoutId),
        eq(workoutExercises.exerciseId, order.exerciseId)
      ))
      .run();
  }

  return true;
}

export async function createWorkoutSet(
  db: D1Database,
  workoutExerciseId: string,
  userId: string,
  setNumber: number,
  weight?: number,
  reps?: number,
  rpe?: number
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
      eq(workouts.userId, userId)
    ))
    .get();

  if (!exerciseWithOwnership) {
    console.log('createWorkoutSet: Workout exercise not found or does not belong to user');
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
    })
    .returning()
    .get();

  return workoutSet;
}

export async function updateWorkoutSet(
  db: D1Database,
  setId: string,
  userId: string,
  data: Partial<NewWorkoutSet>
): Promise<WorkoutSet | null> {
  const drizzleDb = createDb(db);

  console.log('updateWorkoutSet:', { setId, userId, data });

  const setWithOwnership = await drizzleDb
    .select({
      setId: workoutSets.id,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workoutSets.id, setId),
      eq(workouts.userId, userId)
    ))
    .get();

  if (!setWithOwnership) {
    console.log('updateWorkoutSet: Set not found or does not belong to user');
    return null;
  }

  const updated = await drizzleDb
    .update(workoutSets)
    .set(data)
    .where(eq(workoutSets.id, setId))
    .returning()
    .get();

  console.log('updateWorkoutSet result:', updated);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return updated ?? null;
}

export async function completeWorkoutSet(
  db: D1Database,
  setId: string,
  userId: string
): Promise<WorkoutSet | null> {
  return updateWorkoutSet(db, setId, userId, {
    isComplete: true,
    completedAt: new Date().toISOString(),
  });
}

export async function deleteWorkoutSet(
  db: D1Database,
  setId: string,
  userId: string
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
      eq(workouts.userId, userId)
    ))
    .get();

  if (!setWithOwnership) {
    console.log('deleteWorkoutSet: Set not found or does not belong to user');
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
  userId: string,
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
      eq(workouts.userId, userId),
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
  userId: string,
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
      eq(workouts.userId, userId),
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
  userId: string
): Promise<number> {
  const drizzleDb = createDb(db);

  const result = await drizzleDb
    .select({ count: sql<number>`count(*)` })
    .from(workouts)
    .where(and(
      eq(workouts.userId, userId),
      isNotNull(workouts.completedAt)
    ))
    .get();

  return result?.count ?? 0;
}

export async function getTotalVolume(
  db: D1Database,
  workoutId: string,
  userId: string
): Promise<number> {
  const drizzleDb = createDb(db);

  const workout = await drizzleDb
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
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
      eq(workouts.userId, userId)
    ))
    .where(eq(workoutSets.isComplete, true))
    .all();

  let totalVolume = 0;
  for (const set of sets) {
    if (set.weight && set.reps) {
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

export function calculateE1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export async function getExerciseHistory(
  db: D1Database,
  userId: string,
  exerciseId: string,
  options: GetExerciseHistoryOptions = {}
): Promise<ExerciseHistoryItem[]> {
  const drizzleDb = createDb(db);
  const { fromDate, toDate, limit, offset } = options;

  const conditions = [
    eq(workouts.userId, userId),
    isNotNull(workouts.completedAt),
    eq(workoutExercises.exerciseId, exerciseId),
  ];

  if (fromDate) {
    conditions.push(sql`${workouts.startedAt} >= ${fromDate}`);
  }

  if (toDate) {
    conditions.push(sql`${workouts.startedAt} <= ${toDate}`);
  }

  console.log('[getExerciseHistory] Querying with:', { userId, exerciseId, fromDate, toDate, limit, offset });

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

  console.log('[getExerciseHistory] Raw sets data count:', workoutSetsData.length);

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

  console.log('[getExerciseHistory] Unique workouts with sets:', workoutMap.size);

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

  console.log('[getExerciseHistory] Final history count:', sortedHistory.length);

  return sortedHistory;
}

export async function getExerciseHistoryStats(
  db: D1Database,
  userId: string,
  exerciseId: string
): Promise<ExerciseHistoryStats> {
  const history = await getExerciseHistory(db, userId, exerciseId);

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
  userId: string
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
        eq(workouts.userId, userId),
        isNotNull(workouts.completedAt)
      ))
      .get(),
    drizzleDb
      .select({ count: sql<number>`count(*)` })
      .from(workouts)
      .where(and(
        eq(workouts.userId, userId),
        isNotNull(workouts.completedAt),
        sql`${workouts.startedAt} >= ${weekStart}`
      ))
      .get(),
    drizzleDb
      .select({ count: sql<number>`count(*)` })
      .from(workouts)
      .where(and(
        eq(workouts.userId, userId),
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
        eq(workouts.userId, userId),
        eq(workoutSets.isComplete, true)
      ))
      .get(),
    drizzleDb
      .select({ total: sql<number>`count(*)` })
      .from(workoutSets)
      .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
      .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
      .where(and(
        eq(workouts.userId, userId),
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

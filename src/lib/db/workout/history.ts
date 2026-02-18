import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import {
  exercises,
  workoutExercises,
  workoutSets,
  workouts,
} from '../schema';
import { getDb } from '../index';
import type {
  DbOrTx,
  GetExerciseHistoryOptions,
  ExerciseHistoryItem,
  ExerciseHistoryStats,
  WorkoutHistoryStats,
} from './types';
import { calculateE1RM } from '~/lib/domain/stats/calculations';

/**
 * Retrieves the exercise history for a user
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @param exerciseId - The exercise ID
 * @param options - Optional date range and pagination
 * @returns Array of exercise history items with max weight, reps, and estimated 1RM
 */
export async function getExerciseHistory(
  dbOrTx: DbOrTx,
  workosId: string,
  exerciseId: string,
  options: GetExerciseHistoryOptions = {}
): Promise<ExerciseHistoryItem[]> {
  const db = getDb(dbOrTx);
  const { fromDate, toDate, limit = 100, offset } = options;

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

  const workoutIdsQuery = db
    .select({ id: workouts.id })
    .from(workouts)
    .innerJoin(workoutExercises, eq(workouts.id, workoutExercises.workoutId))
    .where(and(...conditions))
    .orderBy(asc(workouts.startedAt))
    .limit(limit)
    .offset(offset ?? 0)
    .all();

  const workoutIds = (await workoutIdsQuery).map(w => w.id);

  if (workoutIds.length === 0) return [];

  const workoutSetsData = await db
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
    .where(and(
      ...conditions,
      inArray(workouts.id, workoutIds)
    ))
    .orderBy(asc(workouts.startedAt))
    .all();

  const workoutMap = new Map<string, { maxWeight: number; repsAtMax: number }>();
  const workoutInfoMap = new Map<string, { name: string; date: string }>();

  for (const set of workoutSetsData) {
    if (set.weight === null) continue;

    const existing = workoutMap.get(set.workoutId);
    if (!existing || set.weight > existing.maxWeight) {
      workoutMap.set(set.workoutId, {
        maxWeight: set.weight,
        repsAtMax: set.reps ?? 0,
      });
    }

    if (!workoutInfoMap.has(set.workoutId)) {
      workoutInfoMap.set(set.workoutId, {
        name: set.workoutName ?? '',
        date: set.workoutDate ?? '',
      });
    }
  }

  const history: ExerciseHistoryItem[] = [];
  let currentMaxWeight = 0;

  for (const [workoutId, data] of workoutMap) {
    const workoutInfo = workoutInfoMap.get(workoutId);
    const workoutDate = workoutInfo?.date ?? '';

    const est1rm = calculateE1RM(data.maxWeight, data.repsAtMax);
    const isPR = data.maxWeight > currentMaxWeight;
    if (data.maxWeight > currentMaxWeight) {
      currentMaxWeight = data.maxWeight;
    }

    history.push({
      workoutId,
      workoutName: workoutInfo?.name ?? '',
      workoutDate,
      maxWeight: data.maxWeight,
      repsAtMax: data.repsAtMax,
      est1rm,
      isPR,
    });
  }

  return history.sort((a, b) =>
    new Date(b.workoutDate).getTime() - new Date(a.workoutDate).getTime()
  );
}

/**
 * Calculates statistics for an exercise based on its history
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @param exerciseId - The exercise ID
 * @returns Object with maxWeight, est1rm, and totalWorkouts
 */
export async function getExerciseHistoryStats(
  dbOrTx: DbOrTx,
  workosId: string,
  exerciseId: string
): Promise<ExerciseHistoryStats> {
  const history = await getExerciseHistory(dbOrTx, workosId, exerciseId);

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

/**
 * Calculates overall workout statistics for a user
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @returns Object with totalWorkouts, thisWeek, thisMonth, totalVolume, and totalSets
 */
export async function getWorkoutHistoryStats(
  dbOrTx: DbOrTx,
  workosId: string
): Promise<WorkoutHistoryStats> {
  const db = getDb(dbOrTx);

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
    db
      .select({ count: sql<number>`count(*)` })
      .from(workouts)
      .where(and(
        eq(workouts.workosId, workosId),
        isNotNull(workouts.completedAt)
      ))
      .get(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(workouts)
      .where(and(
        eq(workouts.workosId, workosId),
        isNotNull(workouts.completedAt),
        sql`${workouts.startedAt} >= ${weekStart}`
      ))
      .get(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(workouts)
      .where(and(
        eq(workouts.workosId, workosId),
        isNotNull(workouts.completedAt),
        sql`${workouts.startedAt} >= ${monthStart}`
      ))
      .get(),
    db
      .select({ total: sql<number>`COALESCE(SUM(${workoutSets.weight} * ${workoutSets.reps}), 0)` })
      .from(workoutSets)
      .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
      .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
      .where(and(
        eq(workouts.workosId, workosId),
        eq(workoutSets.isComplete, true)
      ))
      .get(),
    db
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
 * Retrieves the most recent personal records for a user
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @param options - Optional parameters including limit and date range
 * @returns Array of recent personal records with exercise details
 */
export async function getRecentPRs(
  dbOrTx: DbOrTx,
  workosId: string,
  options: { limit?: number; fromDate?: string; toDate?: string } = {}
) {
  const db = getDb(dbOrTx);
  const { limit = 5, fromDate, toDate } = options;

  const conditions = [
    eq(workouts.workosId, workosId),
    eq(workoutSets.isComplete, true),
    sql`${workoutSets.weight} > 0`,
  ];

  if (fromDate) {
    conditions.push(sql`${workouts.startedAt} >= ${fromDate}`);
  }

  if (toDate) {
    conditions.push(sql`${workouts.startedAt} <= ${toDate}`);
  }

  const workoutMaxes = await db
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
    .where(and(...conditions))
    .groupBy(workoutExercises.exerciseId, workouts.id, workouts.startedAt, exercises.name)
    .orderBy(asc(workouts.startedAt))
    .all();

  const exerciseCategories: Record<string, { id: string; name: string; isMatch: (n: string) => boolean }> = {};

  for (const wm of workoutMaxes) {
    const { isSquat, isBench, isDeadlift, isOverheadPress } = await import('~/lib/db/exercise/categories');
    if (isSquat(wm.exerciseName) && !exerciseCategories.squat) {
      exerciseCategories.squat = { id: wm.exerciseId, name: wm.exerciseName, isMatch: isSquat };
    }
    if (isBench(wm.exerciseName) && !exerciseCategories.bench) {
      exerciseCategories.bench = { id: wm.exerciseId, name: wm.exerciseName, isMatch: isBench };
    }
    if (isDeadlift(wm.exerciseName) && !exerciseCategories.deadlift) {
      exerciseCategories.deadlift = { id: wm.exerciseId, name: wm.exerciseName, isMatch: isDeadlift };
    }
    if (isOverheadPress(wm.exerciseName) && !exerciseCategories.ohp) {
      exerciseCategories.ohp = { id: wm.exerciseId, name: wm.exerciseName, isMatch: isOverheadPress };
    }
  }

  const oneRmConditions = [
    eq(workouts.workosId, workosId),
    sql`(${workouts.squat1rm} IS NOT NULL OR ${workouts.bench1rm} IS NOT NULL OR ${workouts.deadlift1rm} IS NOT NULL OR ${workouts.ohp1rm} IS NOT NULL)`,
  ];

  if (fromDate) {
    oneRmConditions.push(sql`${workouts.startedAt} >= ${fromDate}`);
  }

  if (toDate) {
    oneRmConditions.push(sql`${workouts.startedAt} <= ${toDate}`);
  }

  const oneRmWorkouts = await db
    .select({
      workoutId: workouts.id,
      workoutDate: workouts.startedAt,
      squat1rm: workouts.squat1rm,
      bench1rm: workouts.bench1rm,
      deadlift1rm: workouts.deadlift1rm,
      ohp1rm: workouts.ohp1rm,
    })
    .from(workouts)
    .where(and(...oneRmConditions))
    .orderBy(asc(workouts.startedAt))
    .all();

  const oneRmMaxes: Array<{ exerciseId: string; exerciseName: string; workoutId: string; workoutDate: string; maxWeight: number; reps: number }> = [];

  for (const ow of oneRmWorkouts) {
    if (ow.squat1rm && exerciseCategories.squat) {
      oneRmMaxes.push({
        exerciseId: exerciseCategories.squat.id,
        exerciseName: exerciseCategories.squat.name,
        workoutId: ow.workoutId,
        workoutDate: ow.workoutDate,
        maxWeight: ow.squat1rm,
        reps: 1,
      });
    }
    if (ow.bench1rm && exerciseCategories.bench) {
      oneRmMaxes.push({
        exerciseId: exerciseCategories.bench.id,
        exerciseName: exerciseCategories.bench.name,
        workoutId: ow.workoutId,
        workoutDate: ow.workoutDate,
        maxWeight: ow.bench1rm,
        reps: 1,
      });
    }
    if (ow.deadlift1rm && exerciseCategories.deadlift) {
      oneRmMaxes.push({
        exerciseId: exerciseCategories.deadlift.id,
        exerciseName: exerciseCategories.deadlift.name,
        workoutId: ow.workoutId,
        workoutDate: ow.workoutDate,
        maxWeight: ow.deadlift1rm,
        reps: 1,
      });
    }
    if (ow.ohp1rm && exerciseCategories.ohp) {
      oneRmMaxes.push({
        exerciseId: exerciseCategories.ohp.id,
        exerciseName: exerciseCategories.ohp.name,
        workoutId: ow.workoutId,
        workoutDate: ow.workoutDate,
        maxWeight: ow.ohp1rm,
        reps: 1,
      });
    }
  }

  const workoutMaxesWithReps = workoutMaxes.map(wm => ({
    ...wm,
    reps: 1,
  }));

  const allWorkoutMaxes = [...workoutMaxesWithReps, ...oneRmMaxes].sort(
    (a, b) => new Date(a.workoutDate).getTime() - new Date(b.workoutDate).getTime()
  );

  if (allWorkoutMaxes.length === 0) {
    return [];
  }

  const workoutIds = [...new Set(allWorkoutMaxes.map(wm => wm.workoutId))];

  const setsWithMaxWeight = await db
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
      inArray(workouts.id, workoutIds)
    ))
    .all();

  const repsAtMaxMap = new Map<string, number>();

  for (const set of setsWithMaxWeight) {
    if (set.weight === null) continue;

    const data = allWorkoutMaxes.find(wm => wm.workoutId === set.workoutId && wm.maxWeight === set.weight);
    if (data) {
      const key = set.workoutId;
      const currentReps = repsAtMaxMap.get(key) ?? 0;
      if (set.reps !== null && set.reps > currentReps) {
        repsAtMaxMap.set(key, set.reps);
      }
    }
  }

  const prs = [];
  const previousMaxByExercise: Record<string, number> = {};

  for (const workoutMax of allWorkoutMaxes) {
    const prevMax = previousMaxByExercise[workoutMax.exerciseId] ?? 0;
    const isPR = workoutMax.maxWeight > prevMax;
    const repsAtMax = repsAtMaxMap.get(workoutMax.workoutId) ?? workoutMax.reps;

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
    }

    previousMaxByExercise[workoutMax.exerciseId] = workoutMax.maxWeight;
  }

  return prs
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

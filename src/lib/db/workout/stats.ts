import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm';
import {
  exercises,
  workoutExercises,
  workoutSets,
  workouts,
} from '../schema';
import { getDb } from '../index';
import type {
  DbOrTx,
  GetWeeklyVolumeOptions,
  WeeklyVolumeData,
  GetStrengthHistoryOptions,
  StrengthDataPoint,
  PersonalRecord,
} from './types';
import { calculateE1RM } from '~/lib/domain/stats/calculations';
import { isSquat, isBench, isDeadlift, isOverheadPress } from '~/lib/db/exercise/categories';

/**
 * Counts the total number of completed workouts for a user
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @returns The count of completed workouts
 */
export async function getCompletedWorkoutsCount(
  dbOrTx: DbOrTx,
  workosId: string
): Promise<number> {
  const db = getDb(dbOrTx);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(workouts)
    .where(and(
      eq(workouts.workosId, workosId),
      isNotNull(workouts.completedAt)
    ))
    .get();

  return result?.count ?? 0;
}

/**
 * Calculates the total volume (weight x reps) for a completed workout
 * @param db - D1 database instance
 * @param workoutId - The workout ID
 * @param workosId - The user's WorkOS ID for ownership validation
 * @returns The total volume as a number
 */
export async function getTotalVolume(
  dbOrTx: DbOrTx,
  workoutId: string,
  workosId: string
): Promise<number> {
  const db = getDb(dbOrTx);

  const workout = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.workosId, workosId)))
    .get();

  if (!workout) {
    return 0;
  }

  const sets = await db
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

export async function getPrCount(
  dbOrTx: DbOrTx,
  workosId: string
): Promise<number> {
  const db = getDb(dbOrTx);
  const workoutMaxes = await db
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

/**
 * Retrieves weekly volume data for charts and analytics
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @param options - Optional date range and exercise filter
 * @returns Array of weekly volume data with week labels and totals
 */
export async function getWeeklyVolume(
  dbOrTx: DbOrTx,
  workosId: string,
  options: GetWeeklyVolumeOptions = {}
): Promise<WeeklyVolumeData[]> {
  const db = getDb(dbOrTx);
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

  const results = await db
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

/**
 * Retrieves strength progression data for an exercise over time
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @param exerciseId - The exercise ID
 * @param options - Optional date range and limit
 * @returns Array of data points with date, weight, reps, and estimated 1RM
 */
export async function getStrengthHistory(
  dbOrTx: DbOrTx,
  workosId: string,
  exerciseId: string,
  options: GetStrengthHistoryOptions = {}
): Promise<StrengthDataPoint[]> {
  const db = getDb(dbOrTx);
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

  const setsData = await db
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

export async function getAllTimeBestPRs(
  dbOrTx: DbOrTx,
  workosId: string,
  options: { limit?: number } = {}
): Promise<PersonalRecord[]> {
  const db = getDb(dbOrTx);
  const { limit = 20 } = options;

  const allSets = await db
    .select({
      exerciseId: workoutExercises.exerciseId,
      exerciseName: exercises.name,
      workoutId: workouts.id,
      workoutDate: workouts.startedAt,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workouts.workosId, workosId),
      eq(workoutSets.isComplete, true),
      sql`${workoutSets.weight} > 0`,
    ))
    .orderBy(
      asc(workoutExercises.exerciseId),
      desc(workoutSets.weight),
      desc(workoutSets.reps),
      desc(workouts.startedAt)
    )
    .all();

  const bestByExercise = new Map<string, {
    exerciseId: string;
    exerciseName: string;
    date: string;
    weight: number;
    reps: number;
  }>();

  for (const set of allSets) {
    if (!bestByExercise.has(set.exerciseId) && set.weight !== null && set.reps !== null) {
      bestByExercise.set(set.exerciseId, {
        exerciseId: set.exerciseId,
        exerciseName: set.exerciseName,
        date: set.workoutDate?.split('T')[0] ?? '',
        weight: set.weight,
        reps: set.reps,
      });
    }
  }

  const results: PersonalRecord[] = Array.from(bestByExercise.values()).map(best => ({
    id: `best-${best.exerciseId}`,
    exerciseId: best.exerciseId,
    exerciseName: best.exerciseName,
    date: best.date,
    weight: best.weight,
    reps: best.reps,
    est1rm: calculateE1RM(best.weight, best.reps),
  }));

  const exerciseCategories: Record<string, { id: string; name: string }> = {};
  for (const r of results) {
    if (isSquat(r.exerciseName) && !exerciseCategories.squat) {
      exerciseCategories.squat = { id: r.exerciseId, name: r.exerciseName };
    }
    if (isBench(r.exerciseName) && !exerciseCategories.bench) {
      exerciseCategories.bench = { id: r.exerciseId, name: r.exerciseName };
    }
    if (isDeadlift(r.exerciseName) && !exerciseCategories.deadlift) {
      exerciseCategories.deadlift = { id: r.exerciseId, name: r.exerciseName };
    }
    if (isOverheadPress(r.exerciseName) && !exerciseCategories.ohp) {
      exerciseCategories.ohp = { id: r.exerciseId, name: r.exerciseName };
    }
  }

  const oneRmMaxes = await db
    .select({
      maxSquat: sql<number>`max(${workouts.squat1rm})`.mapWith(Number),
      maxBench: sql<number>`max(${workouts.bench1rm})`.mapWith(Number),
      maxDeadlift: sql<number>`max(${workouts.deadlift1rm})`.mapWith(Number),
      maxOhp: sql<number>`max(${workouts.ohp1rm})`.mapWith(Number),
    })
    .from(workouts)
    .where(and(
      eq(workouts.workosId, workosId),
      sql`(${workouts.squat1rm} IS NOT NULL OR ${workouts.bench1rm} IS NOT NULL OR ${workouts.deadlift1rm} IS NOT NULL OR ${workouts.ohp1rm} IS NOT NULL)`,
    ))
    .all();

  const oneRmData = oneRmMaxes[0];
  if (oneRmData) {
    const categoryMap: Array<{
      category: string;
      value: number | null;
      column: typeof workouts.squat1rm;
    }> = [
      { category: 'squat', value: oneRmData.maxSquat, column: workouts.squat1rm },
      { category: 'bench', value: oneRmData.maxBench, column: workouts.bench1rm },
      { category: 'deadlift', value: oneRmData.maxDeadlift, column: workouts.deadlift1rm },
      { category: 'ohp', value: oneRmData.maxOhp, column: workouts.ohp1rm },
    ];

    for (const { category, value, column } of categoryMap) {
      if (!value || !exerciseCategories[category]) continue;

      const cat = exerciseCategories[category];
      const existing = results.find(r => r.exerciseId === cat.id);

      if (existing && value > existing.weight) {
        const dateRow = await db
          .select({ workoutDate: workouts.startedAt })
          .from(workouts)
          .where(and(
            eq(workouts.workosId, workosId),
            eq(column, value),
          ))
          .orderBy(desc(workouts.startedAt))
          .limit(1)
          .all();

        existing.weight = value;
        existing.reps = 1;
        existing.est1rm = value;
        existing.date = dateRow[0]?.workoutDate?.split('T')[0] ?? existing.date;
      } else if (!existing) {
        const dateRow = await db
          .select({ workoutDate: workouts.startedAt })
          .from(workouts)
          .where(and(
            eq(workouts.workosId, workosId),
            eq(column, value),
          ))
          .orderBy(desc(workouts.startedAt))
          .limit(1)
          .all();

        results.push({
          id: `best-1rm-${category}`,
          exerciseId: cat.id,
          exerciseName: cat.name,
          date: dateRow[0]?.workoutDate?.split('T')[0] ?? '',
          weight: value,
          reps: 1,
          est1rm: value,
        });
      }
    }
  }

  return results
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}

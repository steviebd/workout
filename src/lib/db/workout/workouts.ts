import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm';
import {
  exercises,
  userProgramCycles,
  workoutExercises,
  workoutSets,
  workouts,
} from '../schema';
import { getDb, calculateChunkSize } from '../index';
import type {
  DbOrTx,
  CreateWorkoutData,
  GetWorkoutsOptions,
  WorkoutWithExercises,
  WorkoutExerciseWithDetails,
  WorkoutWithExerciseCount,
  Workout,
  WorkoutSet,
  NewWorkoutSet,
  NewWorkoutExercise,
} from './types';

/**
 * Creates a new workout for a user
 * @param dbOrTx - D1 database instance or transaction
 * @param data - Workout creation data including workosId
 * @param startedAt - Optional start timestamp
 * @returns The newly created workout
 */
export async function createWorkout(
  dbOrTx: DbOrTx,
  data: CreateWorkoutData & { workosId: string },
  startedAt?: string
): Promise<Workout> {
  const db = getDb(dbOrTx);

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

/**
 * Retrieves a workout by ID with ownership validation
 * @param db - D1 database instance
 * @param workoutId - The workout ID
 * @param workosId - The user's WorkOS ID for ownership validation
 * @returns The workout if found, or null
 */
export async function getWorkoutById(
  dbOrTx: DbOrTx,
  workoutId: string,
  workosId: string
): Promise<Workout | null> {
  const db = getDb(dbOrTx);

  const workout = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.workosId, workosId)))
    .get();

  return workout ?? null;
}

export async function getWorkoutWithExercises(
  dbOrTx: DbOrTx,
  workoutId: string,
  workosId: string
): Promise<WorkoutWithExercises | null> {
  const db = getDb(dbOrTx);

  const workout = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.workosId, workosId)))
    .get();

  if (!workout) {
    return null;
  }

  const exercisesWithSets = await db
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

/**
 * Retrieves all completed workouts for a user with optional filtering
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @param options - Optional filters and pagination
 * @returns Array of workouts with exercise counts and statistics
 */
export async function getWorkoutsByWorkosId(
  dbOrTx: DbOrTx,
  workosId: string,
  options: GetWorkoutsOptions = {}
): Promise<WorkoutWithExerciseCount[]> {
  const db = getDb(dbOrTx);

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

  const baseQuery = db
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = baseQuery;

  if (sortBy === 'startedAt') {
    query = sortOrder === 'DESC'
      ? query.orderBy(desc(workouts.startedAt))
      : query.orderBy(asc(workouts.startedAt));
  } else {
    query = sortOrder === 'DESC'
      ? query.orderBy(desc(workouts.createdAt))
      : query.orderBy(asc(workouts.createdAt));
  }

  if (offset !== undefined) {
    query = query.offset(offset);
  }

  if (limit !== undefined) {
    query = query.limit(limit);
  }

  const results = await query;

  return results as WorkoutWithExerciseCount[];
}

export async function updateWorkout(
  dbOrTx: DbOrTx,
  workoutId: string,
  workosId: string,
  data: Partial<Workout>
): Promise<Workout | null> {
  const db = getDb(dbOrTx);

  const updated = await db
    .update(workouts)
    .set(data)
    .where(and(eq(workouts.id, workoutId), eq(workouts.workosId, workosId)))
    .returning()
    .get();

    
  return updated ?? null;
}

/**
 * Completes a workout by setting its completion timestamp
 * @param db - D1 database instance
 * @param workoutId - The workout ID to complete
 * @param workosId - The user's WorkOS ID for ownership validation
 * @returns The completed workout, or null if not found
 */
export async function completeWorkout(
  dbOrTx: DbOrTx,
  workoutId: string,
  workosId: string
): Promise<Workout | null> {
  return updateWorkout(dbOrTx, workoutId, workosId, {
    completedAt: new Date().toISOString(),
  });
}

/**
 * Deletes a workout permanently
 * @param db - D1 database instance
 * @param workoutId - The workout ID to delete
 * @param workosId - The user's WorkOS ID for ownership validation
 * @returns True if the operation succeeded, false if not found
 */
export async function deleteWorkout(
  dbOrTx: DbOrTx,
  workoutId: string,
  workosId: string
): Promise<boolean> {
  const db = getDb(dbOrTx);

  const result = await db
    .delete(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.workosId, workosId)))
    .run();

  return result.success;
}

export async function createWorkoutWithDetails(
  dbOrTx: DbOrTx,
  data: CreateWorkoutData & { workosId: string; exerciseIds: string[] },
  startedAt?: string
): Promise<WorkoutWithExercises> {
  const db = getDb(dbOrTx);

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
    const { getTemplateExercises } = await import('../template');
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

  const { getLastWorkoutSetsForExercises, getWorkoutExercises } = await import('./exercises');
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

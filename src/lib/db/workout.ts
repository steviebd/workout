/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm';
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

  const { sortBy = 'startedAt', sortOrder = 'DESC', limit, offset } = options;

  let query = drizzleDb
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId));

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
  exerciseId: string,
  orderIndex: number,
  notes?: string
): Promise<WorkoutExercise> {
  const drizzleDb = createDb(db);

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
  workoutId: string
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
    .where(eq(workoutExercises.workoutId, workoutId))
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
  setNumber: number,
  weight?: number,
  reps?: number,
  rpe?: number
): Promise<WorkoutSet> {
  const drizzleDb = createDb(db);

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
  data: Partial<NewWorkoutSet>
): Promise<WorkoutSet | null> {
  const drizzleDb = createDb(db);

  console.log('updateWorkoutSet:', { setId, data });

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
  setId: string
): Promise<WorkoutSet | null> {
  return updateWorkoutSet(db, setId, {
    isComplete: true,
    completedAt: new Date().toISOString(),
  });
}

export async function deleteWorkoutSet(
  db: D1Database,
  setId: string
): Promise<boolean> {
  const drizzleDb = createDb(db);

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
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .where(and(
      eq(workoutExercises.workoutId, workoutId),
      eq(workoutSets.isComplete, true)
    ))
    .all();

  let totalVolume = 0;
  for (const set of sets) {
    if (set.weight && set.reps) {
      totalVolume += set.weight * set.reps;
    }
  }

  return totalVolume;
}

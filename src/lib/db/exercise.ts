/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { and, asc, desc, eq, like } from 'drizzle-orm';
import { type Exercise, type NewExercise, exercises } from './schema';
import { createDb } from './index';

export type { Exercise, NewExercise };

export interface CreateExerciseData {
  name: string;
  muscleGroup?: string;
  description?: string;
  localId?: string;
}

export interface UpdateExerciseData {
  name?: string;
  muscleGroup?: string;
  description?: string;
}

export interface GetExercisesOptions {
  search?: string;
  muscleGroup?: string;
  excludeDeleted?: boolean;
  sortBy?: 'createdAt' | 'muscleGroup' | 'name';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export async function createExercise(
  db: D1Database,
  data: CreateExerciseData & { userId: string }
): Promise<Exercise> {
  const drizzleDb = createDb(db);

  const exercise = await drizzleDb
    .insert(exercises)
    .values({
      userId: data.userId,
      name: data.name,
      muscleGroup: data.muscleGroup,
      description: data.description,
      localId: data.localId,
    })
    .returning()
    .get();

  return exercise;
}

export async function getExerciseById(
  db: D1Database,
  exerciseId: string,
  userId: string
): Promise<Exercise | null> {
  const drizzleDb = createDb(db);

  const exercise = await drizzleDb
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId)))
    .get();

  return exercise ?? null;
}

export async function getExerciseByIdOnly(
  db: D1Database,
  exerciseId: string
): Promise<Exercise | null> {
  const drizzleDb = createDb(db);

  const exercise = await drizzleDb
    .select()
    .from(exercises)
    .where(eq(exercises.id, exerciseId))
    .get();

  return exercise ?? null;
}

export async function getExercisesByUserId(
  db: D1Database,
  userId: string,
  options: GetExercisesOptions = {}
): Promise<Exercise[]> {
  const drizzleDb = createDb(db);

  const {
    search,
    muscleGroup,
    excludeDeleted = true,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
    limit,
    offset,
  } = options;

  const conditions = [eq(exercises.userId, userId)];

  if (excludeDeleted) {
    conditions.push(eq(exercises.isDeleted, false));
  }

  if (search) {
    conditions.push(like(exercises.name, `%${search}%`));
  }

  if (muscleGroup) {
    conditions.push(eq(exercises.muscleGroup, muscleGroup));
  }

  const orderByClause = sortOrder === 'DESC'
    ? desc(exercises.createdAt)
    : asc(exercises.createdAt);

  let query = drizzleDb
    .select()
    .from(exercises)
    .where(and(...conditions));

  if (sortBy === 'name') {
    query = sortOrder === 'DESC'
      ? (query as any).orderBy(desc(exercises.name))
      : (query as any).orderBy(asc(exercises.name));
  } else if (sortBy === 'muscleGroup') {
    query = sortOrder === 'DESC'
      ? (query as any).orderBy(desc(exercises.muscleGroup))
      : (query as any).orderBy(asc(exercises.muscleGroup));
  } else {
    query = (query as any).orderBy(orderByClause);
  }

  if (offset !== undefined) {
    query = (query as any).offset(offset);
  }

  if (limit !== undefined) {
    query = (query as any).limit(limit);
  }

  const results = await query;

  return results as Exercise[];
}

export async function updateExercise(
  db: D1Database,
  exerciseId: string,
  userId: string,
  data: UpdateExerciseData
): Promise<Exercise | null> {
  const drizzleDb = createDb(db);

  const updateData: Partial<NewExercise> = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  const updated = await drizzleDb
    .update(exercises)
    .set(updateData)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId)))
    .returning()
    .get();

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return updated ?? null;
}

export async function softDeleteExercise(
  db: D1Database,
  exerciseId: string,
  userId: string
): Promise<boolean> {
  const drizzleDb = createDb(db);

  const result = await drizzleDb
    .update(exercises)
    .set({
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId)))
    .run();

  return result.success;
}

export interface LibraryExercise {
  name: string;
  muscleGroup: string;
  description: string;
}

export async function copyExerciseFromLibrary(
  db: D1Database,
  userId: string,
  libraryExercise: LibraryExercise
): Promise<Exercise> {
  const drizzleDb = createDb(db);

  const newExercise = await drizzleDb
    .insert(exercises)
    .values({
      userId,
      name: libraryExercise.name,
      muscleGroup: libraryExercise.muscleGroup,
      description: libraryExercise.description,
    })
    .returning()
    .get();

  return newExercise;
}

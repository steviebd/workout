/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, asc, desc, eq, like } from 'drizzle-orm';
import { type Exercise, type NewExercise, exercises } from './schema';
import { createDb } from './index';

export type { Exercise, NewExercise };

export interface CreateExerciseData {
  name: string;
  muscleGroup?: string;
  description?: string;
  localId?: string;
  libraryId?: string;
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

/**
 * Creates a new exercise for a user
 * @param db - D1 database instance
 * @param data - Exercise creation data including workosId
 * @returns The created exercise with all fields populated
 */
export async function createExercise(
  db: D1Database,
  data: CreateExerciseData & { workosId: string }
): Promise<Exercise> {
  const drizzleDb = createDb(db);

  const exercise = await drizzleDb
    .insert(exercises)
    .values({
      workosId: data.workosId,
      name: data.name,
      muscleGroup: data.muscleGroup,
      description: data.description,
      localId: data.localId,
      libraryId: data.libraryId,
    })
    .returning()
    .get();

  return exercise;
}

/**
 * Retrieves a single exercise by ID, validating user ownership
 * @param db - D1 database instance
 * @param exerciseId - The exercise ID to look up
 * @param workosId - The user's WorkOS ID for ownership validation
 * @returns The exercise if found, or null
 */
export async function getExerciseById(
  db: D1Database,
  exerciseId: string,
  workosId: string
): Promise<Exercise | null> {
  const drizzleDb = createDb(db);

  const exercise = await drizzleDb
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.workosId, workosId)))
    .get();

  return exercise ?? null;
}

/**
 * Retrieves a single exercise by ID without ownership validation
 * @param db - D1 database instance
 * @param exerciseId - The exercise ID to look up
 * @returns The exercise if found, or null
 */
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

/**
 * Retrieves all exercises for a user with optional filtering and sorting
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @param options - Optional filters and sorting options
 * @returns Array of exercises matching the criteria
 */
export async function getExercisesByWorkosId(
  db: D1Database,
  workosId: string,
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

  const conditions = [eq(exercises.workosId, workosId)];

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

/**
 * Updates an existing exercise
 * @param db - D1 database instance
 * @param exerciseId - The exercise ID to update
 * @param workosId - The user's WorkOS ID for ownership validation
 * @param data - Fields to update
 * @returns The updated exercise if found, or null
 */
export async function updateExercise(
  db: D1Database,
  exerciseId: string,
  workosId: string,
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
    .where(and(eq(exercises.id, exerciseId), eq(exercises.workosId, workosId)))
    .returning()
    .get();

   
  return updated ?? null;
}

/**
 * Soft deletes an exercise by marking it as deleted
 * @param db - D1 database instance
 * @param exerciseId - The exercise ID to delete
 * @param workosId - The user's WorkOS ID for ownership validation
 * @returns True if the operation succeeded, false if not found
 */
export async function softDeleteExercise(
  db: D1Database,
  exerciseId: string,
  workosId: string
): Promise<boolean> {
  const drizzleDb = createDb(db);

  const result = await drizzleDb
    .update(exercises)
    .set({
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(exercises.id, exerciseId), eq(exercises.workosId, workosId)))
    .run();

  return result.success;
}

export interface LibraryExercise {
  name: string;
  muscleGroup: string;
  description: string;
}

/**
 * Copies an exercise from the library to the user's personal collection
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @param libraryExercise - The library exercise data to copy
 * @returns The newly created exercise
 */
export async function copyExerciseFromLibrary(
  db: D1Database,
  workosId: string,
  libraryExercise: LibraryExercise
): Promise<Exercise> {
  const drizzleDb = createDb(db);

  const newExercise = await drizzleDb
    .insert(exercises)
    .values({
      workosId,
      name: libraryExercise.name,
      muscleGroup: libraryExercise.muscleGroup,
      description: libraryExercise.description,
    })
    .returning()
    .get();

  return newExercise;
}

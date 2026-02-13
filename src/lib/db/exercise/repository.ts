/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, asc, desc, eq, like } from 'drizzle-orm';
import { exercises, type Exercise, type NewExercise } from '../schema';
import { getDb, type DbOrTx } from '../index';
import type { CreateExerciseData, UpdateExerciseData, GetExercisesOptions, LibraryExercise } from './types';

export async function createExercise(
  dbOrTx: DbOrTx,
  data: CreateExerciseData & { workosId: string }
): Promise<Exercise> {
  const db = getDb(dbOrTx);

  const exercise = await db
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

export async function getExerciseById(
  dbOrTx: DbOrTx,
  exerciseId: string,
  workosId: string
): Promise<Exercise | null> {
  const db = getDb(dbOrTx);

  const exercise = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.workosId, workosId)))
    .get();

  return exercise ?? null;
}

export async function getExerciseByIdOnly(
  dbOrTx: DbOrTx,
  exerciseId: string
): Promise<Exercise | null> {
  const db = getDb(dbOrTx);

  const exercise = await db
    .select()
    .from(exercises)
    .where(eq(exercises.id, exerciseId))
    .get();

  return exercise ?? null;
}

export async function getExercisesByWorkosId(
  dbOrTx: DbOrTx,
  workosId: string,
  options: GetExercisesOptions = {}
): Promise<Exercise[]> {
  const db = getDb(dbOrTx);

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

  let query = db
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
  dbOrTx: DbOrTx,
  exerciseId: string,
  workosId: string,
  data: UpdateExerciseData
): Promise<Exercise | null> {
  const db = getDb(dbOrTx);

  const updateData: Partial<NewExercise> = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  const updated = await db
    .update(exercises)
    .set(updateData)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.workosId, workosId)))
    .returning()
    .get();

   
  return updated ?? null;
}

export async function softDeleteExercise(
  dbOrTx: DbOrTx,
  exerciseId: string,
  workosId: string
): Promise<boolean> {
  const db = getDb(dbOrTx);

  const result = await db
    .update(exercises)
    .set({
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(exercises.id, exerciseId), eq(exercises.workosId, workosId)))
    .run();

  return result.success;
}

export async function copyExerciseFromLibrary(
  dbOrTx: DbOrTx,
  workosId: string,
  libraryExercise: LibraryExercise
): Promise<Exercise> {
  const db = getDb(dbOrTx);

  const newExercise = await db
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

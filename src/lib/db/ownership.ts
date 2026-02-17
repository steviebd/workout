import { and, eq, type SQL, type Column } from 'drizzle-orm';
import { workouts, workoutExercises, workoutSets } from './schema';
import { getDb, type DbOrTx } from './index';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

/**
 * Result of an ownership validation check
 */
export interface OwnershipValidationResult {
  isValid: boolean;
  entityId?: string;
  error?: string;
}

/**
 * Validates direct ownership of an entity by checking workosId column
 * Use for tables that have a direct workosId column (exercises, workouts, templates)
 * 
 * @example
 * ```ts
 * const result = await validateEntityOwnership(
 *   db,
 *   exercises,
 *   exercises.id,
 *   exerciseId,
 *   exercises.workosId,
 *   workosId,
 *   'Exercise'
 * );
 * ```
 */
export async function validateEntityOwnership<T extends SQLiteTable>(
  dbOrTx: DbOrTx,
  table: T,
  idColumn: Column,
  entityId: string,
  workosIdColumn: Column,
  workosId: string,
  entityName: string
): Promise<OwnershipValidationResult> {
  const db = getDb(dbOrTx);

  const entity = await db
    .select({ id: idColumn })
    .from(table)
    .where(and(
      eq(idColumn, entityId),
      eq(workosIdColumn, workosId)
    ))
    .get();

  if (!entity) {
    return {
      isValid: false,
      error: `${entityName} not found or does not belong to you`,
    };
  }

  return {
    isValid: true,
    entityId: entity.id as string,
  };
}

/**
 * Validates ownership of a nested entity by joining to parent table
 * Use for entities that don't have direct workosId but reference a parent that does
 * 
 * @example
 * ```ts
 * // For workout exercises (workout_exercises → workouts)
 * const result = await validateNestedOwnership(
 *   db,
 *   workoutExercises,
 *   workoutExercises.id,
 *   workoutId,
 *   workouts,
 *   workoutExercises.workoutId,
 *   workosId,
 *   'Workout exercise'
 * );
 * ```
 */
export async function validateNestedOwnership<TEntity extends SQLiteTable, TParent extends SQLiteTable>(
  dbOrTx: DbOrTx,
  entityTable: TEntity,
  entityIdColumn: Column,
  entityId: string,
  parentTable: TParent,
  parentFkColumn: Column,
  workosId: string,
  entityName: string,
  parentIdColumn?: Column
): Promise<OwnershipValidationResult> {
  const db = getDb(dbOrTx);
  
  // Use provided parentIdColumn or default to 'id' column from parent table
  const parentIdCol = parentIdColumn ?? (parentTable as unknown as Record<string, Column>).id;
  const parentWorkosIdCol = (parentTable as unknown as Record<string, Column>).workosId;

  const entity = await db
    .select({ id: entityIdColumn })
    .from(entityTable)
    .innerJoin(
      parentTable,
      eq(parentFkColumn, parentIdCol)
    )
    .where(and(
      eq(entityIdColumn, entityId),
      eq(parentWorkosIdCol, workosId)
    ))
    .get();

  if (!entity) {
    return {
      isValid: false,
      error: `${entityName} not found or does not belong to you`,
    };
  }

  return {
    isValid: true,
    entityId: entity.id as string,
  };
}

/**
 * Validates ownership of a doubly-nested entity (e.g., sets → exercises → workouts)
 * 
 * @example
 * ```ts
 * // For workout sets (sets → exercises → workouts)
 * const result = await validateDoublyNestedOwnership(
 *   db,
 *   setId,
 *   workosId,
 *   'Workout set'
 * );
 * ```
 */
export async function validateDoublyNestedOwnership(
  dbOrTx: DbOrTx,
  setId: string,
  workosId: string,
  entityName = 'Workout set'
): Promise<OwnershipValidationResult> {
  const db = getDb(dbOrTx);

  const set = await db
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

  if (!set) {
    return {
      isValid: false,
      error: `${entityName} not found or does not belong to you`,
    };
  }

  return {
    isValid: true,
    entityId: set.setId,
  };
}

/**
 * Validates ownership of a workout set by localId instead of id
 * Specialized function for set-service.ts pattern
 */
export async function validateWorkoutSetOwnershipByLocalId(
  dbOrTx: DbOrTx,
  localId: string,
  workosId: string
): Promise<OwnershipValidationResult> {
  const db = getDb(dbOrTx);

  const set = await db
    .select({
      setId: workoutSets.id,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workoutSets.localId, localId),
      eq(workouts.workosId, workosId)
    ))
    .get();

  if (!set) {
    return {
      isValid: false,
      error: 'Workout set not found or does not belong to you',
    };
  }

  return {
    isValid: true,
    entityId: set.setId,
  };
}

/**
 * Validates ownership of a workout exercise
 * Specialized function for the common pattern of checking exercise ownership
 */
export async function validateWorkoutExerciseOwnership(
  dbOrTx: DbOrTx,
  workoutExerciseId: string,
  workosId: string
): Promise<OwnershipValidationResult> {
  const db = getDb(dbOrTx);

  const exercise = await db
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

  if (!exercise) {
    return {
      isValid: false,
      error: 'Workout exercise not found or does not belong to you',
    };
  }

  return {
    isValid: true,
    entityId: exercise.exerciseId,
  };
}

/**
 * Type for a function that returns an ownership condition SQL expression
 */
export type OwnershipConditionFn = (workosId: string) => SQL;

/**
 * Creates an ownership condition for direct ownership (table has workosId column)
 * 
 * @example
 * ```ts
 * const condition = withDirectOwnership(exercises.workosId)(workosId);
 * // Returns: eq(exercises.workosId, workosId)
 * ```
 */
export function withDirectOwnership(
  workosIdColumn: Column
): OwnershipConditionFn {
  return (workosId: string) => eq(workosIdColumn, workosId);
}

/**
 * Higher-order function that wraps a repository function with ownership validation
 * The validator runs first, and if successful, calls the operation function
 * 
 * @example
 * ```ts
 * const createSet = withOwnershipCheck(
 *   validateWorkoutExerciseOwnership,
 *   async (db, exerciseId, workosId, setData) => {
 *     // This only runs if ownership is valid
 *     return db.insert(workoutSets).values(setData).returning().get();
 *   }
 * );
 * ```
 */
export function withOwnershipCheck<TArgs extends unknown[], TReturn>(
  validator: (db: DbOrTx, ...args: TArgs) => Promise<OwnershipValidationResult>,
  operation: (db: DbOrTx, ...args: TArgs) => Promise<TReturn>,
  errorReturnValue?: TReturn
): (db: DbOrTx, ...args: TArgs) => Promise<TReturn | undefined> {
  return async (db: DbOrTx, ...args: TArgs): Promise<TReturn | undefined> => {
    const validation = await validator(db, ...args);
    
    if (!validation.isValid) {
      return errorReturnValue;
    }
    
    return operation(db, ...args);
  };
}

/**
 * Asserts ownership and throws if invalid. For use when you want to throw errors
 * instead of returning null/undefined.
 * 
 * @throws Error with message if ownership is invalid
 */
export async function assertOwnership(
  validationResult: OwnershipValidationResult
): Promise<string> {
  if (!validationResult.isValid) {
    throw new Error(validationResult.error ?? 'Entity not found or access denied');
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return validationResult.entityId!;
}

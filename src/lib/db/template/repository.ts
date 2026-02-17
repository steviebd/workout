import { and, asc, desc, eq, isNull, like, type SQL } from 'drizzle-orm';
import { type Template, exercises, templateExercises, templates } from '../schema';
import { getDb } from '../index';
import { applyPagination, withUpdatedAt } from '../base-repository';
import type {
  DbOrTx,
  TemplateExerciseWithDetails,
  CreateTemplateData,
  UpdateTemplateData,
  GetTemplatesOptions,
  TemplateWithExerciseCount,
  ExerciseOrder,
} from './types';

/**
 * Counts the number of times an exercise appears in a template
 * @param dbOrTx - D1 database instance or transaction
 * @param templateId - The template ID to check
 * @param exerciseId - The exercise ID to count occurrences of
 * @returns The number of times the exercise appears in the template
 */
export async function getTemplateExerciseSetCount(
  dbOrTx: DbOrTx,
  templateId: string,
  exerciseId: string
): Promise<number> {
  const db = getDb(dbOrTx);

  const result = await db
    .select({ count: db.$count(templateExercises, and(
      eq(templateExercises.templateId, templateId),
      eq(templateExercises.exerciseId, exerciseId)
    ))})
    .from(templateExercises)
    .get();

  return result?.count ?? 0;
}

/**
 * Creates a new workout template for a user
 * @param db - D1 database instance
 * @param data - Template creation data including workosId
 * @returns The newly created template
 */
export async function createTemplate(
  dbOrTx: DbOrTx,
  data: CreateTemplateData & { workosId: string }
): Promise<Template> {
  const db = getDb(dbOrTx);

  const template = await db
    .insert(templates)
    .values({
      workosId: data.workosId,
      name: data.name,
      description: data.description,
      notes: data.notes,
      localId: data.localId,
      programCycleId: data.programCycleId,
    })
    .returning()
    .get();

  return template;
}

/**
 * Retrieves a template by ID with ownership validation
 * @param dbOrTx - D1 database instance or transaction
 * @param templateId - The template ID to look up
 * @param workosId - The user's WorkOS ID for ownership validation
 * @returns The template if found, or null
 */
export async function getTemplateById(
  dbOrTx: DbOrTx,
  templateId: string,
  workosId: string
): Promise<Template | null> {
  const db = getDb(dbOrTx);

  const template = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.workosId, workosId)))
    .get();

  return template ?? null;
}

/**
 * Retrieves all templates for a user with optional filtering and sorting
 * @param dbOrTx - D1 database instance or transaction
 * @param workosId - The user's WorkOS ID
 * @param options - Optional search and sorting options
 * @returns Array of templates with exercise counts
 */
export async function getTemplatesByWorkosId(
  dbOrTx: DbOrTx,
  workosId: string,
  options: GetTemplatesOptions = {}
): Promise<TemplateWithExerciseCount[]> {
  const db = getDb(dbOrTx);

  const {
    search,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
    limit,
    offset,
  } = options;

  const conditions = [eq(templates.workosId, workosId), eq(templates.isDeleted, false), isNull(templates.programCycleId)];

  if (search) {
    conditions.push(like(templates.name, `%${search}%`));
  }

  const orderByClause: SQL =
    sortBy === 'name'
      ? sortOrder === 'DESC'
        ? desc(templates.name)
        : asc(templates.name)
      : sortOrder === 'DESC'
        ? desc(templates.createdAt)
        : asc(templates.createdAt);

  const query = db
    .select({
      id: templates.id,
      workosId: templates.workosId,
      name: templates.name,
      description: templates.description,
      notes: templates.notes,
      isDeleted: templates.isDeleted,
      createdAt: templates.createdAt,
      updatedAt: templates.updatedAt,
      exerciseCount: db.$count(
        templateExercises,
        and(eq(templateExercises.templateId, templates.id))
      ),
    })
    .from(templates)
    .where(and(...conditions))
    .orderBy(orderByClause);

  const paginatedQuery = applyPagination(query, offset, limit);
  const results = (await paginatedQuery) as TemplateWithExerciseCount[];

  return results;
}

export async function updateTemplate(
  dbOrTx: DbOrTx,
  templateId: string,
  workosId: string,
  data: UpdateTemplateData
): Promise<Template | null> {
  const db = getDb(dbOrTx);

  const updateData = withUpdatedAt(data);

  const updated = await db
    .update(templates)
    .set(updateData)
    .where(and(eq(templates.id, templateId), eq(templates.workosId, workosId)))
    .returning()
    .get();

   
  return updated ?? null;
}

export async function softDeleteTemplate(
  dbOrTx: DbOrTx,
  templateId: string,
  workosId: string
): Promise<boolean> {
  const db = getDb(dbOrTx);

  const result = await db
    .update(templates)
    .set(withUpdatedAt({ isDeleted: true }))
    .where(and(eq(templates.id, templateId), eq(templates.workosId, workosId)))
    .run();

  return result.success;
}

/**
 * Removes an exercise from a template
 * @param db - D1 database instance
 * @param templateId - The template to modify
 * @param exerciseId - The exercise to remove
 * @param workosId - The user's WorkOS ID for ownership validation
 * @returns True if the exercise was removed, false if template not found
 */
export async function removeExerciseFromTemplate(
  dbOrTx: DbOrTx,
  templateId: string,
  exerciseId: string,
  workosId: string
): Promise<boolean> {
  const db = getDb(dbOrTx);

  const template = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.workosId, workosId)))
    .get();

  if (!template) {
    return false;
  }

  const result = await db
    .delete(templateExercises)
    .where(and(
      eq(templateExercises.templateId, templateId),
      eq(templateExercises.exerciseId, exerciseId)
    ))
    .run();

  return result.success;
}

export async function getTemplateExercises(
  dbOrTx: DbOrTx,
  templateId: string,
  workosId: string
): Promise<TemplateExerciseWithDetails[]> {
  const db = getDb(dbOrTx);

  const template = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.workosId, workosId)))
    .get();

  if (!template) {
    return [];
  }

  const results = await db
    .select({
      id: templateExercises.id,
      templateId: templateExercises.templateId,
      exerciseId: templateExercises.exerciseId,
      orderIndex: templateExercises.orderIndex,
      targetWeight: templateExercises.targetWeight,
      sets: templateExercises.sets,
      reps: templateExercises.reps,
      isAmrap: templateExercises.isAmrap,
      setNumber: templateExercises.setNumber,
      exercise: {
        id: exercises.id,
        name: exercises.name,
        muscleGroup: exercises.muscleGroup,
      },
    })
    .from(templateExercises)
    .innerJoin(exercises, eq(templateExercises.exerciseId, exercises.id))
    .where(eq(templateExercises.templateId, templateId))
    .orderBy(templateExercises.orderIndex)
    .all();

  return results as TemplateExerciseWithDetails[];
}

export async function getTemplateWithExercises(
  dbOrTx: DbOrTx,
  templateId: string,
  workosId: string
): Promise<(Template & { exercises: TemplateExerciseWithDetails[] }) | null> {
  const db = getDb(dbOrTx);

  const template = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.workosId, workosId)))
    .get();

  if (!template) {
    return null;
  }

  const templateExercisesWithDetails = await db
    .select({
      id: templateExercises.id,
      templateId: templateExercises.templateId,
      exerciseId: templateExercises.exerciseId,
      orderIndex: templateExercises.orderIndex,
      targetWeight: templateExercises.targetWeight,
      sets: templateExercises.sets,
      reps: templateExercises.reps,
      isAmrap: templateExercises.isAmrap,
      setNumber: templateExercises.setNumber,
      exercise: {
        id: exercises.id,
        name: exercises.name,
        muscleGroup: exercises.muscleGroup,
      },
    })
    .from(templateExercises)
    .innerJoin(exercises, eq(templateExercises.exerciseId, exercises.id))
    .where(eq(templateExercises.templateId, templateId))
    .orderBy(templateExercises.orderIndex)
    .all();

  return { ...template, exercises: templateExercisesWithDetails as TemplateExerciseWithDetails[] };
}

/**
 * Reorders exercises within a template by updating their orderIndex values.
 * Validates template ownership first, then applies all order updates in sequence.
 * Batch update ensures atomic reordering - either all succeed or none do.
 */
export async function reorderTemplateExercises(
  dbOrTx: DbOrTx,
  templateId: string,
  exerciseOrders: ExerciseOrder[],
  workosId: string
): Promise<boolean> {
  const db = getDb(dbOrTx);

  const template = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.workosId, workosId)))
    .get();

  if (!template) {
    return false;
  }

  const updates = exerciseOrders.map(order =>
    db
      .update(templateExercises)
      .set({ orderIndex: order.orderIndex })
      .where(and(
        eq(templateExercises.templateId, templateId),
        eq(templateExercises.exerciseId, order.exerciseId)
      ))
      .run()
  );

  await Promise.all(updates);

  return true;
}

/**
 * Removes all exercises from a template
 * @param db - D1 database instance
 * @param templateId - The template ID to clear
 * @param workosId - The user's WorkOS ID for ownership validation
 * @returns True if successful, false if template not found
 */
export async function deleteAllTemplateExercises(
  dbOrTx: DbOrTx,
  templateId: string,
  workosId: string
): Promise<boolean> {
  const db = getDb(dbOrTx);

  const template = await db
    .select({ id: templates.id })
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.workosId, workosId)))
    .get();

  if (!template) {
    console.log('deleteAllTemplateExercises: Template not found or does not belong to user');
    return false;
  }

  await db
    .delete(templateExercises)
    .where(eq(templateExercises.templateId, templateId))
    .run();

  return true;
}

export async function addExerciseToTemplate(
  dbOrTx: DbOrTx,
  templateId: string,
  exerciseId: string,
  orderIndex: number
): Promise<void> {
  const db = getDb(dbOrTx);

  await db
    .insert(templateExercises)
    .values({
      templateId,
      exerciseId,
      orderIndex,
    })
    .run();
}

export async function copyTemplate(
  dbOrTx: DbOrTx,
  templateId: string,
  workosId: string
): Promise<Template | null> {
  const db = getDb(dbOrTx);

  const originalTemplate = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.workosId, workosId)))
    .get();

  if (!originalTemplate) {
    return null;
  }

  const newTemplate = await db
    .insert(templates)
    .values({
      workosId: originalTemplate.workosId,
      name: `${originalTemplate.name} (Copy)`,
      description: originalTemplate.description,
      notes: originalTemplate.notes,
      localId: originalTemplate.localId,
      programCycleId: originalTemplate.programCycleId,
    })
    .returning()
    .get();

  const originalExercises = await db
    .select()
    .from(templateExercises)
    .where(eq(templateExercises.templateId, templateId))
    .orderBy(templateExercises.orderIndex)
    .all();

  if (originalExercises.length > 0) {
    await db
      .insert(templateExercises)
      .values(
        originalExercises.map((te) => ({
          templateId: newTemplate.id,
          exerciseId: te.exerciseId,
          orderIndex: te.orderIndex,
          targetWeight: te.targetWeight,
          sets: te.sets,
          reps: te.reps,
          isAmrap: te.isAmrap,
          setNumber: te.setNumber,
        }))
      )
      .run();
  }

  return newTemplate;
}

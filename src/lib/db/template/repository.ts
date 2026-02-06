/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, asc, desc, eq, isNull, like } from 'drizzle-orm';
import { type NewTemplate, type NewTemplateExercise, type Template, exercises, templateExercises, templates } from '../schema';
import { createDb, calculateChunkSize } from '../index';
import type {
  DbOrTx,
  TemplateExerciseWithDetails,
  CreateTemplateData,
  UpdateTemplateData,
  GetTemplatesOptions,
  TemplateWithExerciseCount,
  ExerciseOrder,
} from './types';

export async function getTemplateExerciseSetCount(
  dbOrTx: D1Database | ReturnType<typeof createDb>,
  templateId: string,
  exerciseId: string
): Promise<number> {
  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

  const result = await db
    .select({ count: db.$count(templateExercises, and(
      eq(templateExercises.templateId, templateId),
      eq(templateExercises.exerciseId, exerciseId)
    ))})
    .from(templateExercises)
    .get();

  return result?.count ?? 0;
}

export async function createTemplate(
  db: D1Database,
  data: CreateTemplateData & { workosId: string }
): Promise<Template> {
  const drizzleDb = createDb(db);

  const template = await drizzleDb
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

export async function getTemplateById(
  dbOrTx: D1Database | ReturnType<typeof createDb>,
  templateId: string,
  workosId: string
): Promise<Template | null> {
  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

  const template = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.workosId, workosId)))
    .get();

  return template ?? null;
}

export async function getTemplatesByWorkosId(
  dbOrTx: D1Database | ReturnType<typeof createDb>,
  workosId: string,
  options: GetTemplatesOptions = {}
): Promise<TemplateWithExerciseCount[]> {
  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

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

  let query = db
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
    .where(and(...conditions));

  if (sortBy === 'name') {
    query = sortOrder === 'DESC'
      ? (query as any).orderBy(desc(templates.name))
      : (query as any).orderBy(asc(templates.name));
  } else {
    query = sortOrder === 'DESC'
      ? (query as any).orderBy(desc(templates.createdAt))
      : (query as any).orderBy(asc(templates.createdAt));
  }

  if (offset !== undefined) {
    query = (query as any).offset(offset);
  }

  if (limit !== undefined) {
    query = (query as any).limit(limit);
  }

  const results = await query;

  return results as TemplateWithExerciseCount[];
}

export async function updateTemplate(
  db: D1Database,
  templateId: string,
  workosId: string,
  data: UpdateTemplateData
): Promise<Template | null> {
  const drizzleDb = createDb(db);

  const updateData: Partial<NewTemplate> = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  const updated = await drizzleDb
    .update(templates)
    .set(updateData)
    .where(and(eq(templates.id, templateId), eq(templates.workosId, workosId)))
    .returning()
    .get();

   
  return updated ?? null;
}

export async function softDeleteTemplate(
  db: D1Database,
  templateId: string,
  workosId: string
): Promise<boolean> {
  const drizzleDb = createDb(db);

  const result = await drizzleDb
    .update(templates)
    .set({
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(templates.id, templateId), eq(templates.workosId, workosId)))
    .run();

  return result.success;
}

/**
 * Creates a deep copy of a template including all exercises with their order.
 * Fetches original template and exercises, creates new template with "(Copy)" suffix,
 * then copies each exercise reference preserving the original order index.
 * Used when user wants to modify an existing template without affecting the original.
 */
export async function copyTemplate(
  dbOrTx: DbOrTx,
  templateId: string,
  workosId: string
): Promise<Template | null> {
  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

  const original = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.workosId, workosId)))
    .get();

  if (!original) {
    return null;
  }

  const newTemplate = await db
    .insert(templates)
    .values({
      workosId,
      name: `${original.name} (Copy)`,
      description: original.description,
      notes: original.notes,
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
    const newExercises: NewTemplateExercise[] = originalExercises.map((te) => ({
      templateId: newTemplate.id,
      exerciseId: te.exerciseId,
      orderIndex: te.orderIndex,
    }));

    const CHUNK_SIZE = calculateChunkSize(5);
    for (let i = 0; i < newExercises.length; i += CHUNK_SIZE) {
      const batch = newExercises.slice(i, i + CHUNK_SIZE);
      await db.insert(templateExercises).values(batch).run();
    }
  }

  return newTemplate;
}

export async function addExerciseToTemplate(
  db: D1Database,
  templateId: string,
  exerciseId: string,
  orderIndex: number,
  targetWeight?: number,
  addedWeight?: number,
  sets?: number,
  reps?: number,
  repsRaw?: string,
  isAmrap?: boolean,
  setNumber?: number,
  isAccessory?: boolean,
  isRequired?: boolean
): Promise<void> {
  const drizzleDb = createDb(db);

  await drizzleDb.insert(templateExercises).values({
    templateId,
    exerciseId,
    orderIndex,
    targetWeight: targetWeight ?? null,
    addedWeight: addedWeight ?? 0,
    sets: sets ?? null,
    reps: reps ?? null,
    repsRaw: repsRaw ?? null,
    isAmrap: isAmrap ?? false,
    setNumber: setNumber ?? null,
    isAccessory: isAccessory ?? false,
    isRequired: isRequired ?? true,
  } as any).run();
}

export async function removeExerciseFromTemplate(
  db: D1Database,
  templateId: string,
  exerciseId: string,
  workosId: string
): Promise<boolean> {
  const drizzleDb = createDb(db);

  const template = await drizzleDb
    .select()
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.workosId, workosId)))
    .get();

  if (!template) {
    return false;
  }

  const result = await drizzleDb
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
  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

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
  const isTransaction = 'transaction' in dbOrTx;
  const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);

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

export async function deleteAllTemplateExercises(
  db: D1Database,
  templateId: string,
  workosId: string
): Promise<boolean> {
  const drizzleDb = createDb(db);

  const template = await drizzleDb
    .select({ id: templates.id })
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.workosId, workosId)))
    .get();

  if (!template) {
    console.log('deleteAllTemplateExercises: Template not found or does not belong to user');
    return false;
  }

  await drizzleDb
    .delete(templateExercises)
    .where(eq(templateExercises.templateId, templateId))
    .run();

  return true;
}

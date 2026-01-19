/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { and, asc, desc, eq, like } from 'drizzle-orm';
import { type NewTemplate, type NewTemplateExercise, type Template, type TemplateExercise, exercises, templateExercises, templates } from './schema';
import { createDb } from './index';

export interface TemplateExerciseWithDetails extends TemplateExercise {
  exercise?: {
    id: string;
    name: string;
    muscleGroup: string | null;
  };
}

export type { Template, NewTemplate, TemplateExercise, NewTemplateExercise };

export interface CreateTemplateData {
  name: string;
  description?: string;
  notes?: string;
}

export interface UpdateTemplateData {
  name?: string;
  description?: string;
  notes?: string;
}

export interface GetTemplatesOptions {
  search?: string;
  sortBy?: 'createdAt' | 'name';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface TemplateWithExerciseCount extends Template {
  exerciseCount: number;
}

export async function createTemplate(
  db: D1Database,
  data: CreateTemplateData & { userId: string }
): Promise<Template> {
  const drizzleDb = createDb(db);

  const template = await drizzleDb
    .insert(templates)
    .values({
      userId: data.userId,
      name: data.name,
      description: data.description,
      notes: data.notes,
    })
    .returning()
    .get();

  return template;
}

export async function getTemplateById(
  db: D1Database,
  templateId: string,
  userId: string
): Promise<Template | null> {
  const drizzleDb = createDb(db);

  const template = await drizzleDb
    .select()
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.userId, userId)))
    .get();

  return template ?? null;
}

export async function getTemplatesByUserId(
  db: D1Database,
  userId: string,
  options: GetTemplatesOptions = {}
): Promise<TemplateWithExerciseCount[]> {
  const drizzleDb = createDb(db);

  const {
    search,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
    limit,
    offset,
  } = options;

  const conditions = [eq(templates.userId, userId), eq(templates.isDeleted, false)];

  if (search) {
    conditions.push(like(templates.name, `%${search}%`));
  }

  let query = drizzleDb
    .select({
      id: templates.id,
      userId: templates.userId,
      name: templates.name,
      description: templates.description,
      notes: templates.notes,
      isDeleted: templates.isDeleted,
      createdAt: templates.createdAt,
      updatedAt: templates.updatedAt,
      exerciseCount: drizzleDb.$count(
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
  userId: string,
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
    .where(and(eq(templates.id, templateId), eq(templates.userId, userId)))
    .returning()
    .get();

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return updated ?? null;
}

export async function softDeleteTemplate(
  db: D1Database,
  templateId: string,
  userId: string
): Promise<boolean> {
  const drizzleDb = createDb(db);

  const result = await drizzleDb
    .update(templates)
    .set({
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(templates.id, templateId), eq(templates.userId, userId)))
    .run();

  return result.success;
}

export async function copyTemplate(
  db: D1Database,
  templateId: string,
  userId: string
): Promise<Template | null> {
  const drizzleDb = createDb(db);

  const original = await drizzleDb
    .select()
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.userId, userId)))
    .get();

  if (!original) {
    return null;
  }

  const newTemplate = await drizzleDb
    .insert(templates)
    .values({
      userId,
      name: `${original.name} (Copy)`,
      description: original.description,
      notes: original.notes,
    })
    .returning()
    .get();

  const originalExercises = await drizzleDb
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

    await drizzleDb.insert(templateExercises).values(newExercises).run();
  }

  return newTemplate;
}

export async function addExerciseToTemplate(
  db: D1Database,
  templateId: string,
  exerciseId: string,
  orderIndex: number
): Promise<TemplateExercise> {
  const drizzleDb = createDb(db);

  const templateExercise = await drizzleDb
    .insert(templateExercises)
    .values({
      templateId,
      exerciseId,
      orderIndex,
    })
    .returning()
    .get();

  return templateExercise;
}

export async function removeExerciseFromTemplate(
  db: D1Database,
  templateId: string,
  exerciseId: string,
  userId: string
): Promise<boolean> {
  const drizzleDb = createDb(db);

  const template = await drizzleDb
    .select()
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.userId, userId)))
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
  db: D1Database,
  templateId: string,
  userId: string
): Promise<TemplateExerciseWithDetails[]> {
  const drizzleDb = createDb(db);

  const template = await drizzleDb
    .select()
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.userId, userId)))
    .get();

  if (!template) {
    return [];
  }

  const results = await drizzleDb
    .select({
      id: templateExercises.id,
      templateId: templateExercises.templateId,
      exerciseId: templateExercises.exerciseId,
      orderIndex: templateExercises.orderIndex,
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

export interface ExerciseOrder {
  exerciseId: string;
  orderIndex: number;
}

export async function reorderTemplateExercises(
  db: D1Database,
  templateId: string,
  exerciseOrders: ExerciseOrder[],
  userId: string
): Promise<boolean> {
  const drizzleDb = createDb(db);

  const template = await drizzleDb
    .select()
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.userId, userId)))
    .get();

  if (!template) {
    return false;
  }

  for (const order of exerciseOrders) {
    await drizzleDb
      .update(templateExercises)
      .set({ orderIndex: order.orderIndex })
      .where(and(
        eq(templateExercises.templateId, templateId),
        eq(templateExercises.exerciseId, order.exerciseId)
      ))
      .run();
  }

  return true;
}

export async function deleteAllTemplateExercises(
  db: D1Database,
  templateId: string
): Promise<void> {
  const drizzleDb = createDb(db);

  await drizzleDb
    .delete(templateExercises)
    .where(eq(templateExercises.templateId, templateId))
    .run();
}

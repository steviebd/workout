import { z } from 'zod';

export const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string): boolean {
  return uuidRegex.test(id);
}

export function validateUUID(id: string): { valid: boolean; error?: string } {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'ID is required' };
  }
  if (!uuidRegex.test(id)) {
    return { valid: false, error: 'Invalid ID format' };
  }
  return { valid: true };
}

export const CreateWorkoutSchema = z.object({
  name: z.string().min(1).max(120),
  templateId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
  exerciseIds: z.array(z.string().uuid()).optional(),
  localId: z.string().optional(),
});

export const UpdateWorkoutSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  notes: z.string().max(5000).optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export const CreateExerciseSchema = z.object({
  name: z.string().min(1).max(200),
  muscleGroup: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  localId: z.string().optional(),
  libraryId: z.string().uuid().optional(),
});

export const UpdateExerciseSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  muscleGroup: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
});

export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  localId: z.string().optional(),
});

export const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
});

export const UpdateSetSchema = z.object({
  weight: z.number().min(0).optional(),
  reps: z.number().int().min(0).optional(),
  rpe: z.number().min(1).max(10).optional(),
  isComplete: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export const UpdatePreferencesSchema = z.object({
  weightUnit: z.enum(['kg', 'lbs']).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  dateFormat: z.enum(['dd/mm/yyyy', 'mm/dd/yyyy', 'yyyy-mm-dd']).optional(),
});

export function parseRequestBody<T>(schema: z.ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: 'Invalid request body' };
}

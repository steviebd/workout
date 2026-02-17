import { z } from 'zod';

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(500).trim().optional(),
  notes: z.string().max(2000).trim().optional(),
  localId: z.string().optional(),
  programCycleId: z.string().optional(),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(500).trim().optional(),
  notes: z.string().max(2000).trim().optional(),
});

export const addExerciseToTemplateSchema = z.object({
  exerciseId: z.string(),
  orderIndex: z.number().int().min(0).optional(),
  localId: z.string().optional(),
});

export const exerciseOrderSchema = z.object({
  exerciseId: z.string(),
  orderIndex: z.number().int().min(0),
});

export const reorderTemplateExercisesSchema = z.object({
  exerciseOrders: z.array(exerciseOrderSchema).min(1),
});

export const createProgramCycleSchema = z.object({
  programSlug: z.string(),
  squat1rm: z.number().min(0),
  bench1rm: z.number().min(0),
  deadlift1rm: z.number().min(0),
  ohp1rm: z.number().min(0),
  preferredGymDays: z.array(z.string()).min(1),
  preferredTimeOfDay: z.enum(['morning', 'afternoon', 'evening']).optional(),
  programStartDate: z.string(),
  firstSessionDate: z.string(),
});

export const updateProgramCycleSchema = z.object({
  squat1rm: z.number().min(0).optional(),
  bench1rm: z.number().min(0).optional(),
  deadlift1rm: z.number().min(0).optional(),
  ohp1rm: z.number().min(0).optional(),
  currentWeek: z.number().int().min(1).optional(),
  currentSession: z.number().int().min(1).optional(),
  isComplete: z.boolean().optional(),
});

export const update1RMTestWorkoutSchema = z.object({
  squat1rm: z.number().min(0).optional(),
  bench1rm: z.number().min(0).optional(),
  deadlift1rm: z.number().min(0).optional(),
  ohp1rm: z.number().min(0).optional(),
  startingSquat1rm: z.number().min(0).optional(),
  startingBench1rm: z.number().min(0).optional(),
  startingDeadlift1rm: z.number().min(0).optional(),
  startingOhp1rm: z.number().min(0).optional(),
});

export const rescheduleWorkoutSchema = z.object({
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduledTime: z.string().optional(),
});

export const updatePreferencesSchema = z.object({
  weightUnit: z.enum(['kg', 'lbs']).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  dateFormat: z.enum(['dd/mm/yyyy', 'mm/dd/yyyy']).optional(),
  weeklyWorkoutTarget: z.number().int().min(0).max(7).optional(),
});

import { z } from 'zod';

export const mealTypeEnum = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export type MealType = z.infer<typeof mealTypeEnum>;

export const trainingTypeEnum = z.enum(['rest_day', 'cardio', 'powerlifting', 'custom']);
export type TrainingType = z.infer<typeof trainingTypeEnum>;

export const createNutritionEntrySchema = z.object({
  name: z.string().min(1).max(500),
  calories: z.number().min(0).max(10000),
  proteinG: z.number().min(0).max(500),
  carbsG: z.number().min(0).max(1000),
  fatG: z.number().min(0).max(500),
  mealType: mealTypeEnum,
  date: z.string().min(1),
  loggedAt: z.string().optional(),
});

export const updateNutritionEntrySchema = z.object({
  name: z.string().min(1).max(500).optional(),
  calories: z.number().min(0).max(10000).optional(),
  proteinG: z.number().min(0).max(500).optional(),
  carbsG: z.number().min(0).max(1000).optional(),
  fatG: z.number().min(0).max(500).optional(),
  mealType: mealTypeEnum.optional(),
});

export const upsertBodyStatsSchema = z.object({
  bodyweightKg: z.number().min(0).max(500).optional(),
  heightCm: z.number().min(0).max(300).optional(),
  targetCalories: z.number().min(0).max(20000).optional(),
  targetProteinG: z.number().min(0).max(2000).optional(),
  targetCarbsG: z.number().min(0).max(3000).optional(),
  targetFatG: z.number().min(0).max(1000).optional(),
  recordedAt: z.string().optional(),
});

export const upsertTrainingContextSchema = z.object({
  trainingType: trainingTypeEnum,
  customLabel: z.string().max(500).optional(),
});

export const nutritionEntryQuerySchema = z.object({
  date: z.string().min(1),
});

export type CreateNutritionEntry = z.infer<typeof createNutritionEntrySchema>;
export type UpdateNutritionEntry = z.infer<typeof updateNutritionEntrySchema>;
export type UpsertBodyStats = z.infer<typeof upsertBodyStatsSchema>;
export type UpsertTrainingContext = z.infer<typeof upsertTrainingContextSchema>;

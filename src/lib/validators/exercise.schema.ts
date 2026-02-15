import { z } from 'zod';

export const createExerciseSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  muscleGroup: z.string().max(50).trim().optional(),
  description: z.string().max(1000).trim().optional(),
  localId: z.string().optional(),
  libraryId: z.string().optional(),
});

export const updateExerciseSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  muscleGroup: z.string().max(50).trim().optional(),
  description: z.string().max(1000).trim().optional(),
});

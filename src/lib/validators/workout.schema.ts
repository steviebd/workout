import { z } from 'zod';

export const createWorkoutSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  templateId: z.string().optional(),
  notes: z.string().max(2000).trim().optional(),
  exerciseIds: z.array(z.string()).optional(),
  localId: z.string().optional(),
});

export const updateWorkoutSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  notes: z.string().max(2000).trim().optional(),
  completedAt: z.string().optional().nullable(),
  squat1rm: z.number().optional().nullable(),
  bench1rm: z.number().optional().nullable(),
  deadlift1rm: z.number().optional().nullable(),
  ohp1rm: z.number().optional().nullable(),
  startingSquat1rm: z.number().optional().nullable(),
  startingBench1rm: z.number().optional().nullable(),
  startingDeadlift1rm: z.number().optional().nullable(),
  startingOhp1rm: z.number().optional().nullable(),
});

export const updateWorkoutSetSchema = z.object({
  weight: z.number().min(0).nullable().optional(),
  reps: z.number().min(0).nullable().optional(),
  rpe: z.number().min(0).nullable().optional(),
  isComplete: z.boolean().optional(),
  localId: z.string().optional(),
});

export const updateWorkoutSetByLocalIdSchema = z.object({
  localId: z.string(),
  workoutExerciseId: z.string().optional(),
  setNumber: z.number().int().min(1).optional(),
  weight: z.number().min(0).nullable().optional(),
  reps: z.number().min(0).nullable().optional(),
  rpe: z.number().min(0).nullable().optional(),
  isComplete: z.boolean().optional(),
});

export const createWorkoutSetSchema = z.object({
  workoutExerciseId: z.string(),
  setNumber: z.number().int().min(1),
  weight: z.number().min(0).optional(),
  reps: z.number().min(0).optional(),
  rpe: z.number().min(0).optional(),
  localId: z.string().optional(),
});

export const workoutExerciseOrderSchema = z.object({
  exerciseId: z.string(),
  orderIndex: z.number().int().min(0),
});

export const reorderWorkoutExercisesSchema = z.object({
  exerciseOrders: z.array(workoutExerciseOrderSchema).min(1),
});

export const createWorkoutExerciseSchema = z.object({
  exerciseId: z.string(),
  orderIndex: z.number().int().min(0),
  notes: z.string().max(1000).trim().optional(),
  localId: z.string().optional(),
});

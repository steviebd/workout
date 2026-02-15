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

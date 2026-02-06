import { z } from 'zod';

export const createWorkoutSchema = z.object({
  name: z.string().min(1).max(200),
  templateId: z.string().optional(),
  notes: z.string().max(2000).optional(),
  exerciseIds: z.array(z.string()).optional(),
  localId: z.string().optional(),
});

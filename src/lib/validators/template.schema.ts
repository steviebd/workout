import { z } from 'zod';

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  localId: z.string().optional(),
  programCycleId: z.string().optional(),
});

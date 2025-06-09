import { z } from 'zod';

export const eventSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  endAt: z.string().datetime(),
  memberA: z.string().min(1),
  memberB: z.string().min(1),
  imageMemberA: z.string().url().optional(),
  imageMemberB: z.string().url().optional(), 
  result: z.number().int().min(1).max(3).nullable(),
});

export type EventInput = z.infer<typeof eventSchema>;
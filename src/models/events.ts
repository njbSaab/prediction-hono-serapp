import { z } from 'zod';

export const eventSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  endAt: z.string().datetime(),
  memberA: z.string().min(1),
  memberB: z.string().min(1),
  imageMemberA: z.string().url().optional(),
  imageMemberB: z.string().url().optional(),
  imageBgDesk: z.string().url().optional().nullable(),
  imageBgMob: z.string().url().optional().nullable(),
  result: z.string().nullable(),
  eventResult: z.number().int().min(1).max(3).nullable(),
  grandPrize: z.string().min(1).nullable(),
  everyoneForPrize: z.string().min(1).nullable(),
  eventsSiteName: z.string().min(1).nullable().optional(),
});

export type EventInput = z.infer<typeof eventSchema>;

export const partialEventSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  type: z.string().min(1, 'Type is required').optional(),
  endAt: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    })
    .optional(),
  memberA: z.string().min(1, 'Member A is required').optional(),
  memberB: z.string().min(1, 'Member B is required').optional(),
  imageMemberA: z.string().url().optional().nullable(),
  imageMemberB: z.string().url().optional().nullable(),
  imageBgDesk: z.string().url().optional().nullable(),
  imageBgMob: z.string().url().optional().nullable(),
  result: z.string().nullable().optional(),
  eventResult: z.number().int().min(1).max(3).optional().nullable(),
  grandPrize: z.string().min(1, 'Grand prize is required').optional().nullable(),
  everyoneForPrize: z.string().min(1, 'Everyone for prize is required').optional().nullable(),
  eventsSiteName: z.string().min(1).nullable().optional(),
});

export type PartialEventInput = z.infer<typeof partialEventSchema>;
import { z } from 'zod';

// Схема для создания/обновления пользователя
export const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

// Схема для данных голосования
export const userEventSchema = z.object({
  userResault: z.number().int().min(1).max(3),
  userPayload: z.string().optional(),
  eventsSiteName: z.string().min(1).nullable(),
});

// Схема для частичного обновления пользователя
export const userPatchSchema = userSchema.partial();

export type UserInput = z.infer<typeof userSchema>;
export type UserPatchInput = z.infer<typeof userPatchSchema>;
export type UserEventInput = z.infer<typeof userEventSchema>;
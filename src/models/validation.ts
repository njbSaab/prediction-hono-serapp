import { z } from 'zod';

export const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  userPayload: z.string().optional(),
  userResault: z.number().int().min(1).max(3).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  userPayload: z.string().optional(),
  userResault: z.number().int().min(1).max(3).optional(),
});
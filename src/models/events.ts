import { z } from 'zod';

export const eventSchema = z.object({
  name: z.string().min(1, 'Event name is required'), // Обязательное поле, минимум 1 символ
  result: z.number().int().min(1).max(3).optional(), // Необязательное поле, целое число от 1 до 3
});

export type EventInput = z.infer<typeof eventSchema>;
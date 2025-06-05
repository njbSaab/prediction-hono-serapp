//utils/validation.ts
import { z } from 'zod';
import { createHash } from 'crypto';

export function validateEmail(email: string): boolean {
  const schema = z.string().email();
  return schema.safeParse(email).success;
}

export function validatePrediction(prediction: number): boolean {
  return [1, 2, 3].includes(prediction);
}

export function hashVerificationCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

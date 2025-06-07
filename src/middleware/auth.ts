import { Context, Next } from 'hono';
import { verify } from 'jsonwebtoken';
import type { Env } from '../utils/config';
import type { Variables } from '../types'; // Импортируйте типы

export const authMiddleware = async (
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next
) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = verify(token, c.env.JWT_SECRET) as { uuid: string; email: string };
    c.set('user', payload); // Теперь это типизировано и не вызовет ошибку
    await next();
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    return c.json({ error: 'Invalid token', details: error.message }, 401);
  }
};
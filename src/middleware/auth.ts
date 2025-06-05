import { Hono } from 'hono';
import { verify } from 'jsonwebtoken';

export const authMiddleware = async (c: Hono.Context, next: () => Promise<void>) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = verify(token, c.env.JWT_SECRET);
    c.set('user', payload);
    await next();
  } catch (err) {
    return c.json({ error: 'Invalid token' }, 401);
  }
};
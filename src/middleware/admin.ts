import { Context, Next } from 'hono';
import type { Env } from '../utils/config';

export const adminMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  const adminSecret = c.req.header('X-Admin-Secret');
  if (!adminSecret || adminSecret !== c.env.ADMIN_SECRET) {
    return c.json({ error: 'Unauthorized: Invalid admin secret' }, 401);
  }
  await next();
};


import { Context, Next } from 'hono';
import type { Env } from '../utils/config';
export const adminMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  console.log('Admin middleware triggered', {
    path: c.req.path,
    secret: c.req.header('X-Admin-Secret'),
    envSecret: c.env.ADMIN_SECRET,
  });
  const adminSecret = c.req.header('X-Admin-Secret');
  if (!adminSecret || adminSecret !== c.env.ADMIN_SECRET) {
    console.error('Unauthorized: Invalid admin secret', { provided: adminSecret, expected: c.env.ADMIN_SECRET });
    return c.json({ error: 'Unauthorized: Invalid admin secret' }, 401);
  }
  await next();
};
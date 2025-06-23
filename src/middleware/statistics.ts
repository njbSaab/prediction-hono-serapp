import { Context, Next } from 'hono';
import type { Env } from '../utils/config';

export const statisticsMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
    const verifiedHeader = c.req.header('X-Email-Verified');
    if (verifiedHeader !== 'true') {
        return c.json({ error: 'Email verification required' }, 403);
      }    
  await next();
};


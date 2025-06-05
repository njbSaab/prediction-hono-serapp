import { Hono } from 'hono';
import { logAction } from '../services/logService';

export const customLogger = () => async (c: Hono.Context, next: () => Promise<void>) => {
  const start = Date.now();
  const { method, path } = c.req;
  await next();
  const duration = Date.now() - start;
  const status = c.res.status;
  const payload = JSON.stringify({ method, path, status, duration });

  // Логируем запрос в D1
  await logAction(c.env.DB, 'request', 'http', path, payload);
};
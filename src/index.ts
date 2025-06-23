import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { HTTPException } from 'hono/http-exception';
import userRoutes from './routes/users';
import { eventsRoutes } from './routes/events';
import { adminEventsRoutes } from './routes/adminEvents';
import adminUsersRoutes from './routes/adminUsers';
import userStatistics from './routes/statistics';
import type { Env } from './utils/config';
import type { Variables } from './types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', async (c, next) => {
  console.log(`Request received: ${c.req.method} ${c.req.path}`, {
    query: c.req.query(),
    headers: {
      'X-Admin-Secret': c.req.header('X-Admin-Secret'),
      'Authorization': c.req.header('Authorization'),
    },
  });
  await next();
});

app.use('*', cors({
  origin: [
    'http://localhost:4200',
    'https://vietget.online/lp200',
    'https://vietget.online/ftl1',
    'https://vietget.online/btl1',
    'https://vietget.online',
    'http://127.0.0.1:5501'
  ],
  allowMethods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
  allowHeaders: ['Content-Type', 'X-Email-Verified', 'X-Admin-Secret', 'Authorization'],
  exposeHeaders: ['Content-Type'],
  credentials: false,
}));

app.options('*', (c) => {
  return c.body(null, 204);
});

app.use('*', logger());
app.use('*', secureHeaders());

app.get('/', (c) => c.text('Forecast API'));

// Клиентские маршруты
app.route('/events', eventsRoutes);
app.route('/users', userRoutes);

// Админские маршруты
app.route('/vietget-admin/events', adminEventsRoutes);
app.route('/vietget-admin/users', adminUsersRoutes);

// Остальные маршруты
app.route('/statistics', userStatistics);

app.onError((err, c) => {
  console.error('Global error:', err);
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;
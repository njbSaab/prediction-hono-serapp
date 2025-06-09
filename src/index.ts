import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { HTTPException } from 'hono/http-exception';
import userRoutes from './routes/users';
import type { Env } from './utils/config';
import type { Variables } from './types';
import { eventsRoutes } from './routes/events';
import userStatistics from './routes/statistics';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Настройка CORS
app.use('*', cors({
  origin: ['http://localhost:4200', 'https://vietget.online/lp200', 'https://vietget.online', 'http://127.0.0.1:5501'],
  allowMethods: ['GET', 'POST', 'OPTIONS'], // Явно указываем методы
  allowHeaders: ['Content-Type', 'X-Email-Verified'], // Разрешённые заголовки
  exposeHeaders: ['Content-Type'],
  credentials: false, // Если не используются куки
}));

app.options('*', (c) => {
  return c.body(null, 204);
});

app.use('*', logger());
app.use('*', secureHeaders());

app.get('/', (c) => c.text('Forecast API'));
app.route('/users', userRoutes);
app.route('/events', eventsRoutes);
app.route('/statistics', userStatistics);



app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;
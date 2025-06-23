import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { v4 as uuidv4 } from 'uuid';
import { sign, verify } from 'jsonwebtoken';
import { userSchema, userEventSchema } from '../models/user';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../utils/config';
import type { Variables } from '../types';
import { ContentfulStatusCode } from 'hono/utils/http-status';

const userRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Получение пользователя по UUID
userRoutes.get('/:uuid', authMiddleware, async (c) => {
  console.log('Client route triggered: GET /users/:uuid', {
    path: c.req.path,
    uuid: c.req.param('uuid'),
  });
  try {
    const uuid = c.req.param('uuid');
    const DB = c.env.DB;
    const user = await DB.prepare(`
      SELECT uuid, email, name, createdAt, emailVerified
      FROM users
      WHERE uuid = ?
    `).bind(uuid).first();
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const userEvents = await DB.prepare(`
      SELECT ue.id, ue.event_id, ue.userResault, ue.userPayload, ue.createdAt, e.eventsSiteName
      FROM user_events ue
      JOIN events e ON ue.event_id = e.id
      WHERE ue.user_uuid = ?
    `).bind(uuid).all();

    return c.json({
      ...user,
      events: userEvents.results.map(event => ({
        eventId: event.event_id,
        userResault: event.userResault,
        userPayload: event.userPayload,
        eventsSiteName: event.eventsSiteName,
        createdAt: event.createdAt,
      })),
    });
  } catch (err: any) {
    console.error('Error in GET /users/:uuid:', err);
    return c.json({ error: 'Database error', details: err.message }, 500);
  }
});

// Создание или обновление пользователя
userRoutes.post('/', zValidator('json', userSchema.merge(userEventSchema)), async (c) => {
  console.log('Client route triggered: POST /users', {
    path: c.req.path,
  });
  try {
    const verified = c.req.header('X-Email-Verified');
    if (verified !== 'true') {
      return c.json({ error: 'Email not verified' }, 403);
    }

    const data = c.req.valid('json');
    const DB = c.env.DB;
    const normalizedEventsSiteName = data.eventsSiteName ? data.eventsSiteName.replace(/^\/+|\/+$/g, '') : null;

    const existingUser = await DB.prepare('SELECT uuid FROM users WHERE email = ?')
      .bind(data.email)
      .first();

    let uuid;
    let message;
    let status;

    if (existingUser) {
      uuid = existingUser.uuid;
      await DB.prepare(`
        UPDATE users 
        SET name = ?, emailVerified = true
        WHERE email = ?
      `).bind(data.name, data.email).run();
      message = 'User updated';
      status = 200;
    } else {
      uuid = uuidv4();
      await DB.prepare(`
        INSERT INTO users (uuid, email, name, emailVerified)
        VALUES (?, ?, ?, ?)
      `).bind(uuid, data.email, data.name, true).run();
      message = 'User created';
      status = 201;
    }

    if (data.userResault && normalizedEventsSiteName) {
      const event = await DB.prepare('SELECT id FROM events WHERE eventsSiteName = ?')
        .bind(normalizedEventsSiteName)
        .first<{ id: number }>();
      if (event) {
        const existingEvent = await DB.prepare('SELECT id FROM user_events WHERE user_uuid = ? AND event_id = ?')
          .bind(uuid, event.id)
          .first();
        if (existingEvent) {
          await DB.prepare(`
            UPDATE user_events 
            SET userResault = ?, userPayload = ?
            WHERE user_uuid = ? AND event_id = ?
          `).bind(data.userResault, data.userPayload || null, uuid, event.id).run();
        } else {
          await DB.prepare(`
            INSERT INTO user_events (user_uuid, event_id, userResault, userPayload)
            VALUES (?, ?, ?, ?)
          `).bind(uuid, event.id, data.userResault, data.userPayload || null).run();
        }
      } else {
        return c.json({ error: 'Event not found for the provided eventsSiteName' }, 404);
      }
    }

    const payload = { uuid, email: data.email };
    const token = sign(payload, c.env.JWT_SECRET, { expiresIn: '21d' });

    return c.json({ message, user: { uuid, email: data.email }, token }, status as ContentfulStatusCode);
  } catch (err: any) {
    console.error('Error in POST /users:', err);
    return c.json({ error: 'Failed to process user', details: err.message }, 500);
  }
});

userRoutes.post('/refresh-token', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = verify(token, c.env.JWT_SECRET, { ignoreExpiration: true }) as { uuid: string; email: string };
    const DB = c.env.DB;
    const user = await DB.prepare('SELECT uuid, email FROM users WHERE uuid = ?').bind(payload.uuid).first();
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const newPayload = { uuid: payload.uuid, email: payload.email };
    const newToken = sign(newPayload, c.env.JWT_SECRET, { expiresIn: '7d' });

    return c.json({ token: newToken }, 200);
  } catch (err: any) {
    console.error('Error in POST /refresh-token:', err);
    return c.json({ error: 'Invalid token', details: err.message }, 401);
  }
});

export default userRoutes;
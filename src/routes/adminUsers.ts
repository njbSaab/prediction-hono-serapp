import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { v4 as uuidv4 } from 'uuid';
import { userSchema, userPatchSchema, userEventSchema } from '../models/user';
import { adminMiddleware } from '../middleware/admin';
import type { Env } from '../utils/config';
import type { Variables } from '../types';
import { ContentfulStatusCode } from 'hono/utils/http-status';

const adminUsersRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Валидация UUID
const isValidUUID = (uuid: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Получение всех пользователей (админ)
adminUsersRoutes.get('/', adminMiddleware, async (c) => {
  console.log('Admin route triggered: GET /vietget-admin/users', {
    path: c.req.path,
    query: c.req.query(),
    adminSecret: c.req.header('X-Admin-Secret'),
  });
  try {
    const DB = c.env.DB;
    let eventsSiteName = c.req.query('eventsSiteName');
    let name = c.req.query('name');
    let email = c.req.query('email');
    let query = `
      SELECT u.uuid, u.email, u.name, u.emailVerified, u.createdAt,
             ue.event_id, ue.userResault AS ue_userResault, ue.userPayload AS ue_userPayload, e.eventsSiteName
      FROM users u
      LEFT JOIN user_events ue ON u.uuid = ue.user_uuid
      LEFT JOIN events e ON ue.event_id = e.id
    `;
    let bindings: string[] = [];
    let conditions: string[] = [];

    if (eventsSiteName) {
      eventsSiteName = eventsSiteName.replace(/^\/+|\/+$/g, '');
      conditions.push('e.eventsSiteName = ?');
      bindings.push(eventsSiteName);
    }
    if (name) {
      conditions.push('u.name LIKE ?');
      bindings.push(`%${name}%`);
    }
    if (email) {
      conditions.push('u.email LIKE ?');
      bindings.push(`%${email}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await DB.prepare(query).bind(...bindings).all();
    if (result.results.length === 0) {
      return c.json({ error: 'No users found' }, 404);
    }

    // Группируем результаты по пользователям
    const usersMap = new Map();
    for (const row of result.results) {
      const userId = row.uuid;
      if (!usersMap.has(userId)) {
        usersMap.set(userId, {
          uuid: row.uuid,
          email: row.email,
          name: row.name,
          emailVerified: row.emailVerified,
          createdAt: row.createdAt,
          events: [],
        });
      }
      if (row.event_id) {
        usersMap.get(userId).events.push({
          eventId: row.event_id,
          userResault: row.ue_userResault,
          userPayload: row.ue_userPayload,
          eventsSiteName: row.eventsSiteName,
        });
      }
    }

    return c.json(Array.from(usersMap.values()));
  } catch (err: any) {
    console.error('Error in GET /vietget-admin/users:', err);
    return c.json({ error: 'Database error', details: err.message }, 500);
  }
});

// Получение пользователя по UUID (админ)
adminUsersRoutes.get('/:uuid', adminMiddleware, async (c) => {
  console.log('Admin route triggered: GET /vietget-admin/users/:uuid', {
    path: c.req.path,
    uuid: c.req.param('uuid'),
    adminSecret: c.req.header('X-Admin-Secret'),
  });
  try {
    const uuid = c.req.param('uuid');
    if (!isValidUUID(uuid)) {
      return c.json({ error: 'Invalid UUID format' }, 400);
    }
    const DB = c.env.DB;
    const user = await DB.prepare(`
      SELECT uuid, email, name, emailVerified, createdAt
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
    console.error('Error in GET /vietget-admin/users/:uuid:', err);
    return c.json({ error: 'Database error', details: err.message }, 500);
  }
});

// Создание или обновление пользователя (админ)
adminUsersRoutes.post('/', zValidator('json', userSchema.merge(userEventSchema.partial())), adminMiddleware, async (c) => {
  console.log('Admin route triggered: POST /vietget-admin/users', {
    path: c.req.path,
    adminSecret: c.req.header('X-Admin-Secret'),
  });
  try {
    const data = c.req.valid('json');
    const DB = c.env.DB;
    const normalizedEventsSiteName = data.eventsSiteName ? data.eventsSiteName.replace(/^\/+|\/+$/g, '') : null;

    const existingUser = await DB.prepare('SELECT uuid, email FROM users WHERE email = ?').bind(data.email).first();

    let uuid: string;
    let message: string;
    let status: ContentfulStatusCode;

    if (existingUser) {
      uuid = String(existingUser.uuid);
      await DB.prepare(`
        UPDATE users 
        SET name = ?, emailVerified = ?
        WHERE email = ?
      `).bind(data.name, true, data.email).run();
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

    if (data.userResault != null && normalizedEventsSiteName) {
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

    const user = await DB.prepare(`
      SELECT uuid, email, name, emailVerified, createdAt
      FROM users WHERE uuid = ?
    `).bind(uuid).first();
    return c.json({ message, user: user || null }, status);
  } catch (err: any) {
    console.error('Error in POST /vietget-admin/users:', err);
    return c.json({ error: 'Failed to process user', details: err.message }, 500);
  }
});

// Частичное обновление пользователя (админ)
adminUsersRoutes.patch('/:uuid', zValidator('json', userPatchSchema.merge(userEventSchema.partial())), adminMiddleware, async (c) => {
  console.log('Admin route triggered: PATCH /vietget-admin/users/:uuid', {
    path: c.req.path,
    uuid: c.req.param('uuid'),
    adminSecret: c.req.header('X-Admin-Secret'),
  });
  try {
    const uuid = c.req.param('uuid');
    if (!isValidUUID(uuid)) {
      return c.json({ error: 'Invalid UUID format' }, 400);
    }

    const data = c.req.valid('json');
    const DB = c.env.DB;

    const existingUser = await DB.prepare('SELECT uuid FROM users WHERE uuid = ?').bind(uuid).first();
    if (!existingUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    const normalizedEventsSiteName = data.eventsSiteName
      ? data.eventsSiteName.replace(/^\/+|\/+$/g, '')
      : undefined;

    const fields: string[] = [];
    const values: (string | number | boolean | null)[] = [];

    if (data.email !== undefined) {
      const emailExists = await DB.prepare('SELECT uuid FROM users WHERE email = ? AND uuid != ?')
        .bind(data.email, uuid)
        .first();
      if (emailExists) {
        return c.json({ error: 'Email already in use' }, 400);
      }
      fields.push('email = ?');
      values.push(data.email);
    }
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }

    if (fields.length > 0) {
      const query = `UPDATE users SET ${fields.join(', ')} WHERE uuid = ?`;
      values.push(uuid);
      await DB.prepare(query).bind(...values).run();
    }

    if (data.userResault != null && normalizedEventsSiteName) {
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

    const updatedUser = await DB.prepare(`
      SELECT uuid, email, name, emailVerified, createdAt
      FROM users WHERE uuid = ?
    `).bind(uuid).first();

    return c.json({ message: 'User updated', user: updatedUser || null }, 200);
  } catch (err: any) {
    console.error('Error in PATCH /vietget-admin/users/:uuid:', err);
    return c.json({ error: 'Database error', details: err.message }, 500);
  }
});

// Удаление пользователя по UUID (админ)
adminUsersRoutes.delete('/:uuid', adminMiddleware, async (c) => {
  console.log('Admin route triggered: DELETE /vietget-admin/users/:uuid', {
    path: c.req.path,
    uuid: c.req.param('uuid'),
    adminSecret: c.req.header('X-Admin-Secret'),
  });
  try {
    const uuid = c.req.param('uuid');
    if (!isValidUUID(uuid)) {
      return c.json({ error: 'Invalid UUID format' }, 400);
    }
    const DB = c.env.DB;

    const user = await DB.prepare('SELECT uuid FROM users WHERE uuid = ?').bind(uuid).first();
    if (!user) return c.json({ error: 'User not found' }, 404);

    await DB.prepare('DELETE FROM user_events WHERE user_uuid = ?').bind(uuid).run();
    await DB.prepare('DELETE FROM users WHERE uuid = ?').bind(uuid).run();

    return c.json({ message: 'User deleted', uuid }, 200);
  } catch (err: any) {
    console.error('Error in DELETE /vietget-admin/users/:uuid:', err);
    return c.json({ error: 'Database error', details: err.message }, 500);
  }
});

export default adminUsersRoutes;

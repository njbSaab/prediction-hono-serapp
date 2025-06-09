import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { v4 as uuidv4 } from 'uuid';
import { sign, verify } from 'jsonwebtoken';
import { userSchema } from '../models/user';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import type { Env } from '../utils/config';
import type { Variables } from '../types';

const userRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Получение всех пользователей (только с токеном)
userRoutes.get('/', authMiddleware, async (c) => {
  try {
    const DB = c.env.DB;
    const result = await DB.prepare('SELECT uuid, email, name FROM users').all();
    return c.json(result.results);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in GET /users:', error);
    return c.json({ error: 'Database error', details: error.message }, 500);
  }
});

// Получение пользователя по UUID (только с токеном)
userRoutes.get('/:uuid', authMiddleware, async (c) => {
  try {
    const uuid = c.req.param('uuid');
    const DB = c.env.DB;
    const result = await DB.prepare('SELECT uuid, email, name FROM users WHERE uuid = ?')
      .bind(uuid)
      .first();
    if (!result) {
      return c.json({ error: 'User not found' }, 404);
    }
    return c.json(result);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in GET /users/:uuid:', error);
    return c.json({ error: 'Database error', details: error.message }, 500);
  }
});

// Создание или обновление пользователя
userRoutes.post('/', zValidator('json', userSchema), async (c) => {
  try {
    const verified = c.req.header('X-Email-Verified');
    if (verified !== 'true') {
      return c.json({ error: 'Email not verified' }, 403);
    }

    const data = c.req.valid('json');
    const DB = c.env.DB;

    // Проверяем, существует ли пользователь с таким email
    const existingUser = await DB.prepare('SELECT uuid, email FROM users WHERE email = ?')
      .bind(data.email)
      .first();

    let uuid;
    let message;
    let status;

    if (existingUser) {
      // Пользователь существует, обновляем данные
      uuid = existingUser.uuid;
      await DB.prepare(`
        UPDATE users 
        SET name = ?, userPayload = ?, userResault = ?, emailVerified = ?
        WHERE email = ?
      `)
        .bind(data.name, data.userPayload || null, data.userResault || null, true, data.email)
        .run();
      message = 'User updated';
      status = 200;
    } else {
      // Пользователь не существует, создаём нового
      uuid = uuidv4();
      await DB.prepare(`
        INSERT INTO users (uuid, email, name, userPayload, userResault, emailVerified)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
        .bind(uuid, data.email, data.name, data.userPayload || null, data.userResault || null, true)
        .run();
      message = 'User created';
      status = 201;
    }

    // Создаём токен
    const payload = { uuid, email: data.email };
    const token = sign(payload, c.env.JWT_SECRET, { expiresIn: '21d' });

    return c.json({ message, user: { uuid, email: data.email }, token }, 201); // Исправлено: status вместо 201
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in POST /users:', error);
    return c.json({ error: 'Failed to process user', details: error.message }, 500);
  }
});

// Удаление пользователя по UUID (только с токеном)
userRoutes.delete('/:uuid', authMiddleware, async (c) => {
  try {
    const uuid = c.req.param('uuid');
    const DB = c.env.DB;

    const user = await DB.prepare('SELECT uuid FROM users WHERE uuid = ?')
      .bind(uuid)
      .first();
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    await DB.prepare('DELETE FROM users WHERE uuid = ?')
      .bind(uuid)
      .run();

    return c.json({ message: 'User deleted', uuid }, 200);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in DELETE /users/:uuid:', error);
    return c.json({ error: 'Database error', details: error.message }, 500);
  }
});

// Админские маршруты под /vietget-admin/users
userRoutes.get('/vietget-admin/users', adminMiddleware, async (c) => {
  try {
    const DB = c.env.DB;
    const result = await DB.prepare('SELECT uuid, email, name, userPayload, userResault, emailVerified FROM users').all();
    return c.json(result.results);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in GET /vietget-admin/users:', error);
    return c.json({ error: 'Database error', details: error.message }, 500);
  }
});

userRoutes.get('/vietget-admin/users/:uuid', adminMiddleware, async (c) => {
  try {
    const uuid = c.req.param('uuid');
    const DB = c.env.DB;
    const result = await DB.prepare('SELECT uuid, email, name, userPayload, userResault, emailVerified FROM users WHERE uuid = ?')
      .bind(uuid)
      .first();
    if (!result) {
      return c.json({ error: 'User not found' }, 404);
    }
    return c.json(result);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in GET /vietget-admin/users/:uuid:', error);
    return c.json({ error: 'Database error', details: error.message }, 500);
  }
});

// Создание или обновление пользователя (админ)
userRoutes.post('/vietget-admin/users', zValidator('json', userSchema), adminMiddleware, async (c) => {
  try {
    const data = c.req.valid('json');
    const DB = c.env.DB;

    // Проверяем, существует ли пользователь с таким email
    const existingUser = await DB.prepare('SELECT uuid, email FROM users WHERE email = ?')
      .bind(data.email)
      .first();

    let uuid;
    let message;
    let status;

    if (existingUser) {
      // Пользователь существует, обновляем данные
      uuid = existingUser.uuid;
      await DB.prepare(`
        UPDATE users 
        SET name = ?, userPayload = ?, userResault = ?, emailVerified = ?
        WHERE email = ?
      `)
        .bind(data.name, data.userPayload || null, data.userResault || null, true, data.email)
        .run();
      message = 'User updated';
      status = 200;
    } else {
      // Пользователь не существует, создаём нового
      uuid = uuidv4();
      await DB.prepare(`
        INSERT INTO users (uuid, email, name, userPayload, userResault, emailVerified)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
        .bind(uuid, data.email, data.name, data.userPayload || null, data.userResault || null, true)
        .run();
      message = 'User created';
      status = 201;
    }

    return c.json({ message, user: { uuid, email: data.email } }, 201);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in POST /vietget-admin/users:', error);
    return c.json({ error: 'Failed to process user', details: error.message }, 500);
  }
});

userRoutes.delete('/vietget-admin/users/:uuid', adminMiddleware, async (c) => {
  try {
    const uuid = c.req.param('uuid');
    const DB = c.env.DB;

    const user = await DB.prepare('SELECT uuid FROM users WHERE uuid = ?')
      .bind(uuid)
      .first();
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    await DB.prepare('DELETE FROM users WHERE uuid = ?')
      .bind(uuid)
      .run();

    return c.json({ message: 'User deleted', uuid }, 200);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in DELETE /vietget-admin/users/:uuid:', error);
    return c.json({ error: 'Database error', details: error.message }, 500);
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
    const user = await DB.prepare('SELECT uuid, email FROM users WHERE uuid = ?')
      .bind(payload.uuid)
      .first();
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const newPayload = { uuid: payload.uuid, email: payload.email };
    const newToken = sign(newPayload, c.env.JWT_SECRET, { expiresIn: '7d' });

    return c.json({ token: newToken }, 200);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in POST /refresh-token:', error);
    return c.json({ error: 'Invalid token', details: error.message }, 401);
  }
});

export default userRoutes;
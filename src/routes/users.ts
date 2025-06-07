import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { v4 as uuidv4 } from 'uuid';
import { sign } from 'jsonwebtoken';
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

// Создание пользователя с токеном
userRoutes.post('/', zValidator('json', userSchema), async (c) => {
  try {
    const verified = c.req.header('X-Email-Verified');
    if (verified !== 'true') {
      return c.json({ error: 'Email not verified' }, 403);
    }

    const data = c.req.valid('json');
    const DB = c.env.DB;
    const uuid = uuidv4();

    await DB.prepare(`
      INSERT INTO users (uuid, email, name, userPayload, userResault, emailVerified)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
      .bind(uuid, data.email, data.name, data.userPayload || null, data.userResault || null, true)
      .run();

    const payload = { uuid, email: data.email };
    const token = sign(payload, c.env.JWT_SECRET, { expiresIn: '7d' });

    return c.json({ message: 'User created', user: { uuid, email: data.email }, token }, 201);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in POST /users:', error);
    return c.json({ error: 'Failed to create user', details: error.message }, 500);
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
// Получение всех пользователей (админ, без токена, с секретным заголовком)
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

// Получение пользователя по UUID (админ, без токена, с секретным заголовком)
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

// Создание пользователя (админ, без токена, с секретным заголовком)
userRoutes.post('/vietget-admin/users', zValidator('json', userSchema), adminMiddleware, async (c) => {
  try {
    const data = c.req.valid('json');
    const DB = c.env.DB;
    const uuid = uuidv4();

    await DB.prepare(`
      INSERT INTO users (uuid, email, name, userPayload, userResault, emailVerified)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
      .bind(uuid, data.email, data.name, data.userPayload || null, data.userResault || null, true)
      .run();

    return c.json({ message: 'User created', user: { uuid, email: data.email } }, 201);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in POST /vietget-admin/users:', error);
    return c.json({ error: 'Failed to create user', details: error.message }, 500);
  }
});

// Удаление пользователя по UUID (админ, без токена, с секретным заголовком)
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

export default userRoutes;
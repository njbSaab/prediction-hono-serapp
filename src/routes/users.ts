import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createUser, getUser, getUsers, updateUser, deleteUser } from '../services/userService';
import { authMiddleware } from '../middleware/auth';

const userRoutes = new Hono();

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  userPayload: z.string().optional(), // JSON с метаданными
  userResault: z.number().int().min(1).max(3).optional(), // 1=win1, 2=win2, 3=draw
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  userPayload: z.string().optional(),
  userResault: z.number().int().min(1).max(3).optional(),
});

// Создание пользователя
userRoutes.post('/', zValidator('json', userSchema), async (c) => {
  const data = c.req.valid('json');
  const DB = c.env.DB;
  const user = await createUser(DB, data);
  return c.json({ message: 'User created', user }, 201);
});

// Получение всех пользователей (админ)
userRoutes.get('/', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const DB = c.env.DB;
  const users = await getUsers(DB);
  return c.json(users);
});

// Получение пользователя по UUID
userRoutes.get('/:uuid', authMiddleware, async (c) => {
  const uuid = c.req.param('uuid');
  const DB = c.env.DB;
  const user = await getUser(DB, uuid);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
  return c.json(user);
});

// Обновление пользователя
userRoutes.patch('/:uuid', authMiddleware, zValidator('json', updateUserSchema), async (c) => {
  const uuid = c.req.param('uuid');
  const data = c.req.valid('json');
  const DB = c.env.DB;
  const user = await updateUser(DB, uuid, data);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
  return c.json({ message: 'User updated', user });
});

// Удаление пользователя
userRoutes.delete('/:uuid', authMiddleware, async (c) => {
  const uuid = c.req.param('uuid');
  const DB = c.env.DB;
  const success = await deleteUser(DB, uuid);
  if (!success) {
    return c.json({ error: 'User not found' }, 404);
  }
  return c.json({ message: 'User deleted' });
});

export default userRoutes;
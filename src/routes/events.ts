import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eventSchema } from '../models/events';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import type { Env } from '../utils/config';
import type { Variables } from '../types';

const eventsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Получение всех событий (без токена)
eventsRoutes.get('/', async (c) => {
  try {
    const DB = c.env.DB;
    const result = await DB.prepare(`
      SELECT id, name, type, endAt, memberA, memberB, imageMemberA, imageMemberB, result, createdAt FROM events
    `).all();
    return c.json(result.results);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in GET /events:', error);
    return c.json({ error: 'Database error', details: error.message }, 500);
  }
});

// Получение события по ID (без токена)
eventsRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const DB = c.env.DB;
    const result = await DB.prepare(`
      SELECT id, name, type, endAt, memberA, memberB, imageMemberA, imageMemberB, result, createdAt FROM events WHERE id = ?
    `).bind(id).first();
    if (!result) {
      return c.json({ error: 'Event not found' }, 404);
    }
    return c.json(result);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in GET /events/:id:', error);
    return c.json({ error: 'Database error', details: error.message }, 500);
  }
});

// Получение всех событий (админ, через X-Admin-Secret)
eventsRoutes.get('/vietget-admin/events', adminMiddleware, async (c) => {
  try {
    const DB = c.env.DB;
    const result = await DB.prepare(`
      SELECT id, name, type, endAt, memberA, memberB, imageMemberA, imageMemberB, result, createdAt FROM events
    `).all();
    return c.json(result.results);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in GET /vietget-admin/events:', error);
    return c.json({ error: 'Database error', details: error.message }, 500);
  }
});

// Получение события по ID (админ, через X-Admin-Secret)
eventsRoutes.get('/vietget-admin/events/:id', adminMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const DB = c.env.DB;
    const result = await DB.prepare(`
      SELECT id, name, type, endAt, memberA, memberB, imageMemberA, imageMemberB, result, createdAt FROM events WHERE id = ?
    `).bind(id).first();
    if (!result) {
      return c.json({ error: 'Event not found' }, 404);
    }
    return c.json(result);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in GET /vietget-admin/events/:id:', error);
    return c.json({ error: 'Database error', details: error.message }, 500);
  }
});

// Создание события (админ, через X-Admin-Secret)
eventsRoutes.post('/vietget-admin/events', zValidator('json', eventSchema), adminMiddleware, async (c) => {
  try {
    const data = c.req.valid('json');
    const DB = c.env.DB;

    const result = await DB.prepare(`
      INSERT INTO events (name, type, endAt, memberA, memberB, imageMemberA, imageMemberB, result)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.name,
      data.type,
      data.endAt,
      data.memberA,
      data.memberB,
      data.imageMemberA || null,
      data.imageMemberB || null,
      data.result || null
    ).run();

    const eventId = result.meta.last_row_id;

    return c.json({
      message: 'Event created',
      event: {
        id: eventId,
        name: data.name,
        type: data.type,
        endAt: data.endAt,
        memberA: data.memberA,
        memberB: data.memberB,
        imageMemberA: data.imageMemberA || null,
        imageMemberB: data.imageMemberB || null,
        result: data.result || null
      }
    }, 201);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in POST /vietget-admin/events:', error);
    return c.json({ error: 'Failed to create event', details: error.message }, 500);
  }
});

// Редактирование события по ID (админ, через X-Admin-Secret, метод POST)
eventsRoutes.post('/vietget-admin/events/:id', zValidator('json', eventSchema), adminMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const data = c.req.valid('json');
    const DB = c.env.DB;

    // Проверяем, существует ли событие
    const event = await DB.prepare('SELECT id FROM events WHERE id = ?').bind(id).first();
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }

    // Обновляем событие
    await DB.prepare(`
      UPDATE events
      SET name = ?, type = ?, endAt = ?, memberA = ?, memberB = ?, imageMemberA = ?, imageMemberB = ?, result = ?
      WHERE id = ?
    `).bind(
      data.name,
      data.type,
      data.endAt,
      data.memberA,
      data.memberB,
      data.imageMemberA || null,
      data.imageMemberB || null,
      data.result || null,
      id
    ).run();

    return c.json({
      message: 'Event updated',
      event: {
        id,
        name: data.name,
        type: data.type,
        endAt: data.endAt,
        memberA: data.memberA,
        memberB: data.memberB,
        imageMemberA: data.imageMemberA || null,
        imageMemberB: data.imageMemberB || null,
        result: data.result || null
      }
    }, 200);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in POST /vietget-admin/events/:id:', error);
    return c.json({ error: 'Database error', details: error.message }, 500);
  }
});

// Удаление события по ID (админ, через X-Admin-Secret)
eventsRoutes.delete('/vietget-admin/events/:id', adminMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const DB = c.env.DB;

    // Проверяем, существует ли событие
    const event = await DB.prepare('SELECT id FROM events WHERE id = ?').bind(id).first();
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }

    await DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run();

    return c.json({ message: 'Event deleted', id }, 200);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in DELETE /vietget-admin/events/:id:', error);
    return c.json({ error: 'Database error', details: error.message }, 500);
  }
});

export { eventsRoutes };
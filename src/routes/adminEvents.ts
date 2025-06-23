import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eventSchema, partialEventSchema } from '../models/events';
import { adminMiddleware } from '../middleware/admin';
import type { Env } from '../utils/config';
import type { Variables } from '../types';

const adminEventsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Получение событий для админов
adminEventsRoutes.get('/', adminMiddleware, async (c) => {
  console.log('Admin route triggered: GET /vietget-admin/events', {
    path: c.req.path,
    query: c.req.query(),
    adminSecret: c.req.header('X-Admin-Secret'),
  });
  try {
    const DB = c.env.DB;
    const eventsSiteName = c.req.query('eventsSiteName');
    const name = c.req.query('name');
    const eventsParam = c.req.query('events');
    let query = `
      SELECT id, name, type, endAt, memberA, memberB, imageMemberA, imageMemberB, imageBgDesk, imageBgMob, result, eventResult, grandPrize, everyoneForPrize, eventsSiteName, createdAt
      FROM events
    `;
    let bindings: string[] = [];
    let conditions: string[] = [];

    if (eventsSiteName && !eventsParam) {
      const normalizedEventsSiteName = eventsSiteName.replace(/^\/+|\/+$/g, '');
      conditions.push('eventsSiteName = ?');
      bindings.push(normalizedEventsSiteName);
    }

    if (name) {
      conditions.push('name LIKE ?');
      bindings.push(`%${name}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await DB.prepare(query).bind(...bindings).all();
    if (result.results.length === 0) {
      return c.json({ error: 'No events found' }, 404);
    }

    return c.json(result.results);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in GET /vietget-admin/events:', error);
    return c.json({ error: 'Database error', details: error.message }, 500);
  }
});

// Получение события по ID
adminEventsRoutes.get('/:id', adminMiddleware, async (c) => {
  console.log('Admin route triggered: GET /vietget-admin/events/:id', {
    path: c.req.path,
    id: c.req.param('id'),
    adminSecret: c.req.header('X-Admin-Secret'),
  });
  try {
    const id = c.req.param('id');
    const DB = c.env.DB;
    const result = await DB.prepare(`
      SELECT id, name, type, endAt, memberA, memberB, imageMemberA, imageMemberB, imageBgDesk, imageBgMob, result, eventResult, grandPrize, everyoneForPrize, eventsSiteName, createdAt
      FROM events WHERE id = ?
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

// Создание события
adminEventsRoutes.post('/', zValidator('json', eventSchema), adminMiddleware, async (c) => {
  console.log('Admin route triggered: POST /vietget-admin/events', {
    path: c.req.path,
    adminSecret: c.req.header('X-Admin-Secret'),
  });
  try {
    const data = c.req.valid('json');
    const DB = c.env.DB;
    const normalizedEventsSiteName = data.eventsSiteName ? data.eventsSiteName.replace(/^\/+|\/+$/g, '') : null;

    const result = await DB.prepare(`
      INSERT INTO events (name, type, endAt, memberA, memberB, imageMemberA, imageMemberB, imageBgDesk, imageBgMob, result, eventResult, grandPrize, everyoneForPrize, eventsSiteName)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.name,
      data.type,
      data.endAt,
      data.memberA,
      data.memberB,
      data.imageMemberA || null,
      data.imageMemberB || null,
      data.imageBgDesk || null,
      data.imageBgMob || null,
      data.result || null,
      data.eventResult || null,
      data.grandPrize || null,
      data.everyoneForPrize || null,
      normalizedEventsSiteName
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
        imageBgDesk: data.imageBgDesk || null,
        imageBgMob: data.imageBgMob || null,
        result: data.result || null,
        eventResult: data.eventResult || null,
        grandPrize: data.grandPrize || null,
        everyoneForPrize: data.everyoneForPrize || null,
        eventsSiteName: normalizedEventsSiteName
      }
    }, 201);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in POST /vietget-admin/events:', error);
    return c.json({ error: 'Failed to create event', details: error.message }, 500);
  }
});

// Обновление события
adminEventsRoutes.patch('/:id', zValidator('json', partialEventSchema), adminMiddleware, async (c) => {
  console.log('Admin route triggered: PATCH /vietget-admin/events/:id', {
    path: c.req.path,
    id: c.req.param('id'),
    adminSecret: c.req.header('X-Admin-Secret'),
  });
  try {
    const id = c.req.param('id');
    const data = c.req.valid('json');
    console.log('Received PATCH data:', data);
    const DB = c.env.DB;

    const event = await DB.prepare('SELECT id FROM events WHERE id = ?').bind(id).first();
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }

    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.type !== undefined) {
      fields.push('type = ?');
      values.push(data.type);
    }
    if (data.endAt !== undefined) {
      fields.push('endAt = ?');
      values.push(data.endAt);
    }
    if (data.memberA !== undefined) {
      fields.push('memberA = ?');
      values.push(data.memberA);
    }
    if (data.memberB !== undefined) {
      fields.push('memberB = ?');
      values.push(data.memberB);
    }
    if (data.imageMemberA !== undefined) {
      fields.push('imageMemberA = ?');
      values.push(data.imageMemberA);
    }
    if (data.imageMemberB !== undefined) {
      fields.push('imageMemberB = ?');
      values.push(data.imageMemberB);
    }
    if (data.imageBgDesk !== undefined) {
      fields.push('imageBgDesk = ?');
      values.push(data.imageBgDesk);
    }
    if (data.imageBgMob !== undefined) {
      fields.push('imageBgMob = ?');
      values.push(data.imageBgMob);
    }
    if (data.result !== undefined) {
      fields.push('result = ?');
      values.push(data.result);
    }
    if (data.eventResult !== undefined) {
      fields.push('eventResult = ?');
      values.push(data.eventResult);
    }
    if (data.grandPrize !== undefined) {
      fields.push('grandPrize = ?');
      values.push(data.grandPrize);
    }
    if (data.everyoneForPrize !== undefined) {
      fields.push('everyoneForPrize = ?');
      values.push(data.everyoneForPrize);
    }
    if (data.eventsSiteName !== undefined) {
      fields.push('eventsSiteName = ?');
      values.push(data.eventsSiteName ? data.eventsSiteName.replace(/^\/+|\/+$/g, '') : null);
    }

    if (fields.length === 0) {
      return c.json({ error: 'No fields provided for update' }, 400);
    }

    values.push(id);
    const query = `
      UPDATE events
      SET ${fields.join(', ')}
      WHERE id = ?
    `;
    console.log('Executing query:', query, 'with values:', values);

    await DB.prepare(query).bind(...values).run();

    const updatedEvent = await DB.prepare(`
      SELECT id, name, type, endAt, memberA, memberB, imageMemberA, imageMemberB, imageBgDesk, imageBgMob, result, eventResult, grandPrize, everyoneForPrize, eventsSiteName, createdAt
      FROM events WHERE id = ?
    `).bind(id).first();

    return c.json({
      message: 'Event updated',
      event: updatedEvent,
    }, 200);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in PATCH /vietget-admin/events/:id:', error);
    return c.json({ error: 'Database error', details: error.message }, 500);
  }
});

// Удаление события
adminEventsRoutes.delete('/:id', adminMiddleware, async (c) => {
  console.log('Admin route triggered: DELETE /vietget-admin/events/:id', {
    path: c.req.path,
    id: c.req.param('id'),
    adminSecret: c.req.header('X-Admin-Secret'),
  });
  try {
    const id = c.req.param('id');
    const DB = c.env.DB;

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

export { adminEventsRoutes };

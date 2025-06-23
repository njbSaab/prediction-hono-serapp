import { Hono } from 'hono';
import type { Env } from '../utils/config';
import type { Variables } from '../types';

const eventsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Получение событий для клиентов
eventsRoutes.get('/', async (c) => {
  console.log('Client route triggered: GET /events', {
    path: c.req.path,
    query: c.req.query(),
  });
  try {
    const DB = c.env.DB;
    const eventsSiteName = c.req.query('eventsSiteName');

    if (!eventsSiteName) {
      return c.json({ error: 'eventsSiteName query parameter is required' }, 400);
    }

    const normalizedEventsSiteName = eventsSiteName.replace(/^\/+|\/+$/g, '');
    const query = `
      SELECT id, name, type, endAt, memberA, memberB, imageMemberA, imageMemberB, imageBgDesk, imageBgMob, result, eventResult, grandPrize, everyoneForPrize, eventsSiteName, createdAt
      FROM events
      WHERE eventsSiteName = ?
    `;
    const result = await DB.prepare(query).bind(normalizedEventsSiteName).all();

    if (result.results.length === 0) {
      return c.json({ error: 'No events found for the specified eventsSiteName' }, 404);
    }

    return c.json(result.results);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in GET /events (client):', error);
    return c.json({ error: 'Database error', details: error.message }, 500);
  }
});

// Получение события по ID для клиентов
eventsRoutes.get('/:id', async (c) => {
  console.log('Client route triggered: GET /events/:id', {
    path: c.req.path,
    id: c.req.param('id'),
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
    console.error('Error in GET /events/:id (client):', error);
    return c.json({ error: 'Database error', details: error.message }, 500);
  }
});

export { eventsRoutes };
import { Hono } from 'hono';
import { createEvent, getEvent, getEvents, updateEvent, deleteEvent } from '../services/eventService';
import { authMiddleware } from '../middleware/auth';

const eventRoutes = new Hono();

// Создание события (админ)
eventRoutes.post('/', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const data = await c.req.json();
  const DB = c.env.DB;
  const event = await createEvent(DB, data);
  return c.json({ message: 'Event created', event }, 201);
});

// Получение всех событий
eventRoutes.get('/', async (c) => {
  const DB = c.env.DB;
  const events = await getEvents(DB);
  return c.json(events);
});

// Получение события по ID
eventRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const DB = c.env.DB;
  const event = await getEvent(DB, id);
  if (!event) {
    return c.json({ error: 'Event not found' }, 404);
  }
  return c.json(event);
});

// Обновление события (админ)
eventRoutes.patch('/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const id = c.req.param('id');
  const data = await c.req.json();
  const DB = c.env.DB;
  const event = await updateEvent(DB, id, data);
  if (!event) {
    return c.json({ error: 'Event not found' }, 404);
  }
  return c.json({ message: 'Event updated', event });
});

// Удаление события (админ)
eventRoutes.delete('/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const id = c.req.param('id');
  const DB = c.env.DB;
  const success = await deleteEvent(DB, id);
  if (!success) {
    return c.json({ error: 'Event not found' }, 404);
  }
  return c.json({ message: 'Event deleted' });
});

export default eventRoutes;
import { D1Database } from '@cloudflare/workers-types';
import { logAction } from './logService';

interface EventInput {
  name: string;
  result?: number;
}

export async function createEvent(DB: D1Database, input: EventInput) {
  const result = await DB.prepare(`
    INSERT INTO events (name, result)
    VALUES (?, ?)
  `)
    .bind(input.name, input.result || null)
    .run();

  const event = await getEvent(DB, result.meta.last_row_id);
  await logAction(DB, 'create_event', 'event', event.id.toString(), JSON.stringify(input));
  return event;
}

export async function getEvents(DB: D1Database) {
  const result = await DB.prepare('SELECT id, name, result FROM events').all();
  await logAction(DB, 'get_events', 'event', 'all', null);
  return result.results;
}

export async function getEvent(DB: D1Database, id: string) {
  const event = await DB.prepare('SELECT id, name, result FROM events WHERE id = ?')
    .bind(id)
    .first();
  await logAction(DB, 'get_event', 'event', id, null);
  return event;
}

export async function updateEvent(DB: D1Database, id: string, input: Partial<EventInput>) {
  const existingEvent = await getEvent(DB, id);
  if (!existingEvent) return null;

  const updates = [];
  const values = [];
  if (input.name) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.result !== undefined) {
    updates.push('result = ?');
    values.push(input.result);
  }

  if (updates.length === 0) return existingEvent;

  values.push(id);
  await DB.prepare(`
    UPDATE events
    SET ${updates.join(', ')}
    WHERE id = ?
  `)
    .bind(...values)
    .run();

  await logAction(DB, 'update_event', 'event', id, JSON.stringify(input));
  return getEvent(DB, id);
}

export async function deleteEvent(DB: D1Database, id: string) {
  const existingEvent = await getEvent(DB, id);
  if (!existingEvent) return false;

  await DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run();
  await logAction(DB, 'delete_event', 'event', id, null);
  return true;
}
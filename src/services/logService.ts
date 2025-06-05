import { D1Database } from '@cloudflare/workers-types';

export async function logAction(
  DB: D1Database,
  action: string,
  entityType: string,
  entityId: string,
  payload: string | null
) {
  await DB.prepare(`
    INSERT INTO logs (action, entityType, entityId, payload)
    VALUES (?, ?, ?, ?)
  `)
    .bind(action, entityType, entityId, payload)
    .run();
}
import { D1Database } from '@cloudflare/workers-types';

export async function initDB(DB: D1Database) {
  console.log('Database initialized');
}
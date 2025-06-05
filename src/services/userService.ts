import { D1Database } from '@cloudflare/workers-types';
import { v4 as uuidv4 } from 'uuid';
import { logAction } from './logService';

interface UserInput {
  email: string;
  name: string;
  userPayload?: string;
  userResault?: number;
}

export async function createUser(DB: D1Database, input: UserInput) {
  const uuid = uuidv4();
  const user = {
    uuid,
    email: input.email,
    name: input.name,
    userPayload: input.userPayload || null,
    userResault: input.userResault || null,
  };

  await DB.prepare(`
    INSERT INTO users (uuid, email, name, userPayload, userResault)
    VALUES (?, ?, ?, ?, ?)
  `)
    .bind(uuid, input.email, input.name, user.userPayload, user.userResault)
    .run();

  await logAction(DB, 'create_user', 'user', uuid, JSON.stringify(input));
  return user;
}

export async function getUsers(DB: D1Database) {
  const result = await DB.prepare(`
    SELECT uuid, email, name, userPayload, userResault, isCorrectAnswer
    FROM users
  `).all();
  await logAction(DB, 'get_users', 'user', 'all', null);
  return result.results;
}

export async function getUser(DB: D1Database, uuid: string) {
  const user = await DB.prepare(`
    SELECT uuid, email, name, userPayload, userResault, isCorrectAnswer
    FROM users WHERE uuid = ?
  `)
    .bind(uuid)
    .first();
  await logAction(DB, 'get_user', 'user', uuid, null);
  return user;
}

export async function updateUser(DB: D1Database, uuid: string, input: Partial<UserInput>) {
  const existingUser = await getUser(DB, uuid);
  if (!existingUser) return null;

  const updates = [];
  const values = [];
  if (input.name) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.userPayload) {
    updates.push('userPayload = ?');
    values.push(input.userPayload);
  }
  if (input.userResault !== undefined) {
    updates.push('userResault = ?');
    values.push(input.userResault);
  }

  if (updates.length === 0) return existingUser;

  values.push(uuid);
  await DB.prepare(`
    UPDATE users
    SET ${updates.join(', ')}
    WHERE uuid = ?
  `)
    .bind(...values)
    .run();

  await logAction(DB, 'update_user', 'user', uuid, JSON.stringify(input));
  return getUser(DB, uuid);
}

export async function deleteUser(DB: D1Database, uuid: string) {
  const existingUser = await getUser(DB, uuid);
  if (!existingUser) return false;

  await DB.prepare('DELETE FROM users WHERE uuid = ?').bind(uuid).run();
  await logAction(DB, 'delete_user', 'user', uuid, null);
  return true;
}
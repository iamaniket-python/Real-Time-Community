import { AppError } from './AppError.js';

// The timestamp travels as TEXT so Postgres's microseconds survive the round trip
export const encodeCursor = (ts, id) => Buffer.from(`${ts}|${id}`).toString('base64url');

const TS_RE = /^\d{4}-\d{2}-\d{2}[ T][0-9:.+\-Z]+$/;
const UUID_RE = /^[0-9a-f-]{36}$/i;

export function decodeCursor(cursor) {
  try {
    const [ts, id] = Buffer.from(cursor, 'base64url').toString().split('|');
    if (!TS_RE.test(ts) || !UUID_RE.test(id)) throw new Error('bad');
    return { ts, id };
  } catch {
    throw new AppError(400, 'INVALID_CURSOR', 'Invalid pagination cursor');
  }
}
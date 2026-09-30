import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { emitToUser } from './io.js';

const PRESENCE_GRACE_MS = 10_000; // ignore reconnects faster than this
const sockets = new Map(); // userId -> number of open sockets (in memory: single instance only)
const timers = new Map();  // userId -> { presence, availability }

export const isOnline = (userId) => (sockets.get(userId) ?? 0) > 0;

/** The helper's current job, if any. The partial unique index guarantees at most one. */
export async function activeJob(helperId) {
  const { rows } = await query(
    `SELECT id, user_id, lat, lng FROM help_requests
      WHERE accepted_helper_id = $1 AND status IN ('ACCEPTED','ARRIVING','IN_PROGRESS')
      LIMIT 1`, [helperId]);
  return rows[0] ?? null;
}

async function announce(user, event) {
  try {
    const job = await activeJob(user.helperId);
    if (job) emitToUser(job.user_id, event, { requestId: job.id, at: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, 'presence announce failed');
  }
}

const clearTimers = (userId) => {
  const t = timers.get(userId);
  if (t) { clearTimeout(t.presence); clearTimeout(t.availability); timers.delete(userId); }
};

export function markConnected(user) {
  const n = (sockets.get(user.id) ?? 0) + 1;
  sockets.set(user.id, n);
  if (user.helperId) {
    clearTimers(user.id);
    if (n === 1) void announce(user, 'helper:online');
  }
}

export function markDisconnected(user) {
  const n = Math.max(0, (sockets.get(user.id) ?? 1) - 1);
  if (n > 0) return sockets.set(user.id, n);
  sockets.delete(user.id);
  if (!user.helperId) return;

  clearTimers(user.id);
  const presence = setTimeout(() => {
    if (!isOnline(user.id)) void announce(user, 'helper:offline');
  }, PRESENCE_GRACE_MS);

  const availability = setTimeout(async () => {
    timers.delete(user.id);
    if (isOnline(user.id)) return;
    try {
      const { rowCount } = await query(
        'UPDATE helper_profiles SET is_available = false WHERE id = $1 AND is_available', [user.helperId]);
      if (rowCount) logger.info({ helperId: user.helperId }, 'helper set offline after disconnect');
    } catch (err) {
      logger.error({ err }, 'auto-offline failed');
    }
  }, env.HELPER_OFFLINE_GRACE_SECONDS * 1000);

  presence.unref();
  availability.unref();
  timers.set(user.id, { presence, availability });
}
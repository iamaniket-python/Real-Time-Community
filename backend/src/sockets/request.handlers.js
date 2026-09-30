import { query } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { rooms } from './rooms.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function registerRequestHandlers(socket) {
  const { user } = socket.data;

  // Tiny per-socket limiter: 30 join/leave calls per minute
  let count = 0;
  let windowStart = Date.now();
  const allowed = () => {
    if (Date.now() - windowStart > 60_000) { count = 0; windowStart = Date.now(); }
    return ++count <= 30;
  };

  socket.on('request:join', async (payload, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    try {
      if (!allowed()) return reply({ ok: false, errorCode: 'RATE_LIMITED' });
      const id = payload?.requestId;
      if (typeof id !== 'string' || !UUID_RE.test(id)) {
        return reply({ ok: false, errorCode: 'VALIDATION_ERROR' });
      }

      const { rows } = await query(
        `SELECT r.user_id, hp.user_id AS helper_user_id
           FROM help_requests r
           LEFT JOIN helper_profiles hp ON hp.id = r.accepted_helper_id
          WHERE r.id = $1`, [id]);
      const r = rows[0];
      const ok = r && (user.role === 'ADMIN' || r.user_id === user.id || r.helper_user_id === user.id);
      // Same answer for "missing" and "not yours" so ids can't be probed
      if (!ok) return reply({ ok: false, errorCode: 'REQUEST_NOT_FOUND' });

      await socket.join(rooms.request(id));
      reply({ ok: true });
    } catch (err) {
      logger.error({ err }, 'request:join failed');
      reply({ ok: false, errorCode: 'INTERNAL_ERROR' });
    }
  });

  socket.on('request:leave', async (payload, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    if (!allowed()) return reply({ ok: false, errorCode: 'RATE_LIMITED' });
    const id = payload?.requestId;
    if (typeof id === 'string' && UUID_RE.test(id)) await socket.leave(rooms.request(id));
    reply({ ok: true });
  });
}
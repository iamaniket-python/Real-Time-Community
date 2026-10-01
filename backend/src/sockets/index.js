import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { query } from '../config/db.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { logger } from '../utils/logger.js';
import { setIO } from './io.js';
import { rooms } from './rooms.js';
import { registerRequestHandlers } from './request.handlers.js';
import { registerHelperHandlers } from './helper.handlers.js';
import { registerChatHandlers } from './chat.handlers.js';
import { markConnected, markDisconnected } from './presence.js';
import { unreadCount } from '../services/notification.service.js';
import { getIncomingRequests } from '../services/matching.service.js';

// The client reads err.data.errorCode from the connect_error event
const authError = (errorCode, message) => {
  const err = new Error(message);
  err.data = { errorCode };
  return err;
};

async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== 'string') {
      return next(authError('UNAUTHORIZED', 'Authentication required'));
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (e) {
      return next(e.name === 'TokenExpiredError'
        ? authError('TOKEN_EXPIRED', 'Session expired')
        : authError('INVALID_TOKEN', 'Invalid token'));
    }

    // Role and status come from the database, never from the client
    const { rows } = await query(
      `SELECT u.id, u.role, u.status, hp.id AS helper_id
         FROM users u LEFT JOIN helper_profiles hp ON hp.user_id = u.id
        WHERE u.id = $1`, [payload.sub]);
    const u = rows[0];
    if (!u || u.status !== 'ACTIVE') {
      return next(authError('ACCOUNT_INACTIVE', 'Account is not active'));
    }

    socket.data.user = { id: u.id, role: u.role, helperId: u.helper_id };
    next();
  } catch (err) {
    logger.error({ err }, 'socket auth failed');
    next(authError('INTERNAL_ERROR', 'Could not authenticate'));
  }
}

/**
 * Brings a (re)connected client up to date: request rooms, chat rooms, unread badge,
 * and for helpers the list of open offers. The database is the source of truth.
 */
async function syncOnConnect(socket) {
  const { user } = socket.data;
  try {
    const active = await query(
      `SELECT r.id FROM help_requests r
         LEFT JOIN helper_profiles hp ON hp.id = r.accepted_helper_id
        WHERE r.status IN ('ACCEPTED','ARRIVING','IN_PROGRESS')
          AND (r.user_id = $1 OR hp.user_id = $1)`, [user.id]);
    for (const r of active.rows) await socket.join(rooms.request(r.id));

    // Conversations whose chat is still open (closed chats are read via REST history)
    const chats = await query(
      `SELECT cv.id FROM conversations cv
         JOIN help_requests r ON r.id = cv.request_id
        WHERE r.status IN ('ACCEPTED','ARRIVING','IN_PROGRESS')
          AND (cv.user_id = $1 OR cv.helper_user_id = $1)`, [user.id]);
    for (const c of chats.rows) await socket.join(rooms.conversation(c.id));

    socket.emit('notification:count', { unreadCount: await unreadCount(user.id) });

    if (user.helperId) {
      const incoming = await getIncomingRequests(user.id);
      for (const item of incoming.items) await socket.join(rooms.offers(item.id));
      socket.emit('incoming:sync', incoming);
    }
  } catch (err) {
    logger.error({ err, userId: user.id }, 'socket sync failed');
  }
}

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
    maxHttpBufferSize: 1e5, // 100 KB per message; file uploads go through REST
    pingInterval: 25_000,
    pingTimeout: 20_000,
    connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000 }, // brief network drops
  });
  setIO(io);

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const { user } = socket.data;

    socket.join(rooms.user(user.id));
    if (user.helperId) socket.join(rooms.helper(user.helperId));
    if (user.role === 'ADMIN') socket.join(rooms.admins);

    registerRequestHandlers(socket);
    registerHelperHandlers(socket);
    registerChatHandlers(socket);
    markConnected(user);

    socket.emit('socket:ready', { userId: user.id, role: user.role });
    void syncOnConnect(socket);
    logger.debug({ userId: user.id, socketId: socket.id }, 'socket connected');

    socket.on('disconnect', (reason) => {
      markDisconnected(user);
      logger.debug({ userId: user.id, socketId: socket.id, reason }, 'socket disconnected');
    });
  });

  return io;
}
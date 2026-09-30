import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { query } from '../config/db.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { logger } from '../utils/logger.js';
import { setIO } from './io.js';
import { rooms } from './rooms.js';
import { registerRequestHandlers } from './request.handlers.js';

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

    socket.emit('socket:ready', { userId: user.id, role: user.role });
    logger.debug({ userId: user.id, socketId: socket.id }, 'socket connected');

    socket.on('disconnect', (reason) =>
      logger.debug({ userId: user.id, socketId: socket.id, reason }, 'socket disconnected'));
  });

  return io;
}
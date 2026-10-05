import http from 'node:http';
import app from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';
import { closeRedis } from './config/redis.js';
import { logger } from './utils/logger.js';
import { startExpiryJob } from './jobs/expiry.job.js';
import { startOrderExpiryJob } from './jobs/order-expiry.job.js';
import { initSocket } from './sockets/index.js';

const server = http.createServer(app);
const { io, closeAdapter } = initSocket(server); // Socket.IO shares the same HTTP server and port

server.listen(env.PORT, () => logger.info(`API listening on port ${env.PORT}`));
const stopExpiry = startExpiryJob();
const stopOrderExpiry = startOrderExpiryJob(); // cancels unpaid orders after the 15-minute window

let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('shutting down');
  setTimeout(() => process.exit(1), 10_000).unref(); // force exit if something hangs

  stopExpiry();
  if (typeof stopOrderExpiry === 'function') stopOrderExpiry();
  io.close(async () => { // also closes the HTTP server
    await closeAdapter();
    await closeRedis();
    await pool.end();
    process.exit(0);
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
import http from 'node:http';
import app from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';
import { logger } from './utils/logger.js';
import { startExpiryJob } from './jobs/expiry.job.js';
import { initSocket } from './sockets/index.js';

const server = http.createServer(app);
const io = initSocket(server); // Socket.IO shares the same HTTP server and port

server.listen(env.PORT, () => logger.info(`API listening on port ${env.PORT}`));
const stopExpiry = startExpiryJob();

const shutdown = () => {
  stopExpiry();
  io.close(async () => { // also closes the HTTP server
    await pool.end();
    process.exit(0);
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
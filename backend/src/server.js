import http from 'node:http';
import app from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';
import { logger } from './utils/logger.js';

// Socket.IO attaches to this same server in Phase 4
const server = http.createServer(app);

server.listen(env.PORT, () => logger.info(`API listening on port ${env.PORT}`));

// Graceful shutdown: finish in-flight requests, then close the DB pool
const shutdown = () =>
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
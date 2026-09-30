import http from 'node:http';
import app from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';
import { logger } from './utils/logger.js';
import { startExpiryJob } from './jobs/expiry.job.js';

const server = http.createServer(app); 

server.listen(env.PORT, () => logger.info(`API listening on port ${env.PORT}`));
const stopExpiry = startExpiryJob();

const shutdown = () => {
  stopExpiry();
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
  // Never write credentials to logs
  redact: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.password_hash'],
});
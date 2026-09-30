import { isProd } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const notFoundHandler = (_req, res) =>
  res.status(404).json({
    success: false,
    message: 'Route not found',
    errorCode: 'ROUTE_NOT_FOUND',
  });

export function errorHandler(err, req, res, _next) {
  // Postgres unique-violation safety net (for example, two signups at the same instant)
  const pgMapped = { 23505: [409, 'DUPLICATE_RESOURCE', 'Resource already exists'] }[err.code];

  const expected = err.isOperational || Boolean(pgMapped);
  const status = err.status || pgMapped?.[0] || 500;

  // Unexpected errors are logged in full but never shown to the client
  if (!expected) logger.error({ err, path: req.path }, 'Unhandled error');

  res.status(status).json({
    success: false,
    message: expected ? pgMapped?.[2] || err.message : 'Internal server error',
    errorCode: err.errorCode || pgMapped?.[1] || 'INTERNAL_ERROR',
    ...(err.details && { details: err.details }),
    ...(!isProd && !expected && { stack: err.stack }), // stack traces in development only
  });
}
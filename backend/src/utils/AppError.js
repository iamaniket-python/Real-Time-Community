export class AppError extends Error {
  constructor(status, errorCode, message) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
    this.isOperational = true; // expected error, safe to show the message to the client
  }
}

export const unauthorized = (code = 'UNAUTHORIZED', msg = 'Authentication required') =>
  new AppError(401, code, msg);
export const forbidden = (code = 'FORBIDDEN', msg = 'You do not have access') =>
  new AppError(403, code, msg);
export const notFound = (code = 'NOT_FOUND', msg = 'Resource not found') =>
  new AppError(404, code, msg);
export const conflict = (code, msg) => new AppError(409, code, msg);
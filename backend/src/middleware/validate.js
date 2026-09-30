import { AppError } from '../utils/AppError.js';

export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const err = new AppError(422, 'VALIDATION_ERROR', 'Invalid input');
    err.details = result.error.issues.map((i) => ({
      field: i.path.slice(1).join('.'),
      message: i.message,
    }));
    return next(err);
  }

    if (result.data.body) req.body = result.data.body;
    if (result.data.query) req.query = result.data.query; 
  next();
};
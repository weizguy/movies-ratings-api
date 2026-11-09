import type { ErrorRequestHandler } from 'express';
import type { Logger } from 'pino';
import { AppError } from '../errors';

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  // Express identifies error middleware by its four-argument signature.
  return (err, _req, res, _next) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }

    logger.error({ err }, 'Unhandled error');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  };
}

import type { RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { ValidationError } from '../errors';

type Source = 'params' | 'query';

// Express 5 makes req.query read-only, so parsed input is handed to the
// controller through res.locals instead of being written back to the request.
export function validate<T>(source: Source, schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join('.') || source}: ${issue.message}`)
        .join('; ');
      next(new ValidationError(message));
      return;
    }

    res.locals[source] = result.data;
    next();
  };
}

export function validated<T>(res: Response, source: Source): T {
  return res.locals[source] as T;
}

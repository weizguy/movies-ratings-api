// src/app.ts
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Logger } from 'pino';
import { createMovieRouter } from './movies/movie.routes';
import type { MovieController } from './movies/movie.controller';
import { NotFoundError } from './common/errors';
import { createErrorHandler } from './common/middleware/error-handler';

export interface AppDependencies {
  logger: Logger;
  movieController: MovieController;
  healthCheck: () => Promise<void>;
}

export function createApp(deps: AppDependencies): Express {
  const app = express();

  // --- global middleware ---
  app.use(helmet());
  app.use(pinoHttp({ logger: deps.logger }));
  app.use(express.json());

  // --- health ---
  app.get('/health', async (_req, res) => {
    try {
      await deps.healthCheck();
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });

  // --- feature routes ---
  app.use('/movies', createMovieRouter(deps.movieController));

  // --- unknown routes ---
  app.use((req, _res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
  });

  // --- error handler (must be registered last) ---
  app.use(createErrorHandler(deps.logger));

  return app;
}
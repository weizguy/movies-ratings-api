import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Logger } from 'pino';
import { NotFoundError } from './common/errors';
import { createErrorHandler } from './common/middleware/error-handler';

export interface AppDependencies {
  logger: Logger;
  healthCheck: () => Promise<void>;
}

export function createApp(deps: AppDependencies): Express {
  const app = express();

  app.use(helmet());
  app.use(pinoHttp({ logger: deps.logger }));

  app.get('/health', async (_req, res) => {
    try {
      await deps.healthCheck();
      res.json({ status: 'ok' });
    } catch (err) {
      deps.logger.error({ err }, 'Health check failed');
      res.status(503).json({ status: 'unavailable' });
    }
  });

  app.use((req, _res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
  });

  // Error middleware must be registered last.
  app.use(createErrorHandler(deps.logger));

  return app;
}

import type { Express } from 'express';
import pino, { type Logger } from 'pino';
import { createApp } from './app';
import type { Config } from './config';
import { initDatabases } from './database';

export interface Container {
  app: Express;
  logger: Logger;
  close: () => Promise<void>;
}

export async function buildContainer(config: Config): Promise<Container> {
  const logger = pino({ level: config.logLevel });
  const { moviesDb, ratingsDb } = await initDatabases(config);

  const app = createApp({
    logger,
    healthCheck: async () => {
      await Promise.all([moviesDb.query('SELECT 1'), ratingsDb.query('SELECT 1')]);
    },
  });

  return {
    app,
    logger,
    close: async () => {
      await Promise.all([moviesDb.close(), ratingsDb.close()]);
    },
  };
}

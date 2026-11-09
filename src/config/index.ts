import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  MOVIES_DB_PATH: z.string().min(1, 'MOVIES_DB_PATH is required'),
  RATINGS_DB_PATH: z.string().min(1, 'RATINGS_DB_PATH is required'),
  DEFAULT_PAGE_SIZE: z.coerce.number().int().min(1).max(500).default(50),
});

export interface Config {
  env: 'development' | 'test' | 'production';
  host: string;
  port: number;
  logLevel: string;
  moviesDbPath: string;
  ratingsDbPath: string;
  defaultPageSize: number;
}

export class ConfigError extends Error {
  constructor(issues: string[]) {
    super(`Invalid configuration:\n${issues.map((i) => `  - ${i}`).join('\n')}`);
    this.name = 'ConfigError';
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    throw new ConfigError(
      result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
  }

  const e = result.data;
  return Object.freeze({
    env: e.NODE_ENV,
    host: e.HOST,
    port: e.PORT,
    logLevel: e.LOG_LEVEL,
    moviesDbPath: e.MOVIES_DB_PATH,
    ratingsDbPath: e.RATINGS_DB_PATH,
    defaultPageSize: e.DEFAULT_PAGE_SIZE,
  });
}
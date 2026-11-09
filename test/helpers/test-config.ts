import path from 'node:path';
import type { Config } from '../../src/config';

const dbDir = path.resolve(__dirname, '../../db');

export const testConfig: Config = Object.freeze({
  env: 'test',
  host: '127.0.0.1',
  port: 0,
  logLevel: 'silent',
  moviesDbPath: path.join(dbDir, 'movies.db'),
  ratingsDbPath: path.join(dbDir, 'ratings.db'),
  defaultPageSize: 50,
});

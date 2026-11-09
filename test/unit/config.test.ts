import { ConfigError, loadConfig } from '../../src/config';

const validEnv = {
  MOVIES_DB_PATH: '/data/movies.db',
  RATINGS_DB_PATH: '/data/ratings.db',
};

describe('loadConfig', () => {
  it('applies defaults for optional settings', () => {
    expect(loadConfig(validEnv)).toEqual({
      env: 'development',
      host: '0.0.0.0',
      port: 3000,
      logLevel: 'info',
      moviesDbPath: '/data/movies.db',
      ratingsDbPath: '/data/ratings.db',
      defaultPageSize: 50,
    });
  });

  it('coerces numeric strings from the environment', () => {
    const config = loadConfig({ ...validEnv, PORT: '8080', DEFAULT_PAGE_SIZE: '25' });

    expect(config.port).toBe(8080);
    expect(config.defaultPageSize).toBe(25);
  });

  it('returns a frozen object', () => {
    expect(Object.isFrozen(loadConfig(validEnv))).toBe(true);
  });

  it('reports every missing database path', () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
    expect(() => loadConfig({})).toThrow(/MOVIES_DB_PATH[\s\S]*RATINGS_DB_PATH/);
  });

  it('rejects an out-of-range port', () => {
    expect(() => loadConfig({ ...validEnv, PORT: '70000' })).toThrow(/PORT/);
  });

  it('rejects an unknown log level', () => {
    expect(() => loadConfig({ ...validEnv, LOG_LEVEL: 'loud' })).toThrow(/LOG_LEVEL/);
  });
});

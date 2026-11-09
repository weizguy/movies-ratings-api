import pino from 'pino';
import request from 'supertest';
import { createApp } from '../../src/app';
import { buildContainer, type Container } from '../../src/container';
import { MovieController } from '../../src/movies/movie.controller';
import { MovieService } from '../../src/movies/movie.service';
import { testConfig } from '../helpers/test-config';

describe('GET /health', () => {
  let container: Container;

  beforeAll(async () => {
    container = await buildContainer(testConfig);
  });

  afterAll(async () => {
    await container.close();
  });

  it('returns 200 when both databases answer', async () => {
    const res = await request(container.app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns 503 when a database check fails', async () => {
    const app = createApp({
      logger: pino({ level: 'silent' }),
      movieController: new MovieController(
        new MovieService(
          { findPage: jest.fn(), findByImdbId: jest.fn() },
          { averageForMovie: jest.fn() },
          1,
        ),
      ),
      healthCheck: () => Promise.reject(new Error('db down')),
    });

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'unavailable' });
  });

  it('returns a 404 error body for unknown routes', async () => {
    const res = await request(container.app).get('/nope');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

import request from 'supertest';
import { buildContainer, type Container } from '../../src/container';
import { testConfig } from '../helpers/test-config';

describe('GET /movies', () => {
  let container: Container;

  beforeAll(async () => {
    container = await buildContainer(testConfig);
  });

  afterAll(async () => {
    await container.close();
  });

  it('returns the first page by default', async () => {
    const res = await request(container.app).get('/movies');

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(testConfig.defaultPageSize);
    expect(res.body.data).toHaveLength(testConfig.defaultPageSize);
    expect(res.body.totalPages).toBe(Math.ceil(res.body.total / res.body.pageSize));
  });

  it('returns list items with the documented fields only', async () => {
    const res = await request(container.app).get('/movies');

    for (const movie of res.body.data) {
      expect(Object.keys(movie).sort()).toEqual(['budget', 'genres', 'imdbId', 'releaseDate', 'title']);
      expect(movie.imdbId).toMatch(/^tt\d+$/);
      expect(Array.isArray(movie.genres)).toBe(true);
      expect(movie.budget === null || /^\$[\d,]+$/.test(movie.budget)).toBe(true);
    }
  });

  it('returns different movies on consecutive pages', async () => {
    const [first, second] = await Promise.all([
      request(container.app).get('/movies?page=1'),
      request(container.app).get('/movies?page=2'),
    ]);
    const firstIds = first.body.data.map((m: { imdbId: string }) => m.imdbId);
    const secondIds = second.body.data.map((m: { imdbId: string }) => m.imdbId);

    expect(second.body.page).toBe(2);
    expect(secondIds).toHaveLength(testConfig.defaultPageSize);
    expect(secondIds.filter((id: string) => firstIds.includes(id))).toEqual([]);
  });

  it('returns a partial last page and an empty page past the end', async () => {
    const { body: first } = await request(container.app).get('/movies');
    const last = await request(container.app).get(`/movies?page=${first.totalPages}`);
    const beyond = await request(container.app).get(`/movies?page=${first.totalPages + 1}`);

    expect(last.status).toBe(200);
    expect(last.body.data.length).toBe(first.total - (first.totalPages - 1) * first.pageSize);
    expect(beyond.status).toBe(200);
    expect(beyond.body.data).toEqual([]);
    expect(beyond.body.total).toBe(first.total);
  });

  it.each(['0', '-1', '1.5', 'abc', ''])('rejects page=%p with a 400', async (page) => {
    const res = await request(container.app).get('/movies').query({ page });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('page');
  });
});

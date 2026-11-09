import request from 'supertest';
import { buildContainer, type Container } from '../../src/container';
import { testConfig } from '../helpers/test-config';

describe('GET /movies/:imdbId', () => {
  let container: Container;

  beforeAll(async () => {
    container = await buildContainer(testConfig);
  });

  afterAll(async () => {
    await container.close();
  });

  it('returns full details with the average rating for a known movie', async () => {
    const res = await request(container.app).get('/movies/tt0181852');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      imdbId: 'tt0181852',
      title: 'Terminator 3: Rise of the Machines',
      genres: ['Action', 'Thriller', 'Science Fiction'],
      releaseDate: '2003-07-02',
      budget: '$200,000,000',
      description: expect.stringContaining('10 years since John Connor'),
      runtime: 109,
      averageRating: 4.26,
      originalLanguage: null,
      productionCompanies: [
        'Columbia Pictures',
        'Intermedia Films',
        'Warner Bros.',
        'C-2 Pictures',
        'IMF Internationale Medien und Film GmbH & Co. 3. Produktions KG',
        'Mostow/Lieberman Productions',
      ],
    });
  });

  it('returns a null averageRating for a movie with no ratings', async () => {
    const res = await request(container.app).get('/movies/tt0114709');

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Toy Story');
    expect(res.body.averageRating).toBeNull();
  });

  it('returns a null budget when the budget is unknown', async () => {
    const res = await request(container.app).get('/movies/tt0094675');

    expect(res.status).toBe(200);
    expect(res.body.budget).toBeNull();
  });

  it('returns 404 for an unknown imdbId', async () => {
    const res = await request(container.app).get('/movies/tt9999999');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Movie tt9999999 not found' },
    });
  });

  it.each(['abc', '0114709', 'tt', 'tt12ab', 'TT0114709'])(
    'rejects malformed imdbId %p with a 400',
    async (imdbId) => {
      const res = await request(container.app).get(`/movies/${imdbId}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('imdbId');
    },
  );
});

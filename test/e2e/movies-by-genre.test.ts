import request from 'supertest';
import { buildContainer, type Container } from '../../src/container';
import { testConfig } from '../helpers/test-config';

interface ListedMovie {
  imdbId: string;
  genres: string[];
}

const SCIENCE_FICTION_TOTAL = 3042;
const TV_MOVIE_TOTAL = 765;

describe('GET /movies/genre/:genre', () => {
  let container: Container;

  const getGenre = (genre: string, query: Record<string, string> = {}) =>
    request(container.app).get(`/movies/genre/${encodeURIComponent(genre)}`).query(query);

  beforeAll(async () => {
    container = await buildContainer(testConfig);
  });

  afterAll(async () => {
    await container.close();
  });

  it('returns a paginated list of movies in the genre', async () => {
    const res = await getGenre('Science Fiction');

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(testConfig.defaultPageSize);
    expect(res.body.total).toBe(SCIENCE_FICTION_TOTAL);
    expect(res.body.totalPages).toBe(Math.ceil(SCIENCE_FICTION_TOTAL / testConfig.defaultPageSize));
    expect(res.body.data).toHaveLength(testConfig.defaultPageSize);
    expect(Object.keys(res.body.data[0]).sort()).toEqual([
      'budget',
      'genres',
      'imdbId',
      'releaseDate',
      'title',
    ]);
  });

  it('only returns movies that carry the requested genre', async () => {
    const res = await getGenre('TV Movie');

    expect(res.body.total).toBe(TV_MOVIE_TOTAL);
    for (const movie of res.body.data as ListedMovie[]) {
      expect(movie.genres).toContain('TV Movie');
    }
  });

  it.each([
    ['upper case', 'SCIENCE FICTION'],
    ['lower case', 'science fiction'],
    ['mixed case', 'sCiEnCe FiCtIoN'],
    ['slug', 'science-fiction'],
    ['title-case slug', 'Science-Fiction'],
    ['padded with spaces', '  science fiction  '],
  ])('matches the genre when given as %s', async (_label, genre) => {
    const canonical = await getGenre('Science Fiction');
    const res = await getGenre(genre);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(canonical.body);
  });

  it('accepts the slug of a genre with a space in its name', async () => {
    const res = await getGenre('tv-movie');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(TV_MOVIE_TOTAL);
  });

  it('paginates without repeating movies', async () => {
    const [first, second] = await Promise.all([
      getGenre('Drama', { page: '1' }),
      getGenre('Drama', { page: '2' }),
    ]);
    const firstIds = first.body.data.map((m: ListedMovie) => m.imdbId);
    const secondIds = second.body.data.map((m: ListedMovie) => m.imdbId);

    expect(second.body.page).toBe(2);
    expect(secondIds).toHaveLength(testConfig.defaultPageSize);
    expect(secondIds.filter((id: string) => firstIds.includes(id))).toEqual([]);
  });

  it('returns a partial last page and an empty page past the end', async () => {
    const lastPage = Math.ceil(TV_MOVIE_TOTAL / testConfig.defaultPageSize);
    const last = await getGenre('TV Movie', { page: String(lastPage) });
    const beyond = await getGenre('TV Movie', { page: String(lastPage + 1) });

    expect(last.body.data).toHaveLength(
      TV_MOVIE_TOTAL - (lastPage - 1) * testConfig.defaultPageSize,
    );
    expect(beyond.status).toBe(200);
    expect(beyond.body.data).toEqual([]);
    expect(beyond.body.total).toBe(TV_MOVIE_TOTAL);
  });

  it.each(['Klingon', 'sci', 'fiction', 'Drama Comedy', "drama' OR '1'='1", 'drama%'])(
    'returns an empty list for the unknown genre %p',
    async (genre) => {
      const res = await getGenre(genre);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        data: [],
        page: 1,
        pageSize: testConfig.defaultPageSize,
        total: 0,
        totalPages: 0,
      });
    },
  );

  it.each(['%20', '---'])('rejects the blank genre %p with a 400', async (genre) => {
    const res = await request(container.app).get(`/movies/genre/${genre}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('genre');
  });

  it.each(['0', '-1', 'abc'])('rejects page=%p with a 400', async (page) => {
    const res = await getGenre('Drama', { page });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('page');
  });

  it('does not shadow the details route', async () => {
    const res = await request(container.app).get('/movies/tt0181852');

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Terminator 3: Rise of the Machines');
  });
});

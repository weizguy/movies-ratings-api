import request from 'supertest';
import { buildContainer, type Container } from '../../src/container';
import { testConfig } from '../helpers/test-config';

interface ListedMovie {
  imdbId: string;
  releaseDate: string | null;
}

describe('GET /movies/year/:year', () => {
  let container: Container;

  const getYear = (year: string, query: Record<string, string> = {}) =>
    request(container.app).get(`/movies/year/${year}`).query(query);

  beforeAll(async () => {
    container = await buildContainer(testConfig);
  });

  afterAll(async () => {
    await container.close();
  });

  it('returns a paginated list of movies released in that year', async () => {
    const res = await getYear('1995');

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(testConfig.defaultPageSize);
    expect(res.body.total).toBe(598);
    expect(res.body.totalPages).toBe(12);
    expect(res.body.data).toHaveLength(testConfig.defaultPageSize);
    expect(Object.keys(res.body.data[0]).sort()).toEqual([
      'budget',
      'genres',
      'imdbId',
      'releaseDate',
      'title',
    ]);
  });

  it('sorts by release date ascending by default', async () => {
    const res = await getYear('1995');
    const dates = res.body.data.map((m: ListedMovie) => m.releaseDate);

    expect(dates).toEqual([...dates].sort());
    expect(dates[0]).toBe('1995-01-01');
  });

  it('sorts by release date descending when asked', async () => {
    const res = await getYear('1995', { sort: 'desc' });
    const dates = res.body.data.map((m: ListedMovie) => m.releaseDate);

    expect(dates).toEqual([...dates].sort().reverse());
    expect(dates[0]).toBe('1995-12-29');
  });

  it('includes the first day of the year and excludes the neighbouring years', async () => {
    const pages = await Promise.all(
      Array.from({ length: 12 }, (_, i) => getYear('1995', { page: String(i + 1) })),
    );
    const movies: ListedMovie[] = pages.flatMap((res) => res.body.data);
    const ids = movies.map((m) => m.imdbId);

    expect(movies).toHaveLength(598);
    expect(movies.every((m) => m.releaseDate?.startsWith('1995-'))).toBe(true);
    expect(movies.some((m) => m.releaseDate === '1995-01-01')).toBe(true);
    expect(ids).not.toContain('tt0112993'); // Evolver, 1994-12-31
    expect(ids).not.toContain('tt0117238'); // Omega Doom, 1996-01-01
  });

  it('paginates without repeating movies', async () => {
    const [first, second] = await Promise.all([
      getYear('1995', { page: '1' }),
      getYear('1995', { page: '2' }),
    ]);
    const firstIds = first.body.data.map((m: ListedMovie) => m.imdbId);
    const secondIds = second.body.data.map((m: ListedMovie) => m.imdbId);

    expect(second.body.page).toBe(2);
    expect(secondIds.filter((id: string) => firstIds.includes(id))).toEqual([]);
  });

  it('returns a partial last page and an empty page past the end', async () => {
    const last = await getYear('1995', { page: '12' });
    const beyond = await getYear('1995', { page: '13' });

    expect(last.body.data).toHaveLength(598 - 11 * testConfig.defaultPageSize);
    expect(beyond.status).toBe(200);
    expect(beyond.body.data).toEqual([]);
    expect(beyond.body.total).toBe(598);
  });

  it('returns an empty list for a year with no movies', async () => {
    const res = await getYear('1800');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [],
      page: 1,
      pageSize: testConfig.defaultPageSize,
      total: 0,
      totalPages: 0,
    });
  });

  it.each(['95', '19955', 'abcd', '-995', '1995.5', '%201995'])(
    'rejects year %p with a 400',
    async (year) => {
      const res = await getYear(year);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('year');
    },
  );

  it.each(['up', 'ASC', 'ascending', '', 'asc; DROP TABLE movies'])(
    'rejects sort=%p with a 400',
    async (sort) => {
      const res = await getYear('1995', { sort });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('sort');
    },
  );

  it.each(['0', '-1', 'abc'])('rejects page=%p with a 400', async (page) => {
    const res = await getYear('1995', { page });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('page');
  });

  it('does not shadow the details route', async () => {
    const res = await request(container.app).get('/movies/tt0181852');

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Terminator 3: Rise of the Machines');
  });
});

import type { MovieRepository } from '../../src/movies/movie.repository';
import { MovieService } from '../../src/movies/movie.service';
import type { MovieListRow } from '../../src/movies/movie.types';

const row: MovieListRow = {
  imdbId: 'tt0094675',
  title: 'Ariel',
  genres: '[{"id": 18, "name": "Drama"}]',
  releaseDate: '1988-10-21',
  budget: 0,
};

describe('MovieService.list', () => {
  const findPage = jest.fn<
    ReturnType<MovieRepository['findPage']>,
    Parameters<MovieRepository['findPage']>
  >();
  const service = new MovieService({ findPage }, 20);

  beforeEach(() => {
    findPage.mockReset();
  });

  it('requests the page using the configured page size', async () => {
    findPage.mockResolvedValue({ rows: [], total: 0 });

    await service.list(3);

    expect(findPage).toHaveBeenCalledWith({ page: 3, pageSize: 20 });
  });

  it('maps rows and wraps them with pagination metadata', async () => {
    findPage.mockResolvedValue({ rows: [row], total: 41 });

    const result = await service.list(2);

    expect(result).toEqual({
      data: [
        { imdbId: 'tt0094675', title: 'Ariel', genres: ['Drama'], releaseDate: '1988-10-21', budget: null },
      ],
      page: 2,
      pageSize: 20,
      total: 41,
      totalPages: 3,
    });
  });

  it('returns an empty page when there are no movies', async () => {
    findPage.mockResolvedValue({ rows: [], total: 0 });

    expect(await service.list(1)).toEqual({ data: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
  });

  it('propagates repository failures', async () => {
    findPage.mockRejectedValue(new Error('db down'));

    await expect(service.list(1)).rejects.toThrow('db down');
  });
});

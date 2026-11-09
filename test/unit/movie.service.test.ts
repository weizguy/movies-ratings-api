import { NotFoundError } from '../../src/common/errors';
import type { MovieRepository } from '../../src/movies/movie.repository';
import { MovieService } from '../../src/movies/movie.service';
import type { MovieDetailsRow, MovieListRow } from '../../src/movies/movie.types';
import type { RatingRepository } from '../../src/ratings/rating.repository';

const listRow: MovieListRow = {
  imdbId: 'tt0094675',
  title: 'Ariel',
  genres: '[{"id": 18, "name": "Drama"}]',
  releaseDate: '1988-10-21',
  budget: 0,
};

const detailsRow: MovieDetailsRow = {
  ...listRow,
  movieId: 2,
  overview: 'A Finnish miner drifts.',
  runtime: 73,
  language: 'fi',
  productionCompanies: '[{"name": "Villealfa Filmproductions", "id": 2303}]',
};

describe('MovieService', () => {
  const findPage = jest.fn<
    ReturnType<MovieRepository['findPage']>,
    Parameters<MovieRepository['findPage']>
  >();
  const findByImdbId = jest.fn<
    ReturnType<MovieRepository['findByImdbId']>,
    Parameters<MovieRepository['findByImdbId']>
  >();
  const averageForMovie = jest.fn<
    ReturnType<RatingRepository['averageForMovie']>,
    Parameters<RatingRepository['averageForMovie']>
  >();
  const service = new MovieService({ findPage, findByImdbId }, { averageForMovie }, 20);

  beforeEach(() => {
    findPage.mockReset();
    findByImdbId.mockReset();
    averageForMovie.mockReset();
  });

  describe('list', () => {
    it('requests the page using the configured page size', async () => {
      findPage.mockResolvedValue({ rows: [], total: 0 });

      await service.list(3);

      expect(findPage).toHaveBeenCalledWith({ page: 3, pageSize: 20 });
    });

    it('maps rows and wraps them with pagination metadata', async () => {
      findPage.mockResolvedValue({ rows: [listRow], total: 41 });

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

  describe('getByImdbId', () => {
    it('looks up ratings by the movieId of the movie it found', async () => {
      findByImdbId.mockResolvedValue(detailsRow);
      averageForMovie.mockResolvedValue(null);

      await service.getByImdbId('tt0094675');

      expect(findByImdbId).toHaveBeenCalledWith('tt0094675');
      expect(averageForMovie).toHaveBeenCalledWith(2);
    });

    it('returns the mapped details with the average rating rounded to 2 decimals', async () => {
      findByImdbId.mockResolvedValue(detailsRow);
      averageForMovie.mockResolvedValue(4.256198347);

      expect(await service.getByImdbId('tt0094675')).toEqual({
        imdbId: 'tt0094675',
        title: 'Ariel',
        genres: ['Drama'],
        releaseDate: '1988-10-21',
        budget: null,
        description: 'A Finnish miner drifts.',
        runtime: 73,
        averageRating: 4.26,
        originalLanguage: 'fi',
        productionCompanies: ['Villealfa Filmproductions'],
      });
    });

    it('reports a null average rating when the movie has no ratings', async () => {
      findByImdbId.mockResolvedValue(detailsRow);
      averageForMovie.mockResolvedValue(null);

      expect((await service.getByImdbId('tt0094675')).averageRating).toBeNull();
    });

    it('keeps an average that is already at most 2 decimals', async () => {
      findByImdbId.mockResolvedValue(detailsRow);
      averageForMovie.mockResolvedValue(3.5);

      expect((await service.getByImdbId('tt0094675')).averageRating).toBe(3.5);
    });

    it('throws NotFoundError without querying ratings for an unknown imdbId', async () => {
      findByImdbId.mockResolvedValue(null);

      await expect(service.getByImdbId('tt9999999')).rejects.toBeInstanceOf(NotFoundError);
      expect(averageForMovie).not.toHaveBeenCalled();
    });

    it('propagates rating repository failures', async () => {
      findByImdbId.mockResolvedValue(detailsRow);
      averageForMovie.mockRejectedValue(new Error('ratings db down'));

      await expect(service.getByImdbId('tt0094675')).rejects.toThrow('ratings db down');
    });
  });
});

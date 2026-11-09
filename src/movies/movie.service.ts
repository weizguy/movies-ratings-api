import { NotFoundError } from '../common/errors';
import { toPaginated, type Paginated } from '../common/pagination';
import type { RatingRepository } from '../ratings/rating.repository';
import { toMovieDetails, toMovieSummary } from './movie.mapper';
import type { MovieRepository } from './movie.repository';
import type { MovieDetails, MovieSummary, SortOrder } from './movie.types';

const roundToTwoDecimals = (value: number): number => Math.round(value * 100) / 100;

export class MovieService {
  constructor(
    private readonly movies: MovieRepository,
    private readonly ratings: RatingRepository,
    private readonly pageSize: number,
  ) {}

  async list(page: number): Promise<Paginated<MovieSummary>> {
    const request = { page, pageSize: this.pageSize };
    const { rows, total } = await this.movies.findPage(request);

    return toPaginated(rows.map(toMovieSummary), total, request);
  }

  async listByYear(year: number, sort: SortOrder, page: number): Promise<Paginated<MovieSummary>> {
    const request = { page, pageSize: this.pageSize };
    const { rows, total } = await this.movies.findPageByYear(year, sort, request);

    return toPaginated(rows.map(toMovieSummary), total, request);
  }

  // The two tables live in separate databases, so the rating lookup is a
  // second query keyed by the movie's movieId rather than a join.
  async getByImdbId(imdbId: string): Promise<MovieDetails> {
    const movie = await this.movies.findByImdbId(imdbId);
    if (movie === null) {
      throw new NotFoundError(`Movie ${imdbId} not found`);
    }

    const average = await this.ratings.averageForMovie(movie.movieId);

    return toMovieDetails(movie, average === null ? null : roundToTwoDecimals(average));
  }
}

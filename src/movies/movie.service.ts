import type { Paginated } from '../common/pagination';
import { toPaginated } from '../common/pagination';
import { toMovieSummary } from './movie.mapper';
import type { MovieRepository } from './movie.repository';
import type { MovieSummary } from './movie.types';

export class MovieService {
  constructor(
    private readonly movies: MovieRepository,
    private readonly pageSize: number,
  ) {}

  async list(page: number): Promise<Paginated<MovieSummary>> {
    const request = { page, pageSize: this.pageSize };
    const { rows, total } = await this.movies.findPage(request);

    return toPaginated(rows.map(toMovieSummary), total, request);
  }
}

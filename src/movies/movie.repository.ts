import type { MovieModel } from './movie.model';
import type { MovieListRow } from './movie.types';
import { offsetFor, type PageRequest } from '../common/pagination';

export interface MovieListPage {
  rows: MovieListRow[];
  total: number;
}

export interface MovieRepository {
  findPage(request: PageRequest): Promise<MovieListPage>;
}

export class SequelizeMovieRepository implements MovieRepository {
  constructor(private readonly Movie: typeof MovieModel) {}

  async findPage(request: PageRequest): Promise<MovieListPage> {
    const [rows, total] = await Promise.all([
      this.Movie.findAll({
        attributes: ['imdbId', 'title', 'genres', 'releaseDate', 'budget'],
        order: [['movieId', 'ASC']],
        limit: request.pageSize,
        offset: offsetFor(request),
        raw: true,
      }),
      this.Movie.count(),
    ]);

    return { rows, total };
  }
}

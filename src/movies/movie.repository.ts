import { literal, Op, type InferAttributes, type Order, type WhereOptions } from 'sequelize';
import type { MovieModel } from './movie.model';
import type { MovieDetailsRow, MovieListRow, SortOrder } from './movie.types';
import { offsetFor, type PageRequest } from '../common/pagination';

export interface MovieListPage {
  rows: MovieListRow[];
  total: number;
}

export interface MovieRepository {
  findPage(request: PageRequest): Promise<MovieListPage>;
  findPageByYear(year: number, sort: SortOrder, request: PageRequest): Promise<MovieListPage>;
  findPageByGenre(genre: string, request: PageRequest): Promise<MovieListPage>;
  findByImdbId(imdbId: string): Promise<MovieDetailsRow | null>;
}

const LIST_COLUMNS = ['imdbId', 'title', 'genres', 'releaseDate', 'budget'] as const;

// Whitelist lookup: user input selects a direction, it is never interpolated.
const DIRECTION = { asc: 'ASC', desc: 'DESC' } as const;

// genres holds JSON text: [{"id": 18, "name": "Drama"}, ...]. The genre is
// always bound through :genre, never interpolated into the SQL.
const HAS_GENRE = literal(
  "EXISTS (SELECT 1 FROM json_each(Movie.genres) WHERE lower(json_extract(value, '$.name')) = :genre)",
);

interface PageQuery {
  where?: WhereOptions<InferAttributes<MovieModel>>;
  order: Order;
  replacements?: Record<string, string>;
}

export class SequelizeMovieRepository implements MovieRepository {
  constructor(private readonly Movie: typeof MovieModel) {}

  findPage(request: PageRequest): Promise<MovieListPage> {
    return this.queryPage(request, { order: [['movieId', 'ASC']] });
  }

  // releaseDate is stored as YYYY-MM-DD text, so a half-open range on the raw
  // column is exact and keeps the query free of per-row functions.
  findPageByYear(year: number, sort: SortOrder, request: PageRequest): Promise<MovieListPage> {
    return this.queryPage(request, {
      where: {
        releaseDate: {
          [Op.gte]: `${toYearString(year)}-01-01`,
          [Op.lt]: `${toYearString(year + 1)}-01-01`,
        },
      },
      order: [
        ['releaseDate', DIRECTION[sort]],
        ['movieId', 'ASC'],
      ],
    });
  }

  // Expects an already-normalized (trimmed, lower-case) genre name.
  findPageByGenre(genre: string, request: PageRequest): Promise<MovieListPage> {
    return this.queryPage(request, {
      where: HAS_GENRE,
      order: [['movieId', 'ASC']],
      replacements: { genre },
    });
  }

  findByImdbId(imdbId: string): Promise<MovieDetailsRow | null> {
    return this.Movie.findOne({
      attributes: [
        'movieId',
        'imdbId',
        'title',
        'genres',
        'releaseDate',
        'budget',
        'overview',
        'runtime',
        'language',
        'productionCompanies',
      ],
      where: { imdbId },
      raw: true,
    });
  }

  private async queryPage(
    request: PageRequest,
    { where, order, replacements }: PageQuery,
  ): Promise<MovieListPage> {
    const { rows, count } = await this.Movie.findAndCountAll({
      attributes: [...LIST_COLUMNS],
      where,
      order,
      limit: request.pageSize,
      offset: offsetFor(request),
      replacements,
      raw: true,
    });

    return { rows, total: count };
  }
}

function toYearString(year: number): string {
  return String(year).padStart(4, '0');
}

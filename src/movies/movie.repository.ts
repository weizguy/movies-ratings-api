import { Op, type InferAttributes, type Order, type WhereOptions } from 'sequelize';
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
  findByImdbId(imdbId: string): Promise<MovieDetailsRow | null>;
}

const LIST_COLUMNS = ['imdbId', 'title', 'genres', 'releaseDate', 'budget'] as const;

// Whitelist lookup: user input selects a direction, it is never interpolated.
const DIRECTION = { asc: 'ASC', desc: 'DESC' } as const;

interface PageQuery {
  where?: WhereOptions<InferAttributes<MovieModel>>;
  order: Order;
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

  private async queryPage(request: PageRequest, { where, order }: PageQuery): Promise<MovieListPage> {
    const [rows, total] = await Promise.all([
      this.Movie.findAll({
        attributes: [...LIST_COLUMNS],
        where,
        order,
        limit: request.pageSize,
        offset: offsetFor(request),
        raw: true,
      }),
      this.Movie.count({ where }),
    ]);

    return { rows, total };
  }
}

function toYearString(year: number): string {
  return String(year).padStart(4, '0');
}

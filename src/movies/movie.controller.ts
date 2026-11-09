import type { Request, Response } from 'express';
import { validated } from '../common/middleware/validate';
import type {
  DetailsParams,
  GenreParams,
  ListQuery,
  YearParams,
  YearQuery,
} from './movie.schemas';
import type { MovieService } from './movie.service';

export class MovieController {
  constructor(private readonly service: MovieService) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const { page } = validated<ListQuery>(res, 'query');
    res.json(await this.service.list(page));
  };

  listByYear = async (_req: Request, res: Response): Promise<void> => {
    const { year } = validated<YearParams>(res, 'params');
    const { page, sort } = validated<YearQuery>(res, 'query');
    res.json(await this.service.listByYear(year, sort, page));
  };

  listByGenre = async (_req: Request, res: Response): Promise<void> => {
    const { genre } = validated<GenreParams>(res, 'params');
    const { page } = validated<ListQuery>(res, 'query');
    res.json(await this.service.listByGenre(genre, page));
  };

  details = async (_req: Request, res: Response): Promise<void> => {
    const { imdbId } = validated<DetailsParams>(res, 'params');
    res.json(await this.service.getByImdbId(imdbId));
  };
}

import type { Request, Response } from 'express';
import { validated } from '../common/middleware/validate';
import type { ListQuery } from './movie.schemas';
import type { MovieService } from './movie.service';

export class MovieController {
  constructor(private readonly service: MovieService) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const { page } = validated<ListQuery>(res, 'query');
    res.json(await this.service.list(page));
  };
}

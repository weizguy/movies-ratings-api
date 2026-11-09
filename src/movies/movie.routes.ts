import { Router } from 'express';
import { validate } from '../common/middleware/validate';
import type { MovieController } from './movie.controller';
import { listQuerySchema } from './movie.schemas';

export function createMovieRouter(controller: MovieController): Router {
  const router = Router();

  router.get('/', validate('query', listQuerySchema), controller.list);

  return router;
}

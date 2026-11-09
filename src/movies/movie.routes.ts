import { Router } from 'express';
import { validate } from '../common/middleware/validate';
import type { MovieController } from './movie.controller';
import { detailsParamsSchema, listQuerySchema } from './movie.schemas';

export function createMovieRouter(controller: MovieController): Router {
  const router = Router();

  router.get('/', validate('query', listQuerySchema), controller.list);

  // Must stay last: '/:imdbId' would otherwise swallow '/year/...' and '/genre/...'.
  router.get('/:imdbId', validate('params', detailsParamsSchema), controller.details);

  return router;
}

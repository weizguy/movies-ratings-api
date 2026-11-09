import { Router } from 'express';
import { validate } from '../common/middleware/validate';
import type { MovieController } from './movie.controller';
import {
  detailsParamsSchema,
  genreParamsSchema,
  listQuerySchema,
  yearParamsSchema,
  yearQuerySchema,
} from './movie.schemas';

export function createMovieRouter(controller: MovieController): Router {
  const router = Router();

  router.get('/', validate('query', listQuerySchema), controller.list);

  router.get(
    '/year/:year',
    validate('params', yearParamsSchema),
    validate('query', yearQuerySchema),
    controller.listByYear,
  );

  router.get(
    '/genre/:genre',
    validate('params', genreParamsSchema),
    validate('query', listQuerySchema),
    controller.listByGenre,
  );

  // Must stay last: '/:imdbId' would otherwise swallow '/year/...' and '/genre/...'.
  router.get('/:imdbId', validate('params', detailsParamsSchema), controller.details);

  return router;
}

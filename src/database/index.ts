import { Sequelize } from 'sequelize';
import sqlite3 from 'sqlite3';
import { initMovieModel, type MovieModel } from '../movies/movie.model';
import { initRatingModel, type RatingModel } from '../ratings/rating.model';
import type { Config } from '../config';

export interface Databases {
  moviesDb: Sequelize;
  ratingsDb: Sequelize;
  Movie: typeof MovieModel;
  Rating: typeof RatingModel;
}

function createSqlite(storage: string): Sequelize {
  return new Sequelize({
    dialect: 'sqlite',
    storage,
    logging: false,
    dialectOptions: { mode: sqlite3.OPEN_READONLY },
  });
}

export async function initDatabases(config: Config): Promise<Databases> {
  const moviesDb = createSqlite(config.moviesDbPath);
  const ratingsDb = createSqlite(config.ratingsDbPath);

  await Promise.all([moviesDb.authenticate(), ratingsDb.authenticate()]); // fail fast

  return {
    moviesDb,
    ratingsDb,
    Movie: initMovieModel(moviesDb),
    Rating: initRatingModel(ratingsDb),
  };
}

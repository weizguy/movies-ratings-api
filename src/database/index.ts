import { Sequelize } from 'sequelize';
import sqlite3 from 'sqlite3';
import { initMovieModel } from '../movies/movie.model';
import { initRatingModel } from '../ratings/rating.model';
import type { Config } from '../config';

function createSqlite(storage: string) {
  return new Sequelize({
    dialect: 'sqlite',
    storage,
    logging: false,
    dialectOptions: { mode: sqlite3.OPEN_READONLY },
  });
}

export async function initDatabases(config: Config) {
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
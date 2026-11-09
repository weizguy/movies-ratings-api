import {
  DataTypes, Model, Sequelize,
  InferAttributes, InferCreationAttributes,
} from 'sequelize';

export class MovieModel extends Model<
  InferAttributes<MovieModel>,
  InferCreationAttributes<MovieModel>
> {
  declare movieId: number;
  declare imdbId: string;
  declare title: string;
  declare overview: string | null;
  declare productionCompanies: string | null; // JSON text
  declare releaseDate: string | null;         // YYYY-MM-DD
  declare budget: number | null;              // whole dollars, 0 = unknown
  declare revenue: number | null;
  declare runtime: number | null;             // minutes
  declare language: string | null;
  declare genres: string | null;              // JSON text
  declare status: string | null;
}

export function initMovieModel(sequelize: Sequelize): typeof MovieModel {
  MovieModel.init(
    {
      movieId:             { type: DataTypes.INTEGER, primaryKey: true },
      imdbId:              { type: DataTypes.TEXT, allowNull: false },
      title:               { type: DataTypes.TEXT, allowNull: false },
      overview:            { type: DataTypes.TEXT },
      productionCompanies: { type: DataTypes.TEXT },
      releaseDate:         { type: DataTypes.TEXT },
      budget:              { type: DataTypes.INTEGER },
      revenue:             { type: DataTypes.INTEGER },
      runtime:             { type: DataTypes.REAL },
      language:            { type: DataTypes.TEXT },
      genres:              { type: DataTypes.TEXT },
      status:              { type: DataTypes.TEXT },
    },
    {
      sequelize,
      modelName: 'Movie',
      tableName: 'movies',
      timestamps: false,
    },
  );
  return MovieModel;
}
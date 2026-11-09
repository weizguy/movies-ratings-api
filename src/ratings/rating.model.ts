import {
  DataTypes, Model, Sequelize,
  InferAttributes, InferCreationAttributes,
} from 'sequelize';

export class RatingModel extends Model<
  InferAttributes<RatingModel>,
  InferCreationAttributes<RatingModel>
> {
  declare ratingId: number;
  declare userId: number;
  declare movieId: number;
  declare rating: number;
  declare timestamp: number; // unix seconds
}

export function initRatingModel(sequelize: Sequelize): typeof RatingModel {
  RatingModel.init(
    {
      ratingId:  { type: DataTypes.INTEGER, primaryKey: true },
      userId:    { type: DataTypes.INTEGER, allowNull: false },
      movieId:   { type: DataTypes.INTEGER, allowNull: false },
      rating:    { type: DataTypes.REAL, allowNull: false },
      timestamp: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      modelName: 'Rating',
      tableName: 'ratings',
      timestamps: false,
    },
  );
  return RatingModel;
}
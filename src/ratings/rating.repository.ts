import { col, fn } from 'sequelize';
import type { RatingModel } from './rating.model';

export interface RatingRepository {
  /** Mean rating for a movie, or null when it has no ratings. */
  averageForMovie(movieId: number): Promise<number | null>;
}

export class SequelizeRatingRepository implements RatingRepository {
  constructor(private readonly Rating: typeof RatingModel) {}

  async averageForMovie(movieId: number): Promise<number | null> {
    const result = (await this.Rating.findOne({
      attributes: [[fn('AVG', col('rating')), 'average']],
      where: { movieId },
      raw: true,
    })) as unknown as { average: number | null } | null;

    return result?.average ?? null;
  }
}

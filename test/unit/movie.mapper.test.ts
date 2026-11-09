import {
  formatBudget,
  parseNames,
  toMovieDetails,
  toMovieSummary,
} from '../../src/movies/movie.mapper';
import type { MovieDetailsRow, MovieListRow } from '../../src/movies/movie.types';

describe('formatBudget', () => {
  it('formats whole dollars as USD with grouping and no decimals', () => {
    expect(formatBudget(4000000)).toBe('$4,000,000');
    expect(formatBudget(1)).toBe('$1');
  });

  it.each([0, null, -5])('returns null for unknown budget %p', (budget) => {
    expect(formatBudget(budget)).toBeNull();
  });
});

describe('parseNames', () => {
  it('extracts genre names from stored JSON', () => {
    const json = '[{"id": 18, "name": "Drama"}, {"id": 80, "name": "Crime"}]';

    expect(parseNames(json)).toEqual(['Drama', 'Crime']);
  });

  it('returns an empty list for null, empty or malformed input', () => {
    expect(parseNames(null)).toEqual([]);
    expect(parseNames('[]')).toEqual([]);
    expect(parseNames('not json')).toEqual([]);
  });

  it('returns an empty list when the JSON is not an array', () => {
    expect(parseNames('{"name": "Drama"}')).toEqual([]);
    expect(parseNames('"Drama"')).toEqual([]);
  });

  it('skips entries without a string name', () => {
    expect(parseNames('[{"id": 1}, null, 7, {"name": 3}, {"name": "Comedy"}]')).toEqual([
      'Comedy',
    ]);
  });
});

describe('toMovieSummary', () => {
  const row: MovieListRow = {
    imdbId: 'tt0094675',
    title: 'Ariel',
    genres: '[{"id": 18, "name": "Drama"}]',
    releaseDate: '1988-10-21',
    budget: 4000000,
  };

  it('maps a database row to the API shape', () => {
    expect(toMovieSummary(row)).toEqual({
      imdbId: 'tt0094675',
      title: 'Ariel',
      genres: ['Drama'],
      releaseDate: '1988-10-21',
      budget: '$4,000,000',
    });
  });

  it('handles nullable columns safely', () => {
    expect(toMovieSummary({ ...row, genres: null, releaseDate: null, budget: null })).toEqual({
      imdbId: 'tt0094675',
      title: 'Ariel',
      genres: [],
      releaseDate: null,
      budget: null,
    });
  });
});

describe('toMovieDetails', () => {
  const row: MovieDetailsRow = {
    movieId: 862,
    imdbId: 'tt0114709',
    title: 'Toy Story',
    genres: '[{"id": 16, "name": "Animation"}]',
    releaseDate: '1995-10-30',
    budget: 30000000,
    overview: 'Led by Woody, Andy\'s toys live happily in his room.',
    runtime: 81,
    language: 'en',
    productionCompanies: '[{"name": "Pixar Animation Studios", "id": 3}]',
  };

  it('maps a database row and rating to the details shape', () => {
    expect(toMovieDetails(row, 4.15)).toEqual({
      imdbId: 'tt0114709',
      title: 'Toy Story',
      genres: ['Animation'],
      releaseDate: '1995-10-30',
      budget: '$30,000,000',
      description: 'Led by Woody, Andy\'s toys live happily in his room.',
      runtime: 81,
      averageRating: 4.15,
      originalLanguage: 'en',
      productionCompanies: ['Pixar Animation Studios'],
    });
  });

  it('handles nullable columns and a missing rating safely', () => {
    const result = toMovieDetails(
      { ...row, overview: null, runtime: null, language: null, productionCompanies: 'oops' },
      null,
    );

    expect(result).toMatchObject({
      description: null,
      runtime: null,
      averageRating: null,
      originalLanguage: null,
      productionCompanies: [],
    });
  });

  it('does not expose the internal movieId', () => {
    expect(toMovieDetails(row, null)).not.toHaveProperty('movieId');
  });
});

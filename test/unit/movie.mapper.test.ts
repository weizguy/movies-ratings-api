import { formatBudget, parseGenreNames, toMovieSummary } from '../../src/movies/movie.mapper';
import type { MovieListRow } from '../../src/movies/movie.types';

describe('formatBudget', () => {
  it('formats whole dollars as USD with grouping and no decimals', () => {
    expect(formatBudget(4000000)).toBe('$4,000,000');
    expect(formatBudget(1)).toBe('$1');
  });

  it.each([0, null, -5])('returns null for unknown budget %p', (budget) => {
    expect(formatBudget(budget)).toBeNull();
  });
});

describe('parseGenreNames', () => {
  it('extracts genre names from stored JSON', () => {
    const json = '[{"id": 18, "name": "Drama"}, {"id": 80, "name": "Crime"}]';

    expect(parseGenreNames(json)).toEqual(['Drama', 'Crime']);
  });

  it('returns an empty list for null, empty or malformed input', () => {
    expect(parseGenreNames(null)).toEqual([]);
    expect(parseGenreNames('[]')).toEqual([]);
    expect(parseGenreNames('not json')).toEqual([]);
  });

  it('returns an empty list when the JSON is not an array', () => {
    expect(parseGenreNames('{"name": "Drama"}')).toEqual([]);
    expect(parseGenreNames('"Drama"')).toEqual([]);
  });

  it('skips entries without a string name', () => {
    expect(parseGenreNames('[{"id": 1}, null, 7, {"name": 3}, {"name": "Comedy"}]')).toEqual([
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

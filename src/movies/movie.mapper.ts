import type { MovieListRow, MovieSummary } from './movie.types';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatBudget(budget: number | null): string | null {
  return budget === null || budget <= 0 ? null : usd.format(budget);
}

// Genres are stored as JSON text: [{"id": 18, "name": "Drama"}, ...].
// Anything unparseable or unexpected yields an empty list rather than an error.
export function parseGenreNames(json: string | null): string[] {
  if (json === null) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap((entry: unknown) => {
    const name = (entry as { name?: unknown } | null)?.name;
    return typeof name === 'string' ? [name] : [];
  });
}

export function toMovieSummary(row: MovieListRow): MovieSummary {
  return {
    imdbId: row.imdbId,
    title: row.title,
    genres: parseGenreNames(row.genres),
    releaseDate: row.releaseDate,
    budget: formatBudget(row.budget),
  };
}

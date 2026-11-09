export interface MovieSummary {
  imdbId: string;
  title: string;
  genres: string[];
  releaseDate: string | null;
  budget: string | null; // "$4,000,000"; null when unknown
}

export interface MovieDetails extends MovieSummary {
  description: string | null;
  runtime: number | null;
  averageRating: number | null;
  originalLanguage: string | null;
  productionCompanies: string[];
}

// Columns the list endpoints read from the movies table, as stored.
export interface MovieListRow {
  imdbId: string;
  title: string;
  genres: string | null; // JSON text
  releaseDate: string | null;
  budget: number | null;
}

import { z } from 'zod';

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

export const yearParamsSchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}$/, 'must be a 4-digit year')
    .transform(Number),
});

export const yearQuerySchema = listQuerySchema.extend({
  sort: z.enum(['asc', 'desc']).default('asc'),
});

// Genre names are title case with spaces ("Science Fiction"); slugs
// ("science-fiction") are accepted too. Matching is case-insensitive.
export function normalizeGenre(raw: string): string {
  return raw.toLowerCase().replace(/[-\s]+/g, ' ').trim();
}

export const genreParamsSchema = z.object({
  genre: z.string().transform(normalizeGenre).pipe(z.string().min(1, 'must not be blank')),
});

export const detailsParamsSchema = z.object({
  imdbId: z.string().regex(/^tt\d{1,12}$/, 'must look like tt0114709'),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
export type YearParams = z.infer<typeof yearParamsSchema>;
export type YearQuery = z.infer<typeof yearQuerySchema>;
export type GenreParams = z.infer<typeof genreParamsSchema>;
export type DetailsParams = z.infer<typeof detailsParamsSchema>;

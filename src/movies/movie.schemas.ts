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

export const detailsParamsSchema = z.object({
  imdbId: z.string().regex(/^tt\d{1,12}$/, 'must look like tt0114709'),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
export type YearParams = z.infer<typeof yearParamsSchema>;
export type YearQuery = z.infer<typeof yearQuerySchema>;
export type DetailsParams = z.infer<typeof detailsParamsSchema>;

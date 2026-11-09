import { z } from 'zod';

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

export const detailsParamsSchema = z.object({
  imdbId: z.string().regex(/^tt\d{1,12}$/, 'must look like tt0114709'),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
export type DetailsParams = z.infer<typeof detailsParamsSchema>;

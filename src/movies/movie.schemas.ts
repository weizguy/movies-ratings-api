import { z } from 'zod';

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

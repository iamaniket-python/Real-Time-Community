import { z } from 'zod';

export const reviewSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
  }).strict(),
});

export const listReviewsSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  query: z.object({
    cursor: z.string().min(10).max(200).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});
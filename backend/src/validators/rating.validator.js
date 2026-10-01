import { z } from 'zod';

const noNul = (s) => !s.includes('\u0000');

export const createRatingSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid request id') }),
  body: z.object({
    score: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000, 'Comment is too long').refine(noNul, 'Invalid characters').optional(),
  }).strict(),
});

export const listRatingsSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid helper id') }),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().max(200).optional(),
  }),
});
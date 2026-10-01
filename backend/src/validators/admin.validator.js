import { z } from 'zod';

const noNul = (s) => !s.includes('\u0000');

export const listHelpersSchema = z.object({
  query: z.object({
    status: z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED']).default('PENDING'),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

const reasonBody = z.object({
  reason: z.string().trim().max(500, 'Reason is too long').refine(noNul, 'Invalid characters').optional(),
}).strict();

export const helperActionSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid helper id') }),
  body: reasonBody,
});

export const userActionSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid user id') }),
  body: reasonBody,
});
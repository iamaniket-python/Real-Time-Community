import { z } from 'zod';

const noNul = (s) => !s.includes('\u0000');
const categoryName = z.string().trim().min(2).max(60).refine(noNul, 'Invalid characters');

export const createCategorySchema = z.object({
  body: z.object({ name: categoryName }).strict(),
});

export const updateCategorySchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive('Invalid category id') }),
  body: z.object({
    name: categoryName.optional(),
    isActive: z.boolean().optional(),
  }).strict().refine((b) => b.name !== undefined || b.isActive !== undefined, 'Nothing to update'),
});

export const activeRequestsSchema = z.object({
  query: z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }),
});
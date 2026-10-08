import { z } from 'zod';

export const nearbyShopsSchema = z.object({
  query: z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radiusKm: z.coerce.number().min(1).max(10).default(10),
  }),
});

export const shopIdSchema = z.object({ params: z.object({ id: z.string().uuid() }) });

export const searchSchema = z.object({
  query: z.object({
    q: z.string().trim().min(2).max(60),
    type: z.enum(['products', 'shops']).default('products'),
    limit: z.coerce.number().int().min(1).max(30).default(20),
    cursor: z.string().max(300).optional(),
  }),
});
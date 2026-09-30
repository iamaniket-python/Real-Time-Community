import { z } from 'zod';

export const createRequestSchema = z.object({
  body: z
    .object({
      categoryId: z.number().int().positive(),
      title: z.string().trim().min(3).max(150),
      description: z.string().trim().min(10).max(2000),
      address: z.string().trim().max(300).optional(),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      idempotencyKey: z.string().trim().min(8).max(64).optional(),
    })
    .strict(),
});

export const listRequestsSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().max(200).optional(),
    status: z
      .enum(['PENDING', 'SEARCHING', 'ACCEPTED', 'ARRIVING', 'IN_PROGRESS',
             'COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'])
      .optional(),
  }),
});

export const requestIdSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid request id') }),
});
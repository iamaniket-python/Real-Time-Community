import { z } from 'zod';

const id = z.string().uuid();

export const listPartnersSchema = z.object({
  query: z.object({
    status: z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED']).default('PENDING'),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().max(200).optional(),
  }),
});

export const partnerIdSchema = z.object({ params: z.object({ id }) });

export const partnerActionSchema = z.object({
  params: z.object({ id }),
  body: z.object({ reason: z.string().trim().max(500).optional() }).strict(),
});
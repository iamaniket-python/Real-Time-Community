import { z } from 'zod';

const STATUSES = [
  'PENDING_PAYMENT', 'PLACED', 'CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED', 'EXPIRED',
];

export const listOrdersSchema = z.object({
  query: z.object({
    cursor: z.string().min(10).max(200).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    status: z.enum(STATUSES).optional(),
  }),
});
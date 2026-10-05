import { z } from 'zod';

const STATUSES = [
  'PENDING_PAYMENT', 'PLACED', 'CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED', 'EXPIRED',
];

// Sellers never see unpaid or expired orders
const SELLER_STATUSES = ['PLACED', 'CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED'];

const paging = {
  cursor: z.string().min(10).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};

export const listOrdersSchema = z.object({
  query: z.object({ ...paging, status: z.enum(STATUSES).optional() }),
});

export const listSellerOrdersSchema = z.object({
  query: z.object({ ...paging, status: z.enum(SELLER_STATUSES).optional() }),
});
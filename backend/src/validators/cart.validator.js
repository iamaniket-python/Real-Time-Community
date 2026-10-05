import { z } from 'zod';

export const setItemSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(0).max(99), // 0 removes the item
    replace: z.boolean().optional(),           // true = empty a cart from another shop first
  }).strict(),
});

export const removeItemSchema = z.object({
  params: z.object({ productId: z.string().uuid() }),
});
import { z } from 'zod';

export const checkoutSchema = z.object({
  body: z.object({
    fulfillment: z.enum(['PICKUP', 'DELIVERY']).default('PICKUP'),
    deliveryAddress: z.string().trim().min(5).max(300).optional(),
    idempotencyKey: z.string().trim().min(8).max(64).optional(),
  }).strict().refine((b) => b.fulfillment !== 'DELIVERY' || !!b.deliveryAddress, {
    message: 'Delivery address is required',
    path: ['deliveryAddress'],
  }),
});

export const orderIdSchema = z.object({ params: z.object({ id: z.string().uuid() }) });

export const verifyPaymentSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    paymentId: z.string().trim().min(5).max(64),
    signature: z.string().regex(/^[0-9a-f]{64}$/i, 'Invalid signature'),
  }).strict(),
});
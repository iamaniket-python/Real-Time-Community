import { z } from 'zod';

export const listNotificationsSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().max(200).optional(),
    unread: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  }),
});

export const notificationIdSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid notification id') }),
});
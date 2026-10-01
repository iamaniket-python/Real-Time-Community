import { z } from 'zod';

export const requestIdSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid request id') }),
});
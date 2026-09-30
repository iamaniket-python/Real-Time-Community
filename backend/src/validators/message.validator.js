import { z } from 'zod';

// Postgres text cannot contain NUL bytes; reject them instead of letting the query fail
const noNul = (s) => !s.includes('\u0000');

export const sendMessageSchema = z.object({
  body: z
    .object({
      conversationId: z.string().uuid('Invalid conversation id'),
      body: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message is too long')
        .refine(noNul, 'Invalid characters'),
      clientId: z.string().trim().min(8).max(64).optional(),
    })
    .strict(),
});

export const conversationIdSchema = z.object({
  params: z.object({ conversationId: z.string().uuid('Invalid conversation id') }),
});

export const listMessagesSchema = z.object({
  params: z.object({ conversationId: z.string().uuid('Invalid conversation id') }),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(50).default(30),
    cursor: z.string().max(200).optional(),
  }),
});

export const listConversationsSchema = z.object({
  query: z.object({ requestId: z.string().uuid().optional() }),
});
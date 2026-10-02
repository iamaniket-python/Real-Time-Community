import { z } from 'zod';

const noNul = (s) => !s.includes('\u0000');
const statusValue = z.string().trim().toUpperCase().regex(/^[A-Z_]{2,30}$/, 'Invalid status');

export const listReportsSchema = z.object({
  query: z.object({
    status: statusValue.optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().max(200).optional(),
  }),
});

export const updateReportSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid report id') }),
  body: z.object({
    status: statusValue,
    note: z.string().trim().max(1000, 'Note is too long').refine(noNul, 'Invalid characters').optional(),
  }).strict(),
});

export const auditLogSchema = z.object({
  query: z.object({
    action: z.string().trim().regex(/^[A-Z_]{2,50}$/, 'Invalid action').optional(),
    limit: z.coerce.number().int().min(1).max(50).default(30),
    cursor: z.string().regex(/^\d{1,18}$/, 'Invalid cursor').optional(),
  }),
});
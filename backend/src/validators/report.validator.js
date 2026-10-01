import { z } from 'zod';

const noNul = (s) => !s.includes('\u0000');

export const REPORT_REASONS = [
  'HARASSMENT', 'FRAUD', 'UNSAFE_BEHAVIOR', 'NO_SHOW', 'INAPPROPRIATE_CONTENT', 'OTHER',
];

export const createReportSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid request id') }),
  body: z.object({
    reason: z.enum(REPORT_REASONS),
    details: z.string().trim().max(2000, 'Details are too long').refine(noNul, 'Invalid characters').optional(),
  }).strict(),
});
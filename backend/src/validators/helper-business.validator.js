import { z } from 'zod';

const gst = z.string().trim().toUpperCase()
  .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Invalid GST number');
const pan = z.string().trim().toUpperCase()
  .regex(/^[A-Z]{5}\d{4}[A-Z]$/, 'Invalid PAN number');
const aadhaar = z.string().transform((s) => s.replace(/\s/g, ''))
  .pipe(z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits'));

export const businessSchema = z.object({
  body: z.object({
    businessName: z.string().trim().min(2).max(120),
    businessAddress: z.string().trim().min(5).max(300),
    experienceYears: z.number().int().min(0).max(60),
    gstNumber: gst,
    aadhaarNumber: aadhaar,
    panNumber: pan,
  }).strict(),
});
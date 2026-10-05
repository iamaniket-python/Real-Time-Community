import { z } from 'zod';

const gst = z.string().trim().toUpperCase()
  .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Invalid GST number');
const pan = z.string().trim().toUpperCase()
  .regex(/^[A-Z]{5}\d{4}[A-Z]$/, 'Invalid PAN number');
const aadhaar = z.string().transform((s) => s.replace(/\s/g, ''))
  .pipe(z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits'));

export const sellerProfileSchema = z.object({
  body: z.object({
    shopName: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1000).optional(),
    address: z.string().trim().min(5).max(300),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    gstNumber: gst,
    panNumber: pan,
    aadhaarNumber: aadhaar,
  }).strict(),
});

export const sellerOpenSchema = z.object({
  body: z.object({ isOpen: z.boolean() }).strict(),
});
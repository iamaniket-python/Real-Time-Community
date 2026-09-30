import { z } from 'zod';

export const setCategoriesSchema = z.object({
  body: z
    .object({
      categoryIds: z.array(z.number().int().positive()).min(1).max(10),
    })
    .strict(),
});

export const availabilitySchema = z.object({
  body: z
    .object({
      isAvailable: z.boolean(),
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
    })
    .strict()
    .refine((b) => !b.isAvailable || (b.lat !== undefined && b.lng !== undefined), {
      message: 'lat and lng are required when going online',
      path: ['lat'],
    }),
});
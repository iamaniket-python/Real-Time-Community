import { z } from 'zod';

const id = z.string().uuid();
const name = z.string().trim().min(2).max(120);
const description = z.string().trim().max(2000);
const pricePaise = z.number().int().min(1).max(100_000_000);
const stock = z.number().int().min(0).max(1_000_000);

export const createProductSchema = z.object({
  body: z.object({
    name,
    description: description.optional(),
    pricePaise,
    stock,
  }).strict(),
});

export const updateProductSchema = z.object({
  params: z.object({ id }),
  body: z.object({
    name: name.optional(),
    description: description.optional(),
    pricePaise: pricePaise.optional(),
    stock: stock.optional(),
    isActive: z.boolean().optional(),
  }).strict().refine((b) => Object.keys(b).length > 0, { message: 'Nothing to update' }),
});

export const productIdSchema = z.object({ params: z.object({ id }) });

export const listProductsSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().max(200).optional(),
  }),
});

export const shopProductsSchema = z.object({
  params: z.object({ id }),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().max(200).optional(),
  }),
});
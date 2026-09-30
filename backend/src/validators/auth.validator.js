import { z } from 'zod';

const password = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(72, 'Password is too long') // bcrypt ignores anything past 72 bytes
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');

export const registerSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(100),
      email: z.string().trim().toLowerCase().email().max(254),
      phone: z
        .string()
        .trim()
        .regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number')
        .optional(),
      password,
      // ADMIN can never be self-registered
      role: z.enum(['USER', 'HELPER']).default('USER'),
    })
    .strict(), // rejects unknown fields
});

export const loginSchema = z.object({
  body: z
    .object({
      email: z.string().trim().toLowerCase().email(),
      password: z.string().min(1).max(72),
    })
    .strict(),
});
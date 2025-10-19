import { z } from 'zod';

export const coinsGrantSchema = z.object({
  type: z.literal('coins'),
  amount: z.number().positive('amount must be positive'),
  reason: z.string().optional(),
});

export const subscriptionGrantSchema = z.object({
  type: z.literal('subscription'),
  plan: z.string().min(1, 'plan is required'),
});

export const grantSchema = z.discriminatedUnion('type', [
  coinsGrantSchema,
  subscriptionGrantSchema,
]);

export const grantRequestSchema = z.object({
  profileId: z.string().min(1, 'profileId is required'),
  grant: grantSchema,
});

export const iapVerifySchema = z.object({
  profileId: z.string().min(1, 'profileId is required'),
  grant: grantSchema.optional(),
});

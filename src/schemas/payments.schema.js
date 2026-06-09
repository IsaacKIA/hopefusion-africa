import { z } from 'zod';

export const paystackInitializeSchema = z.object({
  email: z.string().email('Invalid email address'),
  amount_usd: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency code must be exactly 3 characters').optional(),
  plan: z.string().trim().optional(),
  callback_url: z.string().trim().url('Invalid callback URL').optional(),
  channels: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export const momoCollectSchema = z.object({
  phone: z.string().trim().min(5, 'Invalid phone number format'),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().length(3).optional(),
  reference: z.string().trim().optional(),
  description: z.string().trim().optional(),
  payer_name: z.string().trim().optional(),
});

export const momoDisburseSchema = z.object({
  phone: z.string().trim().min(5, 'Invalid phone number format'),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().length(3).optional(),
  reference: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export const flutterwaveInitializeSchema = z.object({
  email: z.string().email('Invalid email address'),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().length(3).optional(),
  phone: z.string().trim().optional(),
  name: z.string().trim().min(1, 'Customer name is required'),
  tx_ref: z.string().trim().optional(),
  redirect_url: z.string().trim().url('Invalid redirect URL').optional(),
  payment_options: z.string().trim().optional(),
  meta: z.record(z.any()).optional(),
});

export const escrowCreateSchema = z.object({
  startup_id: z.string().uuid('Invalid startup UUID format'),
  investor_id: z.string().uuid('Invalid investor UUID format'),
  amount: z.coerce.number().positive('Total amount must be positive'),
  currency: z.string().length(3).optional(),
  milestones: z.array(z.object({
    title: z.string().trim().min(1, 'Milestone title cannot be empty'),
    amount: z.coerce.number().positive('Milestone amount must be positive'),
    due_date: z.string().trim().optional(),
    evidence_required: z.boolean().optional(),
  })).min(1, 'At least one milestone is required'),
});

export const escrowReleaseSchema = z.object({
  evidence_url: z.string().trim().url('Invalid evidence URL format').optional(),
  notes: z.string().trim().optional(),
});

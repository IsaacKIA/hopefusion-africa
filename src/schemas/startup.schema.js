import { z } from 'zod';

export const startupProfileSchema = z.object({
  name: z.string().trim().min(1, 'Startup name cannot be empty').optional(),
  tagline: z.string().trim().optional(),
  description: z.string().trim().optional(),
  sector: z.string().trim().optional(),
  country: z.string().trim().optional(),
  city: z.string().trim().optional(),
  stage: z.enum(['idea', 'mvp', 'early_traction', 'growth', 'series_a', 'established']).optional(),
  founded_year: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  team_size: z.number().int().nonnegative().optional(),
  website_url: z.string().trim().url('Invalid website URL').or(z.literal('')).optional(),
  funding_goal: z.number().int().nonnegative().optional(),
  funding_type: z.array(z.string()).optional(),
  sdgs: z.array(z.number().int().min(1).max(17)).optional(),
  is_women_led: z.boolean().optional(),
  annual_revenue: z.number().int().nonnegative().optional(),
  mrr: z.number().int().nonnegative().optional(),
  customers: z.number().int().nonnegative().optional(),
});

export const investorProfileSchema = z.object({
  firm_name: z.string().trim().min(1, 'Firm name cannot be empty').optional(),
  investor_type: z.enum(['angel', 'vc', 'impact', 'family_office', 'corporate', 'government']).optional(),
  thesis: z.string().trim().optional(),
  sectors: z.array(z.string()).optional(),
  stages: z.array(z.string()).optional(),
  countries: z.array(z.string()).optional(),
  sdgs: z.array(z.number().int().min(1).max(17)).optional(),
  ticket_min: z.number().int().nonnegative().optional(),
  ticket_max: z.number().int().nonnegative().optional(),
  instruments: z.array(z.string()).optional(),
  portfolio_count: z.number().int().nonnegative().optional(),
  total_deployed: z.number().int().nonnegative().optional(),
});

export const mentorProfileSchema = z.object({
  expertise: z.array(z.string()).optional(),
  industries: z.array(z.string()).optional(),
  countries: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  hourly_rate: z.number().int().nonnegative().optional(),
  session_types: z.array(z.string()).optional(),
  max_mentees: z.number().int().nonnegative().optional(),
  bio_extended: z.string().trim().optional(),
  is_available: z.boolean().optional(),
});


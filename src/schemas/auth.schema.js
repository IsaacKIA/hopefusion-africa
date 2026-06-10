import { z } from 'zod';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const registerSchema = z.object({
  email: z.string()
    .trim()
    .email('Invalid email format')
    .toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(passwordRegex, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  role: z.enum(['startup', 'investor', 'mentor'], {
    errorMap: () => ({ message: 'Role must be startup, investor, or mentor' }),
  }),
  first_name: z.string()
    .trim()
    .min(1, 'First name is required'),
  last_name: z.string()
    .trim()
    .min(1, 'Last name is required'),
  phone: z.string()
    .trim()
    .optional(),
  country: z.string()
    .trim()
    .optional(),
  linkedin_url: z.string()
    .trim()
    .optional(),

  // Startup role specific fields
  startup_name: z.string().trim().optional(),
  sector: z.string().trim().optional(),
  stage: z.string().trim().optional(),
  startup_country: z.string().trim().optional(),
  team_size: z.number().int().nonnegative().optional(),
  funding_goal: z.number().int().nonnegative().optional(),
  funding_type: z.string().trim().optional(),
  sdgs: z.array(z.number().int().min(1).max(17)).optional(),
  is_women_led: z.boolean().optional(),
  startup_tagline: z.string().trim().optional(),
  startup_website: z.string().trim().optional(),

  // Investor role specific fields
  investor_type: z.string().trim().optional(),
  firm_name: z.string().trim().optional(),
  ticket_min: z.number().int().nonnegative().optional(),
  ticket_max: z.number().int().nonnegative().optional(),
  sectors: z.array(z.string()).optional(),
  stages: z.array(z.string()).optional(),
  countries: z.array(z.string()).optional(),
  instruments: z.array(z.string()).optional(),
  firm_website: z.string().trim().optional(),

  // Mentor role specific fields
  expertise: z.array(z.string()).optional(),
  session_types: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  experience_years: z.coerce.number().int().nonnegative().optional(),
  max_mentees: z.number().int().nonnegative().optional(),
  hourly_rate: z.number().int().nonnegative().optional(),
  current_role: z.string().trim().optional(),
  mentor_bio: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: z.string()
    .trim()
    .email('Invalid email format')
    .toLowerCase(),
  password: z.string()
    .min(1, 'Password is required'),
});

export const verifySchema = z.object({
  code: z.string()
    .trim()
    .length(6, 'Verification code must be exactly 6 digits'),
});

export const forgotPasswordSchema = z.object({
  email: z.string()
    .trim()
    .min(1, 'Email or phone number is required')
    .transform(val => val.includes('@') ? val.toLowerCase() : val),
});

export const resetPasswordSchema = z.object({
  email: z.string()
    .trim()
    .min(1, 'Email or phone number is required')
    .transform(val => val.includes('@') ? val.toLowerCase() : val),
  code: z.string()
    .trim()
    .length(6, 'Reset code must be exactly 6 digits'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(passwordRegex, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
});

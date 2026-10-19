import { z } from 'zod';
import { normalizeNiche, normalizePhone } from '../lib/sanitize';

/** Reusable field schemas shared by every niche. Inputs are already sanitised by `withApi`. */

export const nicheField = z
  .string()
  .max(60)
  .optional()
  .transform((value) => normalizeNiche(value, 'general'));

export const nameField = z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long');

export const phoneField = z
  .string()
  .trim()
  .max(30, 'Phone number is too long')
  .transform((value, ctx) => {
    const normalized = normalizePhone(value);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid phone number (7–15 digits, optional +country code)' });
      return z.NEVER;
    }
    return normalized;
  });

export const emailField = z.string().trim().toLowerCase().email('Invalid email format').max(254);

export const shortText = (max = 200) => z.string().trim().max(max);

/** Accepts ISO dates ("2026-10-21"), datetimes, or free-form slot labels ("Tue Oct 21, 3:00 PM"). */
export const dateTimeField = z
  .string()
  .trim()
  .min(3, 'Appointment date is required')
  .max(60, 'Appointment date is too long')
  .refine((value) => {
    // If it parses as a date, make sure it is not absurdly far in the past or future.
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return true; // free-form label – allowed
    const now = Date.now();
    return parsed > now - 1000 * 60 * 60 * 24 * 365 && parsed < now + 1000 * 60 * 60 * 24 * 365 * 3;
  }, 'Appointment date is out of the accepted range');

export const commonLeadValidator = z.object({
  name: nameField,
  email: emailField,
  phone: phoneField,
  niche: nicheField,
  message: z.string().trim().max(2000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export function validateInput<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: boolean; data?: T; error?: string; errors?: Record<string, string[]> } {
  const result = schema.safeParse(data);

  if (!result.success) {
    const fieldErrors = z.flattenError(result.error).fieldErrors as Record<string, string[]>;
    const errorMessage = Object.entries(fieldErrors)
      .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
      .join(' | ');

    return { success: false, error: errorMessage || 'Validation failed', errors: fieldErrors };
  }

  return { success: true, data: result.data };
}

export const specializedLeadValidator = commonLeadValidator.extend({
  serviceType: z.string().trim().min(2, 'Service type is required').max(120),
  preferredDate: z.string().trim().max(60).optional(),
});

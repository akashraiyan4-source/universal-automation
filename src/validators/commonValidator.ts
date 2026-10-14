import { z } from 'zod';

export const commonLeadValidator = z.object({
  name: z.string().min(2, "Name is required and should be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  phone: z.string().min(10, "Valid phone number is required"),
  niche: z.string().optional(),
  message: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: boolean; data?: T; error?: string; errors?: Record<string, string[]> } {
  const result = schema.safeParse(data);

  if (!result.success) {
    const flattened = result.error.flatten();
    const fieldErrors = flattened.fieldErrors as Record<string, string[]>;
    
    const errorMessage = Object.entries(fieldErrors)
      .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
      .join(' | ');

    return {
      success: false,
      error: errorMessage || 'Validation failed',
      errors: fieldErrors,
    };
  }

  return { success: true, data: result.data };
}

export const specializedLeadValidator = commonLeadValidator.extend({
  serviceType: z.string().min(2, "Service type is required"),
  preferredDate: z.string().optional(),
});
import { z } from 'zod';

export const commonLeadValidator = z.object({
  name: z.string().min(2, "Name is required and should be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  phone: z.string().min(10, "Valid phone number is required"),
});

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; error?: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorMessage = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: errorMessage };
  }
  return { success: true, data: result.data };
}
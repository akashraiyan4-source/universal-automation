import { z } from 'zod';
import { ok, parseJson } from '../lib/api';
import { withIdempotency } from '../lib/idempotency';
import { maskPhone, normalizePhone } from '../lib/sanitize';
import { logger } from '../middlewares/logger';
import { ApiError } from '../middlewares/errorHandler';
import { dateTimeField, nicheField, phoneField } from '../validators/commonValidator';
import { createAppointment, findDuplicate } from './appointmentService';

/**
 * Shared implementation behind `/booking/book` and `/booking/create`.
 *
 * - Niche-agnostic: the `niche` field is just a label, nothing here is dental-specific.
 * - Duplicate-safe on two levels: (1) request-level idempotency (key or payload fingerprint)
 *   guards double-clicks/retries, (2) a persistent active-appointment check guards re-submissions later on.
 */

const baseFields = {
  fullName: z.string().trim().max(100).optional(),
  name: z.string().trim().max(100).optional(),
  clientName: z.string().trim().max(100).optional(),
  patientName: z.string().trim().max(100).optional(),
  customerName: z.string().trim().max(100).optional(),
  appointmentDate: dateTimeField.optional(),
  date: dateTimeField.optional(),
  treatment: z.string().trim().max(120).optional(),
  serviceType: z.string().trim().max(120).optional(),
  niche: nicheField,
};

const strictSchema = z.object({ ...baseFields, phone: phoneField });
const lenientSchema = z.object({ ...baseFields, phone: phoneField.optional() });

interface BookingOptions {
  /** `strict` requires name + valid phone. `lenient` fills documented defaults (legacy /booking/create). */
  mode: 'strict' | 'lenient';
  scope: string;
  idPrefix: string;
  /** Message shown on a brand-new reservation. */
  successMessage: string;
}

export async function handleBooking(request: Request, options: BookingOptions): Promise<Response> {
  const input = await parseJson(request, options.mode === 'strict' ? strictSchema : lenientSchema);

  const fullName = input.fullName || input.name || input.clientName || input.patientName || input.customerName || '';
  if (options.mode === 'strict' && fullName.length < 2) {
    throw new ApiError('Name must be at least 2 characters.', 400, { fullName: ['Name must be at least 2 characters'] });
  }

  const phone = input.phone ? (normalizePhone(input.phone) ?? 'Not Provided') : 'Not Provided';
  const candidate = {
    fullName: fullName || 'Valued Client',
    phone,
    appointmentDate:
      input.appointmentDate || input.date || (options.mode === 'strict' ? 'Next available priority slot' : new Date().toISOString()),
    treatment: input.treatment || input.serviceType || 'General Consultation',
    niche: input.niche,
  };

  const fingerprint = [candidate.niche, candidate.phone, candidate.fullName, candidate.appointmentDate, candidate.treatment]
    .map((part) => part.toLowerCase())
    .join('|');

  return withIdempotency(request, {
    scope: options.scope,
    fingerprint,
    execute: async () => {
      if (candidate.phone !== 'Not Provided') {
        const existing = findDuplicate(candidate);
        if (existing) {
          return ok(
            { appointment: existing, duplicate: true },
            {
              message: 'This appointment is already booked – returning the existing reservation.',
              legacy: { appointment: existing, duplicate: true },
            }
          );
        }
      }

      const appointment = createAppointment(candidate, options.idPrefix);
      logger.info('appointment.created', { id: appointment.id, niche: appointment.niche, phone: maskPhone(appointment.phone) });

      return ok({ appointment }, { status: 201, message: options.successMessage, legacy: { appointment } });
    },
  });
}

import { z } from 'zod';
import { ok, parseJson, withApi } from '@/src/lib/api';
import { ApiError } from '@/src/middlewares/errorHandler';
import { logger } from '@/src/middlewares/logger';
import { normalizePhone } from '@/src/lib/sanitize';
import { findActive } from '@/src/services/appointmentService';
import { nicheField, phoneField } from '@/src/validators/commonValidator';

const schema = z.object({
  appointmentId: z.string().trim().max(64).optional(),
  phone: phoneField.optional(),
  niche: nicheField,
});

/** POST /booking/confirm   (alias: POST /api/appointment-confirm) */
export const POST = withApi(async (request) => {
  const input = await parseJson(request, schema);
  if (!input.appointmentId && !input.phone) {
    throw new ApiError('Valid appointmentId or phone is required to confirm.', 400);
  }

  const appointment = findActive({
    id: input.appointmentId,
    phone: input.phone ? normalizePhone(input.phone) : null,
    niche: input.niche !== 'general' ? input.niche : undefined,
  });
  if (!appointment) throw new ApiError('Appointment not found matching the provided details.', 404);

  appointment.status = 'CONFIRMED';
  appointment.confirmedAt = appointment.confirmedAt ?? new Date().toISOString();
  appointment.updatedAt = new Date().toISOString();
  logger.info('appointment.confirmed', { id: appointment.id, niche: appointment.niche });

  return ok({ appointment }, { message: 'Appointment successfully confirmed!', legacy: { appointment } });
});

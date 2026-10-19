import { z } from 'zod';
import { ok, parseJson, withApi } from '@/src/lib/api';
import { ApiError } from '@/src/middlewares/errorHandler';
import { logger } from '@/src/middlewares/logger';
import { normalizePhone } from '@/src/lib/sanitize';
import { findActive } from '@/src/services/appointmentService';
import { dateTimeField, nicheField, phoneField } from '@/src/validators/commonValidator';

const schema = z.object({
  appointmentId: z.string().trim().max(64).optional(),
  phone: phoneField.optional(),
  newDate: dateTimeField,
  reason: z.string().trim().max(500).optional(),
  niche: nicheField,
});

/** POST /booking/reschedule   (alias: POST /api/appointment-reschedule) */
export const POST = withApi(async (request) => {
  const input = await parseJson(request, schema);
  if (!input.appointmentId && !input.phone) {
    throw new ApiError('Valid appointmentId or phone is required for rescheduling.', 400);
  }

  const appointment = findActive({
    id: input.appointmentId,
    phone: input.phone ? normalizePhone(input.phone) : null,
    niche: input.niche !== 'general' ? input.niche : undefined,
  });
  if (!appointment) throw new ApiError('Active appointment not found matching the provided details.', 404);

  if (appointment.appointmentDate.trim().toLowerCase() !== input.newDate.toLowerCase()) {
    appointment.previousDate = appointment.appointmentDate;
    appointment.appointmentDate = input.newDate;
    appointment.status = 'RESCHEDULED';
    appointment.rescheduleReason = input.reason || 'Client requested rescheduling';
    appointment.updatedAt = new Date().toISOString();
    logger.info('appointment.rescheduled', { id: appointment.id, niche: appointment.niche });
  }

  return ok({ appointment }, { message: 'Appointment rescheduled successfully!', legacy: { appointment } });
});

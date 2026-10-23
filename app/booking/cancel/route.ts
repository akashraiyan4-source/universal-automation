import { z } from 'zod';
import { ok, parseJson, withApi } from '@/src/lib/api';
import { ApiError } from '@/src/middlewares/errorHandler';
import { logger } from '@/src/middlewares/logger';
import { normalizePhone } from '@/src/lib/sanitize';
import { findActive, findById } from '@/src/services/appointmentService';
import { nicheField, phoneField } from '@/src/validators/commonValidator';

const schema = z.object({
  appointmentId: z.string().trim().max(64).optional(),
  phone: phoneField.optional(),
  niche: nicheField,
  cancellationReason: z.string().trim().max(500).optional(),
});

/** POST /booking/cancel   (alias: POST /api/appointment-cancel) – idempotent. */
export const POST = withApi(async (request) => {
  const input = await parseJson(request, schema);
  if (!input.appointmentId && !input.phone) {
    throw new ApiError('Valid phone or appointmentId is required for cancellation.', 400);
  }

  const phone = input.phone ? normalizePhone(input.phone) : null;
  const target =
    findActive({ id: input.appointmentId, phone, niche: input.niche !== 'general' ? input.niche : undefined }) ??
    (input.appointmentId ? findById(input.appointmentId) : undefined);

  if (!target) throw new ApiError('Active appointment not found matching the provided identifier.', 404);

  if (target.status !== 'CANCELLED') {
    target.status = 'CANCELLED';
    target.cancellationReason = input.cancellationReason || 'Not specified';
    target.cancelledAt = new Date().toISOString();
    logger.info('appointment.cancelled', { id: target.id, niche: target.niche });
  }

  return ok({ appointment: target }, { message: 'Appointment cancelled successfully.', legacy: { appointment: target } });
});

export { OPTIONS, HEAD } from '@/src/lib/preflight';

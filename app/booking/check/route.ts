import { z } from 'zod';
import { ok, withApi } from '@/src/lib/api';
import { ApiError, zodDetails } from '@/src/middlewares/errorHandler';
import { findActive, maskName } from '@/src/services/appointmentService';
import { nicheField, phoneField } from '@/src/validators/commonValidator';

const querySchema = z.object({ phone: phoneField, niche: nicheField });

/**
 * GET /booking/check?phone=…&niche=…   (alias: GET /api/appointment-check)
 * Lookup is by phone only, so the response is intentionally minimised (masked name, no contact data).
 */
export const GET = withApi(async (request) => {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    phone: searchParams.get('phone') ?? '',
    niche: searchParams.get('niche') ?? undefined,
  });
  if (!parsed.success) {
    throw new ApiError('A valid phone query parameter is required.', 400, zodDetails(parsed.error));
  }

  const { phone, niche } = parsed.data;
  const appointment = findActive({ phone, niche: niche !== 'general' ? niche : undefined });
  if (!appointment) throw new ApiError('No active appointment found for this phone number.', 404);

  const summary = {
    id: appointment.id,
    fullName: maskName(appointment.fullName),
    appointmentDate: appointment.appointmentDate,
    treatment: appointment.treatment,
    niche: appointment.niche,
    status: appointment.status,
  };
  return ok({ appointment: summary }, { legacy: { appointment: summary } });
});

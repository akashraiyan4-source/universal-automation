import { withApi } from '@/src/lib/api';
import { handleBooking } from '@/src/services/bookingHandler';

/**
 * POST /booking/book   (alias: POST /api/booking)
 * Universal booking engine – works for any niche via the `niche` field.
 * Safe against double-clicks: send an `Idempotency-Key` header (recommended) or rely on payload de-duplication.
 */
export const POST = withApi((request) =>
  handleBooking(request, {
    mode: 'strict',
    scope: 'booking.book',
    idPrefix: 'apt',
    successMessage: 'Appointment booked successfully.',
  })
);

export { OPTIONS, HEAD } from '@/src/lib/preflight';

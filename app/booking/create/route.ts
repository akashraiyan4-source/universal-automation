import { withApi } from '@/src/lib/api';
import { handleBooking } from '@/src/services/bookingHandler';

/**
 * POST /booking/create   (alias: POST /api/appointment-create)
 * Lenient reservation endpoint: accepts alternate keys (`name`, `date`) and fills documented defaults.
 */
export const POST = withApi((request) =>
  handleBooking(request, {
    mode: 'lenient',
    scope: 'booking.create',
    idPrefix: 'apt_create',
    successMessage: 'Slot reserved successfully.',
  })
);

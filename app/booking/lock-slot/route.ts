import { z } from 'zod';
import { ok, parseJson, withApi } from '@/src/lib/api';
import { kv } from '@/src/lib/kv';
import { sha256Hex } from '@/src/lib/idempotency';
import { normalizePhone } from '@/src/lib/sanitize';
import { ApiError } from '@/src/middlewares/errorHandler';
import { nicheField, phoneField } from '@/src/validators/commonValidator';
import { newAppointmentId } from '@/src/services/appointmentService';

const LOCK_SECONDS = 10 * 60;

const schema = z.object({
  slotTime: z.string().trim().min(2, 'Slot time is required').max(60),
  userPhone: phoneField.optional(),
  phone: phoneField.optional(),
  niche: nicheField,
});

interface SlotLock {
  lockId: string;
  owner: string;
  expiresAt: string;
}

/**
 * POST /booking/lock-slot   (alias: POST /api/slot-lock)
 * Holds a slot for 10 minutes. The lock is real: a second client asking for the same
 * slot receives 409 until it expires; the same client simply refreshes its own lock.
 */
export const POST = withApi(async (request) => {
  const input = await parseJson(request, schema);
  const owner = (input.userPhone || input.phone ? normalizePhone(input.userPhone || input.phone) : null) ?? `guest:${request.headers.get('x-client-ip') ?? 'unknown'}`;
  const key = `slot:${input.niche}:${await sha256Hex(input.slotTime.toLowerCase())}`;

  const lock: SlotLock = {
    lockId: newAppointmentId('lock'),
    owner,
    expiresAt: new Date(Date.now() + LOCK_SECONDS * 1000).toISOString(),
  };

  const acquired = await kv.setIfAbsent(key, lock, LOCK_SECONDS);
  let active = lock;

  if (!acquired) {
    const existing = await kv.get<SlotLock>(key);
    if (existing && existing.owner !== owner) {
      throw new ApiError('This time slot is currently held by another client. Please choose a different time.', 409, undefined, {
        'Retry-After': String(Math.max(1, Math.ceil((Date.parse(existing.expiresAt) - Date.now()) / 1000))),
      });
    }
    if (existing) {
      await kv.set(key, { ...existing, expiresAt: lock.expiresAt }, LOCK_SECONDS); // owner refreshes own lock
      active = { ...existing, expiresAt: lock.expiresAt };
    }
  }

  const payload = {
    lockId: active.lockId,
    slotTime: input.slotTime,
    expiresIn: '10m',
    expiresAt: active.expiresAt,
  };
  return ok(payload, { message: 'Slot locked temporarily for 10 minutes.', legacy: payload });
});

export { OPTIONS, HEAD } from '@/src/lib/preflight';

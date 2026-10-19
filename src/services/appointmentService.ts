import { appointmentsDatabase } from '@/app/db';

export type AppointmentStatus = 'CONFIRMED' | 'RESCHEDULED' | 'CANCELLED';

export interface Appointment {
  id: string;
  fullName: string;
  phone: string;
  appointmentDate: string;
  treatment: string;
  niche: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  confirmedAt?: string;
  previousDate?: string;
  rescheduleReason?: string;
}

const store = appointmentsDatabase as Appointment[];

export const newAppointmentId = (prefix = 'apt'): string => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** An identical, still-active appointment (same person, niche, slot and service). */
export function findDuplicate(input: Pick<Appointment, 'phone' | 'niche' | 'appointmentDate' | 'treatment'>): Appointment | undefined {
  return store.find(
    (apt) =>
      apt.status !== 'CANCELLED' &&
      apt.phone === input.phone &&
      apt.niche === input.niche &&
      sameText(apt.appointmentDate, input.appointmentDate) &&
      sameText(apt.treatment, input.treatment)
  );
}

export function createAppointment(
  input: Pick<Appointment, 'fullName' | 'phone' | 'appointmentDate' | 'treatment' | 'niche'>,
  idPrefix = 'apt'
): Appointment {
  const appointment: Appointment = {
    id: newAppointmentId(idPrefix),
    ...input,
    status: 'CONFIRMED',
    createdAt: new Date().toISOString(),
  };
  store.push(appointment);
  return appointment;
}

export const findById = (id: string): Appointment | undefined => store.find((apt) => apt.id === id);

/** "Jane Doe" -> "Jane D." – enough to recognise a booking without leaking full identity. */
export function maskName(fullName: string): string {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
}

/**
 * Locate an active appointment either by its unguessable id or by phone (optionally scoped to a niche).
 * Cancelled appointments are never returned, and phone lookups prefer the most recent booking.
 */
export function findActive(criteria: { id?: string; phone?: string | null; niche?: string }): Appointment | undefined {
  if (criteria.id) {
    return store.find((apt) => apt.id === criteria.id && apt.status !== 'CANCELLED');
  }
  if (criteria.phone) {
    for (let i = store.length - 1; i >= 0; i--) {
      const apt = store[i];
      if (apt.phone !== criteria.phone || apt.status === 'CANCELLED') continue;
      if (criteria.niche && apt.niche !== criteria.niche) continue;
      return apt;
    }
  }
  return undefined;
}

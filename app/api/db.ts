/**
 * Backwards-compatible alias module (`@/app/api/db`).
 *
 * Routes import their log collections from here. These MUST be the real in-memory arrays
 * from `app/db.ts` (previously they were aliased to a Supabase client, so every
 * `Array.isArray(...)` guard silently skipped the write and nothing was ever recorded).
 *
 * The Supabase client lives in `src/config/database.ts` (re-exported below).
 */
export { db } from '@/src/config/database';
export {
  costEstimatorDatabase,
  multilanguageLogs,
  noShowDatabase,
  onboardingDatabase,
  invoiceDatabase,
  recoveryDatabase,
  prepReminderDatabase,
  recallDatabase,
  referralDatabase,
  sentimentLogs,
  faqDatabase,
  vectorKnowledgeDatabase,
  whatsappLogs,
} from '../db';

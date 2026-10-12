import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const db = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder-key'
);
// Helper Mocks / Database References for individual routes
export const costEstimatorDatabase = db;
export const multilanguageLogs = db;
export const noShowDatabase = db;
export const onboardingDatabase = db;
export const invoiceDatabase = db;
export const recoveryDatabase = db;
export const prepReminderDatabase = db;
export const recallDatabase = db;
export const referralDatabase = db;
export const sentimentLogs = db;
export const faqDatabase = db;
export const vectorKnowledgeDatabase = db;
export const whatsappLogs = db;

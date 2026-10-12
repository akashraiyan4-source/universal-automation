import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn('⚠️ Warning: NEXT_PUBLIC_SUPABASE_URL is not defined in environment variables.');
}
export const supabase = createClient(supabaseUrl, supabaseKey);

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// চেক করা হচ্ছে আসল Key দেওয়া আছে নাকি Placeholder চলছে
export const isDbConfigured = Boolean(
  supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseKey.includes('placeholder')
);

if (!isDbConfigured && process.env.NODE_ENV !== 'test') {
  console.warn(
    '⚠️ [Database Warning]: Supabase credentials missing or using placeholders. Running in fallback mode.'
  );
}

// Next.js হট-রিলোডে বারবার নতুন কানেকশন তৈরি হওয়া ঠেকাতে Global Singleton
const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseClient | undefined;
};

export const db: SupabaseClient =
  globalForSupabase.supabase ??
  createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder-key',
    {
      auth: {
        persistSession: false, // ব্যাকএন্ড API-এর জন্য এটি অত্যন্ত জরুরি
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.supabase = db;
}
import { createClient } from '@supabase/supabase-js';

// Force the API endpoint format
const getSupabaseUrl = (url: string) => {
  if (!url) return '';
  // Convert the URL to use the api subdomain
  return url.replace('.co', '.supabase.co').replace('https://', 'https://api.');
};

const supabaseUrl = getSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Debug log
console.log('Supabase URL:', supabaseUrl);

// Only throw the error if we're not building
if (process.env.NODE_ENV !== 'production' && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js'
    }
  }
});

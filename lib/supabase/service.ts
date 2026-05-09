import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

/**
 * Supabase Service Role Client
 * - Bypasses RLS policies
 * - Use ONLY in secure server contexts (API routes, background jobs)
 * - NEVER expose service role key to client
 */
export const createServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service role credentials');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

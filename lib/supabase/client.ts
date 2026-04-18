import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database.types';

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL! || "https://qsigpbtijxkmivjbcjsm.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzaWdwYnRpanhrbWl2amJjanNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0ODEyMDksImV4cCI6MjA5MjA1NzIwOX0.Slf5wEU7xHBiF3BHnjbdcpoACjvAzegFurkn6h7EN0E"
  );

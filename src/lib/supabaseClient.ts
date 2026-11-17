import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, supabaseConfigured } from './env'

/**
 * Single Supabase client for the browser.
 * The anon key is public; every table is protected by Row Level Security
 * (see supabase/migrations/0001_initial_schema.sql).
 */
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

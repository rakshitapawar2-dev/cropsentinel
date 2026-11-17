/**
 * Environment / integration configuration.
 * Everything here is public by design (it ends up in the browser bundle).
 * Provider API keys must live in Supabase Edge Function secrets instead.
 */

function read(value: string | undefined): string {
  return (value ?? '').trim()
}

export const env = {
  supabaseUrl: read(import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: read(import.meta.env.VITE_SUPABASE_ANON_KEY),
  storageBucket: read(import.meta.env.VITE_SUPABASE_STORAGE_BUCKET) || 'crop-images',
  cropClinicUrl: read(import.meta.env.VITE_CROP_CLINIC_URL),
}

export const supabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey)

/** Crop image model (Python/FastAPI) is only "connected" when a URL is configured. */
export const cropClinicConfigured = Boolean(env.cropClinicUrl)

/**
 * Static integration facts. Nothing dynamic (like whether sensor readings have
 * actually arrived) belongs here — those states are derived from real records
 * at the point they are displayed.
 */
export const integrationStatus = {
  database: supabaseConfigured ? 'connected' : 'local-demo',
  ai: supabaseConfigured ? 'backend-ready' : 'local-knowledge',
  cropClinic: cropClinicConfigured ? 'configured' : 'not-connected',
  voice: 'not-connected',
} as const

// ===========================================================================
// CropSentinel — crop-clinic Edge Function
//
// Server-side proxy to the separate Python/FastAPI crop-disease model.
// Keeping the call here means the model URL and any credentials stay off the
// browser, and every request is authenticated.
//
// Deploy:  supabase functions deploy crop-clinic
// Secrets: supabase secrets set CROP_MODEL_URL=https://your-model.example
//          supabase secrets set CROP_MODEL_KEY=...   (optional bearer token)
//
// The browser may also call the model directly when VITE_CROP_CLINIC_URL is
// set during development; production should go through this function.
// ===========================================================================

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization) return json({ error: 'Missing authorization header' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const modelUrl = Deno.env.get('CROP_MODEL_URL')
  if (!supabaseUrl || !anonKey) return json({ error: 'Supabase environment is incomplete' }, 500)

  const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return json({ error: 'Not signed in' }, 401)

  if (!modelUrl) {
    return json(
      {
        available: false,
        status: 'model_unavailable',
        conditions: [],
        message:
          'Crop image analysis is not connected yet. Your image can be saved for future analysis.',
      },
      501,
    )
  }

  let payload: { image_url?: string; crop_type?: string | null; symptoms?: string | null; plant_id?: string }
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!payload.image_url) return json({ error: 'image_url is required' }, 400)

  // Ownership check: RLS only returns the plant when it belongs to this farmer.
  if (payload.plant_id) {
    const { data: plant } = await supabase.from('plants').select('id').eq('id', payload.plant_id).maybeSingle()
    if (!plant) return json({ error: 'That plant does not belong to you' }, 403)
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const modelKey = Deno.env.get('CROP_MODEL_KEY')
  if (modelKey) headers.Authorization = `Bearer ${modelKey}`

  let response: Response
  try {
    response = await fetch(`${modelUrl.replace(/\/$/, '')}/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        image_url: payload.image_url,
        crop_type: payload.crop_type ?? null,
        symptoms: payload.symptoms ?? null,
        plant_id: payload.plant_id ?? null,
      }),
    })
  } catch (error) {
    return json({ error: `Crop model unreachable: ${String(error)}` }, 502)
  }

  if (!response.ok) {
    return json({ error: `Crop model error (${response.status})` }, 502)
  }

  const result = await response.json()
  // Pass the model output through unchanged: no scores are invented here.
  return json(result)
})

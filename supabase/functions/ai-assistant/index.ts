// ===========================================================================
// CropSentinel — ai-assistant Edge Function
//
// Keeps the provider API key on the server and grounds answers in the
// authenticated farmer's own records plus the agricultural knowledge table.
// Deploy:   supabase functions deploy ai-assistant
// Secrets:  supabase secrets set OPENAI_API_KEY=... AI_MODEL=gpt-4o-mini
//
// Required secrets (never put these in the browser):
//   OPENAI_API_KEY   provider key (OpenAI-compatible API)
//   AI_MODEL         optional, must be in MODEL_ALLOWLIST
//   AI_BASE_URL      optional, defaults to https://api.openai.com/v1
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are provided by
// the Supabase runtime.
// ===========================================================================

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const MODEL_ALLOWLIST = ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4o']
const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

const SYSTEM_PROMPT = `You are CropSentinel, an agricultural assistant for smallholder farmers in India.

Rules you must always follow:
1. Answer only from the provided knowledge entries and the farmer's own records. If neither supports an answer, say so plainly and ask for the crop, growth stage and what the farmer observes.
2. Never invent sensor readings, disease diagnoses, confidence scores, research references or yield numbers.
3. Symptoms are not diagnoses. Offer possible causes only when a photo analysis result is included, otherwise describe what to check.
4. Never give pesticide or fertiliser product names, doses or mixing instructions. Refer the farmer to a local agricultural extension officer or Krishi Vigyan Kendra.
5. Ask short, relevant follow-up questions when important context is missing.
6. Clearly separate general knowledge from conclusions about this farmer's plants.
7. Use simple language, short paragraphs and, when useful, numbered steps.
8. Reply in the requested language (English, Kannada or Hindi). If you must quote an English-only entry, say it is English only.
9. Never claim that hardware is connected, that a pump was operated, or that a model analysed an image unless the provided context says so.
10. For serious or spreading problems, advise contacting a qualified agricultural expert.`

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization) return json({ error: 'Missing authorization header' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !anonKey) return json({ error: 'Supabase environment is incomplete' }, 500)

  // RLS applies to this client: the function can only read the caller's rows.
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return json({ error: 'Not signed in' }, 401)
  const userId = userData.user.id

  let payload: {
    message?: string
    language?: string
    conversation_id?: string | null
    plant_id?: string | null
    has_attachment?: boolean
  }
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const message = (payload.message ?? '').trim().slice(0, 2000)
  const language = ['en', 'kn', 'hi'].includes(payload.language ?? '') ? payload.language! : 'en'
  if (!message) return json({ error: 'message is required' }, 400)

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    return json(
      {
        error:
          'The AI provider key is not set. Run: supabase secrets set OPENAI_API_KEY=... and redeploy the function.',
      },
      503,
    )
  }
  const model = Deno.env.get('AI_MODEL') ?? DEFAULT_MODEL
  if (!MODEL_ALLOWLIST.includes(model)) {
    return json({ error: 'AI_MODEL is not in the allowed model list' }, 500)
  }
  const baseUrl = (Deno.env.get('AI_BASE_URL') ?? DEFAULT_BASE_URL).replace(/\/$/, '')

  // ---- Grounding data -----------------------------------------------------
  const [{ data: farms }, { data: knowledge }] = await Promise.all([
    supabase.from('farms').select('id, farm_name, location').eq('owner_id', userId),
    supabase
      .from('agricultural_knowledge')
      .select('title, content, topic, source_name, source_url, language, verification_status')
      .in('language', Array.from(new Set([language, 'en'])))
      .limit(40),
  ])

  const farmIds = (farms ?? []).map((farm) => farm.id)
  let plants: Array<Record<string, unknown>> = []
  let observations: Array<Record<string, unknown>> = []
  if (farmIds.length > 0) {
    const { data: plantRows } = await supabase
      .from('plants')
      .select('id, plant_name, crop_type, variety, growth_stage, planting_date, location_label, farm_id')
      .in('farm_id', farmIds)
    plants = plantRows ?? []
    const plantIds = plants.map((plant) => plant.id as string)
    if (plantIds.length > 0) {
      const { data: observationRows } = await supabase
        .from('observations')
        .select('plant_id, observation_date, symptoms, soil_condition, analysis_status, analysis_result, confidence_score, farmer_notes')
        .in('plant_id', plantIds)
        .order('observation_date', { ascending: false })
        .limit(40)
      observations = observationRows ?? []
    }
  }

  const plantIds = plants.map((plant) => plant.id as string)
  const readings = plantIds.length
    ? (await supabase
        .from('sensor_readings')
        .select('plant_id, sensor_type, reading_value, unit, recorded_at, source')
        .in('plant_id', plantIds)
        .order('recorded_at', { ascending: false })
        .limit(30)).data ?? []
    : []

  const { data: history } = payload.conversation_id
    ? await supabase
        .from('messages')
        .select('sender, message_text, created_at')
        .eq('conversation_id', payload.conversation_id)
        .order('created_at', { ascending: true })
        .limit(20)
    : { data: [] as Array<{ sender: string; message_text: string; created_at: string }> }

  // Simple keyword retrieval so the model sees relevant entries first.
  const words = message.toLowerCase().split(/\W+/).filter((word) => word.length > 3)
  const scored = (knowledge ?? [])
    .map((entry) => ({
      entry,
      score: words.reduce(
        (total, word) =>
          total +
          (entry.title.toLowerCase().includes(word) ? 3 : 0) +
          (entry.content.toLowerCase().includes(word) ? 1 : 0) +
          (entry.language === language ? 1 : 0),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .filter((item) => item.score > 0)
    .map((item) => item.entry)

  const context = {
    farmer: {
      farms: farms ?? [],
      plants,
      recent_observations: observations,
      sensor_readings: readings,
      crop_image_analysis_connected: Boolean(Deno.env.get('CROP_MODEL_URL')),
    },
    relevant_knowledge: scored,
    conversation_history: history ?? [],
    attachment_received: Boolean(payload.has_attachment),
    focus_plant_id: payload.plant_id ?? null,
  }

  // ---- Model call ---------------------------------------------------------
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'system',
      content: `Farmer context (JSON). Only these values may be presented as the farmer's own data:\n${JSON.stringify(context)}`,
    },
    ...((history ?? []) as Array<{ sender: string; message_text: string }>).map((item) => ({
      role: item.sender === 'farmer' ? 'user' : 'assistant',
      content: item.message_text,
    })),
    { role: 'user', content: message },
  ]

  let completion: Response
  try {
    completion = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 700,
      }),
    })
  } catch (error) {
    return json({ error: `Could not reach the AI provider: ${String(error)}` }, 502)
  }

  if (!completion.ok) {
    const detail = await completion.text()
    return json({ error: `AI provider error (${completion.status})`, detail: detail.slice(0, 400) }, 502)
  }

  const result = (await completion.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = result.choices?.[0]?.message?.content?.trim()
  if (!text) return json({ error: 'The AI provider returned an empty answer' }, 502)

  return json({
    text,
    sources: scored.map((entry) => ({
      title: entry.title,
      source_name: entry.source_name,
      source_url: entry.source_url,
      verification_status: entry.verification_status,
      language: entry.language,
    })),
    used_farm_data: plants.length > 0 || (farms ?? []).length > 0,
    follow_ups: [],
    model,
  })
})

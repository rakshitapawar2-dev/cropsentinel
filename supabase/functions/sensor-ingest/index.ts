// ===========================================================================
// CropSentinel — sensor-ingest Edge Function
//
// Write-only ingest endpoint for the Arduino / laptop gateway.
// The gateway proves it is trusted with a shared key (never a user password),
// and the function uses the service role to insert a reading for a plant.
//
// Deliberately NOT included: any pump-control endpoint. Irrigation hardware
// must never be driven by this function or by an AI model. See docs/INTEGRATIONS.md.
//
// Deploy:  supabase functions deploy sensor-ingest
// Secrets: supabase secrets set SENSOR_GATEWAY_KEY=<long random string>
//
// Example request:
//   curl -X POST "$SUPABASE_URL/functions/v1/sensor-ingest" \
//     -H "x-gateway-key: $SENSOR_GATEWAY_KEY" \
//     -H "content-type: application/json" \
//     -d '{"plant_id":"<uuid>","sensor_type":"soil_moisture","reading_value":42.5,"unit":"%"}'
// ===========================================================================

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const ALLOWED_SENSORS = ['soil_moisture', 'soil_temperature', 'air_temperature', 'humidity']

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return diff === 0
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const expectedKey = Deno.env.get('SENSOR_GATEWAY_KEY') ?? ''
  const providedKey = request.headers.get('x-gateway-key') ?? ''
  if (!expectedKey) return json({ error: 'SENSOR_GATEWAY_KEY is not configured' }, 503)
  if (!constantTimeEqual(expectedKey, providedKey)) return json({ error: 'Unauthorized gateway' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json({ error: 'Supabase environment is incomplete' }, 500)

  let payload: {
    plant_id?: string
    sensor_type?: string
    reading_value?: number
    unit?: string
    recorded_at?: string
  }
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const sensorType = payload.sensor_type ?? 'soil_moisture'
  if (!ALLOWED_SENSORS.includes(sensorType)) return json({ error: 'Unsupported sensor_type' }, 400)
  if (!payload.plant_id) return json({ error: 'plant_id is required' }, 400)

  const value = Number(payload.reading_value)
  if (!Number.isFinite(value)) return json({ error: 'reading_value must be a number' }, 400)
  // Reject implausible values from a miswired or failing sensor.
  if (sensorType === 'soil_moisture' && (value < 0 || value > 100)) {
    return json({ error: 'soil_moisture must be between 0 and 100' }, 422)
  }
  if (sensorType !== 'soil_moisture' && (value < -40 || value > 120)) {
    return json({ error: 'reading_value is outside the plausible range' }, 422)
  }

  const admin = createClient(supabaseUrl, serviceKey)
  const { data: plant, error: plantError } = await admin
    .from('plants')
    .select('id')
    .eq('id', payload.plant_id)
    .maybeSingle()
  if (plantError) return json({ error: plantError.message }, 500)
  if (!plant) return json({ error: 'Unknown plant_id' }, 404)

  const { data, error } = await admin
    .from('sensor_readings')
    .insert({
      plant_id: payload.plant_id,
      sensor_type: sensorType,
      reading_value: value,
      unit: payload.unit ?? (sensorType === 'soil_moisture' ? '%' : 'C'),
      recorded_at: payload.recorded_at ?? new Date().toISOString(),
      source: 'arduino_gateway',
    })
    .select('id, recorded_at')
    .single()

  if (error) return json({ error: error.message }, 500)

  return json({ ok: true, reading: data })
})

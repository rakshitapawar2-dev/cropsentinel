# CropSentinel — integration guide

Every integration below is optional. When one is not configured the app keeps
working and says so in the interface — no fake readings, diagnoses or scores.

| Integration | Status without setup | What turns it on |
| --- | --- | --- |
| Supabase (Postgres, Auth, Storage, RLS) | Local demo mode, data in this browser | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, migration applied |
| AI assistant model | Local knowledge-base engine | `ai-assistant` Edge Function deployed + `OPENAI_API_KEY` secret |
| Crop image model | Photos saved only, `model_unavailable` | `crop-clinic` function + `CROP_MODEL_URL`, or `VITE_CROP_CLINIC_URL` for local development |
| Soil moisture sensor | "No sensor gateway connected" | `sensor-ingest` function + `SENSOR_GATEWAY_KEY`, gateway posting readings |
| Pump control | Disabled by design | Not implemented — see safety rules below |
| Voice input / speech | Microphone shown disabled | Future speech-to-text + text-to-speech provider |
| Weather | Not connected; chat says so | Future weather API behind a backend function |

---

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the schema — either:
   - `supabase link --project-ref <ref>` then `supabase db push`, or
   - paste `supabase/migrations/0001_initial_schema.sql` into the SQL editor.
3. Copy **Project URL** and **anon public key** into `.env`:

   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   VITE_SUPABASE_STORAGE_BUCKET=crop-images
   ```

4. Restart `npm run dev`. The header now reads "Connected to Supabase" and the
   app requires a real sign-in.

The migration creates all tables, indexes, a profile trigger on sign-up, a
public `crop-images` storage bucket with per-user write policies, and Row Level
Security policies so a farmer only reads their own rows. The knowledge table is
readable by every authenticated user and writable only by admins.

### Making an administrator

```sql
update public.profiles set role = 'admin' where id = '<auth user uuid>';
```

The first sign-up gets `role = 'farmer'`; promote it once from the SQL editor.

### Storage privacy

The bucket is public for simple `<img>` rendering: anyone with an exact image
URL can load it. If crop photos must be private, make the bucket private and
switch `SupabaseSource.uploadCropImage` to return a signed URL.

---

## 2. AI assistant (Edge Function)

```bash
supabase functions deploy ai-assistant
supabase secrets set OPENAI_API_KEY=sk-...        # never put this in .env
supabase secrets set AI_MODEL=gpt-4o-mini        # optional
# supabase secrets set AI_BASE_URL=https://api.openai.com/v1   # for compatible providers
```

What the function does:

- authenticates the caller and reads **only** their rows (RLS applies);
- retrieves the most relevant `agricultural_knowledge` entries for the question
  and the active language;
- builds a context object with farms, plants, recent observations and sensor
  readings, and instructs the model to treat that as the only farm data;
- returns `{ text, sources[], used_farm_data, follow_ups[] }`.

The system prompt forbids invented readings/diagnoses, pesticide or fertiliser
dosages, and claims that hardware or an image model is active.

To swap providers, change `AI_BASE_URL` to any OpenAI-compatible endpoint and
add its model to `MODEL_ALLOWLIST` in `supabase/functions/ai-assistant/index.ts`.

### Retrieval-augmented generation (next step)

The function already retrieves before generating. To move to embeddings:

1. add `pgvector` and an `embedding vector(1536)` column on
   `agricultural_knowledge`;
2. embed entries on insert (Edge Function or trigger);
3. replace the keyword scoring block with an `match_knowledge` RPC.

Nothing in the React app changes: it only consumes the function response.

---

## 3. Crop image model (Python / FastAPI)

The model is a separate service; CropSentinel never pretends it exists.

### Contract

```
POST {base}/analyze
Content-Type: application/json

{
  "image_url": "https://.../crop-images/<user>/<file>.jpg",
  "crop_type": "Tomato",
  "symptoms": "brown spots with yellow halos on lower leaves",
  "plant_id": "<uuid>",
  "language": "en"
}

200 OK
{
  "conditions": [
    { "name": "Early blight (Alternaria solani)", "confidence": 0.72 }
  ],
  "model_version": "tomato-v0.3",
  "message": "Optional note for the farmer"
}
```

Rules the backend and the UI both enforce:

- `confidence` must be a real model output between 0 and 1, otherwise `null`;
- an empty `conditions` list means "no supported result", not a diagnosis;
- nothing is stored as a diagnosis — observations keep the raw model text and
  `analysis_status` / `confidence_score`.

### Minimal FastAPI skeleton

```python
# model_service/main.py
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class AnalyzeRequest(BaseModel):
    image_url: str
    crop_type: str | None = None
    symptoms: str | None = None
    plant_id: str | None = None
    language: str = "en"

@app.post("/analyze")
def analyze(payload: AnalyzeRequest):
    # Load your model, fetch payload.image_url, run inference.
    # Return real results only.
    return {"conditions": [], "model_version": "unset", "message": "No supported result"}
```

Deploy it, then either:

- **production:** `supabase secrets set CROP_MODEL_URL=https://model.example` and
  deploy the `crop-clinic` function (keeps the URL/key server-side), or
- **local development:** set `VITE_CROP_CLINIC_URL=http://localhost:8000` in
  `.env` so the browser calls it directly while iterating on the model.

---

## 4. Arduino soil-moisture gateway

Planned hardware: Arduino Uno, capacitive soil-moisture sensor, relay module,
DC mini pump, reservoir, laptop running the gateway.

```
sensor -> Arduino -> serial (USB) -> gateway script -> sensor-ingest function -> PostgreSQL
```

Gateway request:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/sensor-ingest" \
  -H "x-gateway-key: $SENSOR_GATEWAY_KEY" \
  -H "content-type: application/json" \
  -d '{"plant_id":"<uuid>","sensor_type":"soil_moisture","reading_value":42.5,"unit":"%"}'
```

- readings are written with the service role, never from the browser;
- implausible values (outside 0–100 % for moisture) are rejected;
- thresholds live per plant in the UI (stored in the browser for now — move them
  into a `plants` column when the hardware is real);
- the app only ever *reads* readings. It never sends a hardware command.

### Pump control: deliberately absent

If pump control is added later it must:

1. run in an authenticated backend function that checks `owns_plant`;
2. enforce a maximum run time and a minimum interval between runs;
3. require an explicit confirmation from the farmer;
4. log an `irrigation_events` row with `pump_status` and moisture before/after;
5. never be callable from a language model's output.

`requestPumpActivation()` in `src/services/irrigationService.ts` is a stub that
throws — nothing pretends the pump can be operated today.

---

## 5. Voice input and speech output

`ChatComposer` renders a disabled microphone with
"Voice input is not connected yet" in its accessible name. To enable it:

1. add a speech-to-text provider call (browser Web Speech API or a backend
   transcription function);
2. put the result into the composer, never auto-send;
3. add text-to-speech behind an explicit speaker button;
4. keep provider keys in a backend function, as with the AI model.

---

## 6. Weather

No weather data is shown today, and the assistant says so when asked. A future
integration should fetch the forecast in a backend function (key on the server)
and inject a short summary into the assistant context.

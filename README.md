# CropSentinel

**Complex technology behind the scenes. Simple conversation in the farmer's hands.**

CropSentinel is a chatbot-first agricultural assistant: farmers ask questions in
plain language, attach crop photos, keep a health history for each plant, and
see soil-moisture readings once a sensor gateway is connected. English, Kannada
and Hindi are supported from the start.

![stack](https://img.shields.io/badge/React-18-12301f) ![stack](https://img.shields.io/badge/TypeScript-5-12301f) ![stack](https://img.shields.io/badge/Tailwind-3-12301f) ![stack](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-12301f)

---

## What is actually connected

Honesty is a product feature here. The app never shows invented readings,
diagnoses or confidence scores.

| Capability | Today | To activate |
| --- | --- | --- |
| Chat assistant | Working. Without Supabase it uses an inspectable knowledge-base engine (no LLM); with Supabase it calls the `ai-assistant` function and a real model. | `.env` + deploy the function with `OPENAI_API_KEY` |
| Conversations, plants, observations | Working and persisted (Supabase, or this browser in demo mode) | Supabase env vars |
| Crop image upload | Working; image is stored with the plant | — |
| Disease analysis | **Not connected.** Says so, stores the photo, shows no result | `CROP_MODEL_URL` (FastAPI service) |
| Soil moisture | **No live readings.** Shows an empty state until a gateway posts data | `sensor-ingest` function + gateway |
| Pump control | **Disabled by design** | Must be built as a validated backend function |
| Voice input / speech | Button shown disabled with an explanation | Future speech provider |
| Weather | Not connected; the assistant says so | Future weather API |
| Agricultural knowledge | 10 clearly-labelled **sample** entries | Admin page / reviewed content |

Screens show the active mode (for example "Local demo mode" or "Crop image
model: not connected"), and the assistant distinguishes general guidance from
conclusions based on the farmer's own records.

---

## Running it

```bash
npm install
cp .env.example .env     # optional: leave empty to explore in demo mode
npm run dev              # http://localhost:3000
npm run build            # type-check + production build
```

With an empty `.env` the app runs in **local demo mode**: records live in this
browser's `localStorage`, so every form, upload and conversation genuinely
works. The banner tells the user this, and *My Farm → Add sample farm and
plants* creates clearly-labelled sample records (plus a reset button in the
profile).

### Connecting Supabase

1. Create a project, then apply `supabase/migrations/0001_initial_schema.sql`
   (`supabase db push`, or paste it into the SQL editor).
2. Fill in `.env`:

   ```env
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon public key>
   ```

3. Restart the dev server. Sign-in becomes required and the demo banner
   disappears. Promote your account to admin:

   ```sql
   update public.profiles set role = 'admin' where id = '<auth user uuid>';
   ```

Full setup for the AI model, crop image service, Arduino gateway and voice is in
[docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).

---

## Pages

| Route | What it is |
| --- | --- |
| `/` | **AI assistant** — the homepage. Conversation, suggested questions, photo upload, language switch, history, optional plant context. |
| `/farm` | Farms and what grows on them |
| `/plants`, `/plants/:id` | Plant register, per-plant health, observation timeline, image history, alerts |
| `/clinic` | Crop Clinic — upload a leaf/crop photo, save it to a plant, see the honest analysis state |
| `/irrigation` | Soil moisture, status, last reading, pump state, irrigation history, per-plant thresholds |
| `/alerts` | Alerts derived from your own records |
| `/profile` | Profile, preferred language, account mode, integration status |
| `/admin` | Knowledge entries, verification state, feedback, integration overview (admins only) |

---

## Architecture

```
src/
  components/        reusable UI (primitives, form, modal), layout, chat, plants
  data/              DataSource interface + Supabase and local implementations
  i18n/              English / Kannada / Hindi dictionaries + provider
  lib/               env, Supabase client, formatting helpers
  pages/             one file per route
  providers/         AppDataProvider: session, records, derived plant health
  services/
    aiAssistantService.ts     engine selection (backend AI vs local knowledge)
    knowledgeService.ts       retrieval over agricultural_knowledge
    cropClinicService.ts      image-model contract + honest fallbacks
    plantMonitoringService.ts health summaries + alert derivation
    irrigationService.ts      moisture classification, thresholds, pump guard
    alertService.ts           deduplicated alert sync
    observationService.ts     observation recording with optional analysis
supabase/
  migrations/0001_initial_schema.sql   tables, indexes, RLS, storage, seed
  functions/ai-assistant/              model call + grounding (key stays server-side)
  functions/crop-clinic/               authenticated proxy to the Python model
  functions/sensor-ingest/             gateway-authenticated write path
docs/INTEGRATIONS.md
```

**Data access.** Screens never talk to Supabase directly. They use the
`DataSource` interface (`src/data/dataSource.ts`), implemented twice:

- `SupabaseSource` — Postgres with Row Level Security;
- `LocalSource` — `localStorage`, used only in demo mode.

Swapping or extending the backend never touches the UI.

**Assistant.** `generateAssistantReply()` picks an engine:

- `backend-ai` when Supabase is configured → the Edge Function owns the provider
  key, retrieves knowledge, injects the farmer's own records, and returns
  `{ text, sources, used_farm_data }`;
- `local-knowledge` otherwise → intent detection + knowledge retrieval + the
  farmer's real records. It asks for missing context (older vs younger leaves,
  wet vs dry soil, crop and stage) instead of guessing, and refuses to name a
  disease without an image analysis.

**Safety rules encoded in the code**

- No pesticide/fertiliser dosage is ever produced locally; the assistant points
  to an extension officer.
- Crop Clinic stores `analysis_status: 'model_unavailable'` and no confidence
  when no model answered.
- Alerts come only from real observations/readings and are de-duplicated per
  plant and alert type.
- `requestPumpActivation()` throws: there is no path from the UI or a model to
  the relay.
- Provider keys live in Supabase secrets; the browser bundle only carries the
  public URL/anon key.

---

## Backend schema

`profiles`, `farms`, `plants`, `observations`, `conversations`, `messages`,
`sensor_readings`, `irrigation_events`, `alerts`, `agricultural_knowledge`,
`feedback` — with foreign keys, timestamps, indexes on the query paths, and RLS
so a farmer only reaches their own rows. Knowledge is readable by all signed-in
users and writable only by admins.

---

## Known limitations / next steps

- Thresholds are stored per browser until they move into the `plants` table.
- The demo upload compresses photos into `localStorage`; a fully loaded demo can
  hit the browser quota (the app surfaces that error rather than losing data).
- The Edge Functions are written for the Supabase Deno runtime and are not
  executed in this workspace — deploy them to a project to verify against your
  own provider account.
- Next: pgvector retrieval, weather context, speech input/output, reviewed
  agricultural content, and a pump-control function with hard safety limits.

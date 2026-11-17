-- ===========================================================================
-- CropSentinel — initial schema
-- PostgreSQL / Supabase. Run with `supabase db push` or paste into the SQL
-- editor. Everything is protected by Row Level Security: a farmer can only
-- reach their own records; only administrators manage the knowledge base.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  full_name          text not null default '',
  preferred_language text not null default 'en' check (preferred_language in ('en', 'kn', 'hi')),
  phone_number       text,
  location           text,
  role               text not null default 'farmer' check (role in ('farmer', 'admin')),
  created_at         timestamptz not null default now()
);

create table if not exists public.farms (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  farm_name  text not null,
  location   text,
  farm_size  text,
  created_at timestamptz not null default now()
);

create table if not exists public.plants (
  id             uuid primary key default gen_random_uuid(),
  farm_id        uuid not null references public.farms (id) on delete cascade,
  plant_name     text not null,
  crop_type      text not null,
  variety        text,
  planting_date  date,
  growth_stage   text,
  location_label text,
  notes          text,
  created_at     timestamptz not null default now()
);

create table if not exists public.observations (
  id              uuid primary key default gen_random_uuid(),
  plant_id        uuid not null references public.plants (id) on delete cascade,
  observation_date timestamptz not null default now(),
  image_url       text,
  symptoms        text,
  soil_condition  text,
  analysis_status text not null default 'pending'
                  check (analysis_status in ('pending', 'completed', 'failed', 'model_unavailable')),
  analysis_result text,
  confidence_score numeric(4, 3) check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)),
  farmer_notes    text,
  follow_up_status text,
  created_at      timestamptz not null default now()
);

create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null default 'New conversation',
  language   text not null default 'en' check (language in ('en', 'kn', 'hi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender          text not null check (sender in ('farmer', 'assistant', 'system')),
  message_text    text not null,
  attachment_url  text,
  created_at      timestamptz not null default now()
);

create table if not exists public.sensor_readings (
  id            uuid primary key default gen_random_uuid(),
  plant_id      uuid not null references public.plants (id) on delete cascade,
  sensor_type   text not null default 'soil_moisture'
                check (sensor_type in ('soil_moisture', 'soil_temperature', 'air_temperature', 'humidity')),
  reading_value numeric not null,
  unit          text not null default '%',
  recorded_at   timestamptz not null default now(),
  source        text not null default 'arduino_gateway'
);

create table if not exists public.irrigation_events (
  id              uuid primary key default gen_random_uuid(),
  plant_id        uuid not null references public.plants (id) on delete cascade,
  moisture_before numeric,
  moisture_after  numeric,
  pump_status     text not null default 'unknown' check (pump_status in ('on', 'off', 'unknown')),
  event_type      text not null default 'pump_run' check (event_type in ('pump_run', 'manual_watering', 'reading')),
  started_at      timestamptz not null default now(),
  ended_at        timestamptz
);

create table if not exists public.alerts (
  id          uuid primary key default gen_random_uuid(),
  plant_id    uuid not null references public.plants (id) on delete cascade,
  alert_type  text not null,
  title       text not null,
  description text not null,
  severity    text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  status      text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  created_at  timestamptz not null default now()
);

create table if not exists public.agricultural_knowledge (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  topic              text not null,
  crop_type          text,
  language           text not null default 'en' check (language in ('en', 'kn', 'hi')),
  content            text not null,
  source_name        text not null,
  source_url         text,
  verification_status text not null default 'unverified'
                     check (verification_status in ('sample', 'unverified', 'verified')),
  last_reviewed      date,
  created_at         timestamptz not null default now()
);

create table if not exists public.feedback (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  message_id      uuid references public.messages (id) on delete set null,
  rating          integer not null check (rating between 1 and 5),
  feedback_text   text,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists farms_owner_idx on public.farms (owner_id);
create index if not exists plants_farm_idx on public.plants (farm_id);
create index if not exists plants_crop_idx on public.plants (crop_type);
create index if not exists observations_plant_date_idx on public.observations (plant_id, observation_date desc);
create index if not exists conversations_user_updated_idx on public.conversations (user_id, updated_at desc);
create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at);
create index if not exists sensor_readings_plant_recorded_idx on public.sensor_readings (plant_id, recorded_at desc);
create index if not exists irrigation_events_plant_started_idx on public.irrigation_events (plant_id, started_at desc);
create index if not exists alerts_plant_status_idx on public.alerts (plant_id, status);
create index if not exists knowledge_language_topic_idx on public.agricultural_knowledge (language, topic);
create index if not exists feedback_user_idx on public.feedback (user_id);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so policies stay short and readable)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.owns_farm(target_farm uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.farms where id = target_farm and owner_id = auth.uid());
$$;

create or replace function public.owns_plant(target_plant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.plants p
    join public.farms f on f.id = p.farm_id
    where p.id = target_plant and f.owner_id = auth.uid()
  );
$$;

create or replace function public.owns_conversation(target_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversations
    where id = target_conversation and user_id = auth.uid()
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists conversations_touch_updated_at on public.conversations;
create trigger conversations_touch_updated_at
  before update on public.conversations
  for each row execute function public.touch_updated_at();

-- Create a profile row for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.farms enable row level security;
alter table public.plants enable row level security;
alter table public.observations enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.sensor_readings enable row level security;
alter table public.irrigation_events enable row level security;
alter table public.alerts enable row level security;
alter table public.agricultural_knowledge enable row level security;
alter table public.feedback enable row level security;

-- profiles
drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- farms
drop policy if exists "farms read own" on public.farms;
create policy "farms read own" on public.farms
  for select using (owner_id = auth.uid());

drop policy if exists "farms insert own" on public.farms;
create policy "farms insert own" on public.farms
  for insert with check (owner_id = auth.uid());

drop policy if exists "farms update own" on public.farms;
create policy "farms update own" on public.farms
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "farms delete own" on public.farms;
create policy "farms delete own" on public.farms
  for delete using (owner_id = auth.uid());

-- plants (owned through their farm)
drop policy if exists "plants read own" on public.plants;
create policy "plants read own" on public.plants
  for select using (public.owns_farm(farm_id));

drop policy if exists "plants insert own" on public.plants;
create policy "plants insert own" on public.plants
  for insert with check (public.owns_farm(farm_id));

drop policy if exists "plants update own" on public.plants;
create policy "plants update own" on public.plants
  for update using (public.owns_farm(farm_id)) with check (public.owns_farm(farm_id));

drop policy if exists "plants delete own" on public.plants;
create policy "plants delete own" on public.plants
  for delete using (public.owns_farm(farm_id));

-- observations
drop policy if exists "observations read own" on public.observations;
create policy "observations read own" on public.observations
  for select using (public.owns_plant(plant_id));

drop policy if exists "observations insert own" on public.observations;
create policy "observations insert own" on public.observations
  for insert with check (public.owns_plant(plant_id));

drop policy if exists "observations update own" on public.observations;
create policy "observations update own" on public.observations
  for update using (public.owns_plant(plant_id)) with check (public.owns_plant(plant_id));

drop policy if exists "observations delete own" on public.observations;
create policy "observations delete own" on public.observations
  for delete using (public.owns_plant(plant_id));

-- conversations
drop policy if exists "conversations read own" on public.conversations;
create policy "conversations read own" on public.conversations
  for select using (user_id = auth.uid());

drop policy if exists "conversations insert own" on public.conversations;
create policy "conversations insert own" on public.conversations
  for insert with check (user_id = auth.uid());

drop policy if exists "conversations update own" on public.conversations;
create policy "conversations update own" on public.conversations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "conversations delete own" on public.conversations;
create policy "conversations delete own" on public.conversations
  for delete using (user_id = auth.uid());

-- messages (owned through their conversation)
drop policy if exists "messages read own" on public.messages;
create policy "messages read own" on public.messages
  for select using (public.owns_conversation(conversation_id));

drop policy if exists "messages insert own" on public.messages;
create policy "messages insert own" on public.messages
  for insert with check (public.owns_conversation(conversation_id));

drop policy if exists "messages delete own" on public.messages;
create policy "messages delete own" on public.messages
  for delete using (public.owns_conversation(conversation_id));

-- sensor readings: farmers may read theirs. Writes come from the authenticated
-- ingest Edge Function using the service role, never straight from a browser.
drop policy if exists "sensor readings read own" on public.sensor_readings;
create policy "sensor readings read own" on public.sensor_readings
  for select using (public.owns_plant(plant_id));

-- irrigation events
drop policy if exists "irrigation events read own" on public.irrigation_events;
create policy "irrigation events read own" on public.irrigation_events
  for select using (public.owns_plant(plant_id));

-- alerts
drop policy if exists "alerts read own" on public.alerts;
create policy "alerts read own" on public.alerts
  for select using (public.owns_plant(plant_id));

drop policy if exists "alerts insert own" on public.alerts;
create policy "alerts insert own" on public.alerts
  for insert with check (public.owns_plant(plant_id));

drop policy if exists "alerts update own" on public.alerts;
create policy "alerts update own" on public.alerts
  for update using (public.owns_plant(plant_id)) with check (public.owns_plant(plant_id));

-- agricultural knowledge: readable by every signed-in user, writable by admins
drop policy if exists "knowledge read authenticated" on public.agricultural_knowledge;
create policy "knowledge read authenticated" on public.agricultural_knowledge
  for select using (auth.role() = 'authenticated');

drop policy if exists "knowledge write admin" on public.agricultural_knowledge;
create policy "knowledge write admin" on public.agricultural_knowledge
  for insert with check (public.is_admin());

drop policy if exists "knowledge update admin" on public.agricultural_knowledge;
create policy "knowledge update admin" on public.agricultural_knowledge
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "knowledge delete admin" on public.agricultural_knowledge;
create policy "knowledge delete admin" on public.agricultural_knowledge
  for delete using (public.is_admin());

-- feedback
drop policy if exists "feedback insert own" on public.feedback;
create policy "feedback insert own" on public.feedback
  for insert with check (user_id = auth.uid());

drop policy if exists "feedback read own or admin" on public.feedback;
create policy "feedback read own or admin" on public.feedback
  for select using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: crop images
-- Public bucket for simple <img> rendering; uploads are limited to the
-- user's own folder. Switch to a private bucket + signed URLs if the photos
-- must not be readable by anyone holding the URL.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('crop-images', 'crop-images', true)
on conflict (id) do nothing;

drop policy if exists "crop images read" on storage.objects;
create policy "crop images read" on storage.objects
  for select using (bucket_id = 'crop-images');

drop policy if exists "crop images insert own folder" on storage.objects;
create policy "crop images insert own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'crop-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "crop images update own folder" on storage.objects;
create policy "crop images update own folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'crop-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "crop images delete own folder" on storage.objects;
create policy "crop images delete own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'crop-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Sample knowledge (clearly marked as sample — replace with reviewed content)
-- ---------------------------------------------------------------------------
insert into public.agricultural_knowledge
  (title, topic, crop_type, language, content, source_name, source_url, verification_status)
select * from (values
  ('Yellowing leaves: common causes', 'Plant health', null, 'en',
   'Yellowing (chlorosis) is a symptom, not a diagnosis. Possible causes include too much or too little water, nitrogen or iron deficiency, root damage, and several diseases. Where the yellowing starts helps narrow it down: older lower leaves often point to mobile nutrients such as nitrogen, while young upper leaves more often point to iron or sulphur. Check soil moisture and the underside of leaves for insects before treating anything.',
   'CropSentinel sample content (not yet reviewed by an agronomist)', null, 'sample'),
  ('Improving soil health on small farms', 'Soil health', null, 'en',
   'Soil health improves slowly through organic matter, cover, and gentle cultivation. Practical steps: add well-rotted manure or compost before planting, keep the soil covered with mulch or a cover crop, avoid ploughing wet soil, rotate crop families between seasons, and test the soil every one to three years so fertiliser matches what is actually missing.',
   'CropSentinel sample content (not yet reviewed by an agronomist)', null, 'sample'),
  ('Deciding when to irrigate', 'Irrigation', null, 'en',
   'Check moisture in the root zone rather than only at the surface: push a finger or a small tool 5-10 cm into the soil near the plant. Water early in the morning where possible, water deeply and less often rather than a little every day, and adjust for crop stage - flowering and fruit filling need the most water. Wet soil that stays wet for days can damage roots as much as drought.',
   'CropSentinel sample content (not yet reviewed by an agronomist)', null, 'sample'),
  ('Tomato leaf spots and blight: what to look for', 'Crop disease', 'Tomato', 'en',
   'Tomato leaves with dark brown spots, yellow halos, or grey mould on the underside may be affected by early blight, late blight or another leaf disease - but similar spots also appear with nutrient problems and water stress. Remove badly affected lower leaves, keep foliage dry by watering at the base, and improve airflow. A photograph in good light plus a description of the pattern is needed before any specific diagnosis is reasonable.',
   'CropSentinel sample content (not yet reviewed by an agronomist)', null, 'sample'),
  ('Scouting for pests before spraying', 'Pest management', null, 'en',
   'Walk a zig-zag path through the field twice a week and inspect 10-20 plants: look at new shoots, the underside of leaves, and near flowers. Many pests can be managed first by hand removal, yellow sticky traps, encouraging natural enemies, and removing crop residue. Chemical pesticide names or doses should only be used on the advice of a local agricultural extension officer, following the label exactly.',
   'CropSentinel sample content (not yet reviewed by an agronomist)', null, 'sample'),
  ('Reading soil moisture numbers', 'Irrigation', null, 'en',
   'Capacitive soil-moisture sensors give a relative number, not a universal truth: the same percentage behaves differently in sandy and clay soils, and in a pot versus a field. Treat thresholds as field-specific starting points, confirm with a hand check, and adjust them for each crop and soil type.',
   'CropSentinel sample content (not yet reviewed by an agronomist)', null, 'sample'),
  ('ಎಲೆಗಳು ಹಳದಿಯಾಗುವುದು: ಸಾಮಾನ್ಯ ಕಾರಣಗಳು', 'Plant health', null, 'kn',
   'ಎಲೆಗಳು ಹಳದಿಯಾಗುವುದು ಒಂದು ಲಕ್ಷಣ, ರೋಗನಿರ್ಣಯವಲ್ಲ. ಹೆಚ್ಚು ಅಥವಾ ಕಡಿಮೆ ನೀರು, ಸಾರಜನಕ ಅಥವಾ ಕಬ್ಬಿಣದ ಕೊರತೆ, ಬೇರು ಹಾನಿ ಮತ್ತು ಕೆಲವು ರೋಗಗಳು ಕಾರಣವಾಗಬಹುದು. ಚಿಕಿತ್ಸೆಗೆ ಮೊದಲು ಮಣ್ಣಿನ ತೇವಾಂಶ ಮತ್ತು ಎಲೆಯ ಕೆಳಭಾಗವನ್ನು ಪರೀಕ್ಷಿಸಿ.',
   'CropSentinel sample content (not yet reviewed by an agronomist)', null, 'sample'),
  ('ಪತ್ತಿಯಾಗುವ ನೀರಾವರಿ ಸಮಯ', 'Irrigation', null, 'kn',
   'ಮೇಲ್ಮೈ ಮಾತ್ರವಲ್ಲ, ಬೇರು ಪ್ರದೇಶದ ತೇವಾಂಶ ನೋಡಿ: ಸಸ್ಯದ ಬಳಿ 5-10 ಸೆಂ.ಮೀ ಆಳಕ್ಕೆ ಬೆರಳು ಅಥವಾ ಸಣ್ಣ ಸಾಧನ ತಳ್ಳಿ. ಸಾಧ್ಯವಾದರೆ ಬೆಳಗ್ಗೆ ನೀರು ಹಾಯಿಸಿ, ಪ್ರತಿದಿನ ಸ್ವಲ್ಪದ ಬದಲು ಆಳವಾಗಿ ಮತ್ತು ಕಡಿಮೆ ಬಾರಿ ನೀರು ಹಾಯಿಸಿ.',
   'CropSentinel sample content (not yet reviewed by an agronomist)', null, 'sample'),
  ('पत्तियाँ पीली होना: आम कारण', 'Plant health', null, 'hi',
   'पत्तियों का पीला होना एक लक्षण है, निदान नहीं। ज़्यादा या कम पानी, नाइट्रोजन या लोहे की कमी, जड़ की क्षति और कुछ रोग कारण हो सकते हैं। इलाज से पहले मिट्टी की नमी और पत्ती के नीचे की जाँच करें।',
   'CropSentinel sample content (not yet reviewed by an agronomist)', null, 'sample'),
  ('सिंचाई कब करें', 'Irrigation', null, 'hi',
   'सिर्फ ऊपरी सतह नहीं, जड़ वाले हिस्से की नमी देखें: पौधे के पास 5-10 सेमी गहराई तक उँगली या छोटी छड़ डालें। हो सके तो सुबह पानी दें, हर दिन थोड़ा देने के बजाय गहरा और कम बार दें।',
   'CropSentinel sample content (not yet reviewed by an agronomist)', null, 'sample')
) as seed (title, topic, crop_type, language, content, source_name, source_url, verification_status)
where not exists (select 1 from public.agricultural_knowledge);

-- ---------------------------------------------------------------------------
-- Promote the first administrator manually (example):
--   update public.profiles set role = 'admin' where id = '<auth user uuid>';
-- ---------------------------------------------------------------------------

-- Responder Mesh (V3 phase 2) — run in Supabase SQL editor before building
-- Opted-in users who are willing to help in nearby emergencies.

create table if not exists responders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  available boolean not null default false,
  cpr_trained boolean not null default false,
  lat double precision,
  lng double precision,
  updated_at timestamptz not null default now()
);

alter table responders enable row level security;
create policy "own responder row" on responders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Server (service role) reads all rows to find nearby responders.

create table if not exists responder_alerts (
  id uuid primary key default gen_random_uuid(),
  emergency_id uuid not null,
  responder_id uuid not null references auth.users(id) on delete cascade,
  patient_lat double precision,
  patient_lng double precision,
  status text not null default 'pinged', -- pinged | accepted | declined | arrived
  created_at timestamptz not null default now()
);

alter table responder_alerts enable row level security;
create policy "responder sees own alerts" on responder_alerts
  for select using (auth.uid() = responder_id);
create policy "responder updates own alerts" on responder_alerts
  for update using (auth.uid() = responder_id) with check (auth.uid() = responder_id);

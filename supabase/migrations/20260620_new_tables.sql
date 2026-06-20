-- Run this in your Supabase SQL editor to create new tables

-- Vitals logs (heart rate, blood pressure, O2 sat, respiratory rate)
create table if not exists vitals_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  logged_at timestamptz not null default now(),
  heart_rate numeric,
  systolic numeric,
  diastolic numeric,
  oxygen_sat numeric,
  resp_rate numeric,
  created_at timestamptz default now()
);

-- Enable RLS
alter table vitals_logs enable row level security;

-- Users can only read/write their own vitals
create policy "Users can manage own vitals"
  on vitals_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Vitals alerts (flagged when critical thresholds exceeded)
create table if not exists vitals_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  alerts text[] not null,
  vitals jsonb,
  created_at timestamptz default now()
);

alter table vitals_alerts enable row level security;

create policy "Users can read own vitals alerts"
  on vitals_alerts for select
  using (auth.uid() = user_id);

-- Allow server (service role) to insert alerts
create policy "Service role can insert vitals alerts"
  on vitals_alerts for insert
  with check (true);

-- Emergency contact alert log (tracks when contacts were notified)
create table if not exists emergency_contact_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  contact_name text not null,
  contact_phone text not null,
  alerted_at timestamptz not null,
  created_at timestamptz default now()
);

alter table emergency_contact_alerts enable row level security;

create policy "Users can read own contact alerts"
  on emergency_contact_alerts for select
  using (auth.uid() = user_id);

create policy "Service role can insert contact alerts"
  on emergency_contact_alerts for insert
  with check (true);

-- Add emergency_contacts column to profiles if it doesn't exist
alter table profiles add column if not exists emergency_contacts jsonb default '[]'::jsonb;

-- Add index for vitals lookups
create index if not exists idx_vitals_logs_user_date on vitals_logs(user_id, logged_at desc);
create index if not exists idx_vitals_alerts_user on vitals_alerts(user_id, created_at desc);

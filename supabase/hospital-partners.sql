-- Relay Dispatch: hospital partner network (final schema)
create table if not exists hospital_partners (
  id uuid primary key default gen_random_uuid(),
  access_code text unique not null,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  accepting boolean not null default true,
  cath_lab boolean,
  stroke_unit boolean,
  trauma_unit boolean,
  beds_free int,
  status_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table hospital_partners enable row level security;

create table if not exists er_incoming (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references hospital_partners(id) on delete cascade,
  user_id uuid,
  patient_name text,
  emergency_type text,
  eta_min int,
  live_url text,
  status text not null default 'incoming',
  created_at timestamptz not null default now()
);
alter table er_incoming enable row level security;

-- Onboard a partner: coordinates within ~400m of the hospital's OSM position.
-- insert into hospital_partners (access_code, name, lat, lng, accepting, cath_lab, beds_free)
-- values ('RELAY-TEST-1', 'Hospital Name', 19.0509, 72.8296, true, true, 6);

-- Schema the application code has always depended on and which was never created.
--
-- HOW THESE WERE FOUND
-- Every table and column the code touches was probed against the live database
-- through PostgREST. An unknown column returns error 42703 and an unknown table
-- returns PGRST205, and both are distinguishable from a row that is simply
-- hidden by row-level security. Seven gaps came back. They are grouped below by
-- what actually breaks, because the severity is very different.
--
-- All of it is additive and idempotent. Nothing existing is rewritten, so this
-- is safe to run against production and safe to re-run.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. vitals_logs: three columns the Apple Health route writes
--
-- The route builds every row with `source` set, so PostgREST rejected the whole
-- insert, and every single Apple Health sync failed with a 500. The Shortcut
-- discards the response body, so there was nothing for anyone to notice.
--
-- The other half of that bug was a naming mismatch and is fixed in the code:
-- the route was writing oxygen_saturation and respiratory_rate, while the
-- dashboard, the manual vitals form and the risk engine all use oxygen_sat and
-- resp_rate. Those columns already exist and are not touched here.
alter table public.vitals_logs
  add column if not exists source text,
  add column if not exists steps  integer,
  add column if not exists hrv_ms numeric;

-- The ingest route upserts with onConflict 'user_id,logged_at'. Without a
-- matching unique constraint Postgres has nothing to conflict on, so the upsert
-- errors and the route silently falls through to its plain insert, which then
-- duplicates a reading every time a device re-syncs the same timestamp.
create unique index if not exists vitals_logs_user_logged_at_key
  on public.vitals_logs (user_id, logged_at);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. symptom_logs.note
--
-- The worst kind of missing column, because the code adds it conditionally:
--   ...(note.trim() ? { note: note.trim() } : {})
-- So logging symptoms works perfectly until someone types a note, and then it
-- fails. It would pass any test that did not happen to fill in the optional
-- field, which is why it survived.
alter table public.symptom_logs
  add column if not exists note text;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. care_team_members.push_token
--
-- app/api/groq/health-intelligence filters on .not('push_token', 'is', null)
-- to find who to notify. Filtering on a column that does not exist errors, the
-- surrounding try/catch swallows it, and the care team is never alerted. The
-- feature has never once fired.
alter table public.care_team_members
  add column if not exists push_token text;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. er_audit: the hospital audit trail
--
-- Written from three routes and read by the admin page, which offers to "review
-- the audit trail". Every insert is wrapped in try/catch so nothing crashed,
-- and the read coalesces to an empty array, so the page has always shown an
-- empty list rather than an error. For a table whose entire purpose is showing
-- who changed a hospital's accepting status and when, silently recording
-- nothing is the worst possible failure mode.
create table if not exists public.er_audit (
  id         uuid primary key default gen_random_uuid(),
  partner_id uuid references public.hospital_partners (id) on delete set null,
  actor      text not null,
  action     text not null,
  detail     text,
  created_at timestamptz not null default now()
);

create index if not exists er_audit_created_at_idx on public.er_audit (created_at desc);
create index if not exists er_audit_partner_idx    on public.er_audit (partner_id);

-- Read and written only by server routes holding the service role key. RLS on
-- with no policy means the browser cannot touch it, which is correct: an audit
-- trail that the audited party can edit is not an audit trail.
alter table public.er_audit enable row level security;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. care_team_alerts
--
-- Same pattern. Written by the health intelligence route inside a try/catch
-- with the comment "Don't fail the response if alert insert fails", so a
-- clinically meaningful alert about a deteriorating patient has been thrown
-- away every time.
create table if not exists public.care_team_alerts (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users (id) on delete cascade,
  type       text not null,
  severity   text not null check (severity in ('low', 'medium', 'high')),
  message    text,
  data       jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists care_team_alerts_patient_idx
  on public.care_team_alerts (patient_id, created_at desc);

alter table public.care_team_alerts enable row level security;

-- A patient can see alerts raised about them. Nothing else is granted from the
-- browser, so the care team side is served by the server routes.
drop policy if exists "own alerts are readable" on public.care_team_alerts;
create policy "own alerts are readable"
  on public.care_team_alerts for select
  using (auth.uid() = patient_id);

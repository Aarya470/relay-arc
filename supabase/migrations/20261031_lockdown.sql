-- Security lockdown, applied 2026-10-31 in the Supabase SQL editor.
-- An audit (anon key + pg_policies) found policies that let anyone read or
-- write other people's health data. After this, every table is owner-only,
-- except the server-only tables (RLS on, no policies). The hidden care-team
-- feature loses access on purpose: anyone could register as care team.

create or replace function pg_temp.drop_all(t text) returns void language plpgsql as $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
    execute format('drop policy %I on public.%I', p.policyname, t);
  end loop;
end $$;

select pg_temp.drop_all('medication_logs');
alter table public.medication_logs enable row level security;
create policy own_medlogs_select on public.medication_logs for select using (auth.uid() = user_id);
create policy own_medlogs_insert on public.medication_logs for insert with check (auth.uid() = user_id);
create policy own_medlogs_update on public.medication_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_medlogs_delete on public.medication_logs for delete using (auth.uid() = user_id);

select pg_temp.drop_all('patient_notes');
alter table public.patient_notes enable row level security;
create policy own_notes_select on public.patient_notes for select using (auth.uid() = patient_id);

select pg_temp.drop_all('care_team_members');
alter table public.care_team_members enable row level security;
create policy own_member_select on public.care_team_members for select using (auth.uid() = id);

select pg_temp.drop_all('patient_summaries');
alter table public.patient_summaries enable row level security;

drop policy if exists "Care team can read symptom logs" on public.symptom_logs;

drop policy if exists anyone_can_view_pending on public.transport_requests;
create policy transport_select on public.transport_requests for select to authenticated
  using (status = 'pending' or auth.uid() = user_id or auth.uid() = driver_id);

drop policy if exists "Service role can insert contact alerts" on public.emergency_contact_alerts;
create policy own_contact_alerts_insert on public.emergency_contact_alerts for insert with check (auth.uid() = user_id);
drop policy if exists "Service role can insert vitals alerts" on public.vitals_alerts;
create policy own_vitals_alerts_insert on public.vitals_alerts for insert with check (auth.uid() = user_id);

drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert on public.appointments for insert with check (auth.uid() = patient_id);

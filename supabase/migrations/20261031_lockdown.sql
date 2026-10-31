-- Lock down tables that were readable by anyone with the public anon key.
-- Found 2026-10-31 by reading each table with the anon key and no sign-in:
--   medication_logs, patient_notes, care_team_members returned rows.
-- After this, each person can only see and change their own rows.

-- medication_logs: owner only
alter table public.medication_logs enable row level security;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='medication_logs' loop
    execute format('drop policy %I on public.medication_logs', p.policyname);
  end loop; end $$;
create policy "own medication logs - read"   on public.medication_logs for select using (auth.uid() = user_id);
create policy "own medication logs - add"    on public.medication_logs for insert with check (auth.uid() = user_id);
create policy "own medication logs - change" on public.medication_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own medication logs - remove" on public.medication_logs for delete using (auth.uid() = user_id);

-- patient_notes: the patient can read notes about themselves; nobody writes from the browser
alter table public.patient_notes enable row level security;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='patient_notes' loop
    execute format('drop policy %I on public.patient_notes', p.policyname);
  end loop; end $$;
create policy "own patient notes - read" on public.patient_notes for select using (auth.uid() = patient_id);

-- care_team_members: a member can read only their own row; no self-registration from the browser
alter table public.care_team_members enable row level security;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='care_team_members' loop
    execute format('drop policy %I on public.care_team_members', p.policyname);
  end loop; end $$;
create policy "own care team row - read" on public.care_team_members for select using (auth.uid() = id);

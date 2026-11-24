-- Autonomic specialty: profile settings plus one log table for stand tests,
-- daily tracking and episodes. Safe to run more than once.

alter table public.profiles add column if not exists autonomic jsonb;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_autonomic_size') then
    alter table public.profiles add constraint profiles_autonomic_size
      check (autonomic is null or pg_column_size(autonomic) < 16000) not valid;
  end if;
end $$;

create table if not exists public.autonomic_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('stand', 'day', 'episode')),
  day date not null default current_date,
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 20000),
  created_at timestamptz not null default now()
);

create index if not exists autonomic_logs_user_day on public.autonomic_logs (user_id, day desc);
-- One daily tracker row per person per day, so saving updates instead of piling up.
create unique index if not exists autonomic_logs_one_day on public.autonomic_logs (user_id, day) where kind = 'day';

alter table public.autonomic_logs enable row level security;

drop policy if exists "own autonomic logs select" on public.autonomic_logs;
drop policy if exists "own autonomic logs insert" on public.autonomic_logs;
drop policy if exists "own autonomic logs update" on public.autonomic_logs;
drop policy if exists "own autonomic logs delete" on public.autonomic_logs;
create policy "own autonomic logs select" on public.autonomic_logs for select using (auth.uid() = user_id);
create policy "own autonomic logs insert" on public.autonomic_logs for insert with check (auth.uid() = user_id);
create policy "own autonomic logs update" on public.autonomic_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own autonomic logs delete" on public.autonomic_logs for delete using (auth.uid() = user_id);

-- Hardening, November 2026. Safe to run more than once.

-- 1. Views must obey the caller's row level security. A view created the
--    default way runs as its owner and can leak rows RLS would have hidden.
do $$
declare v record;
begin
  for v in select schemaname, viewname from pg_views where schemaname = 'public' loop
    execute format('alter view %I.%I set (security_invoker = true)', v.schemaname, v.viewname);
  end loop;
end $$;

-- 2. The app does not use the GraphQL endpoint. Closing it to anonymous callers
--    removes alias batching as a way to brute force anything through it.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'graphql') then
    revoke usage on schema graphql from anon;
    revoke all on all functions in schema graphql from anon;
  end if;
  if exists (select 1 from pg_namespace where nspname = 'graphql_public') then
    revoke usage on schema graphql_public from anon;
    revoke all on all functions in schema graphql_public from anon;
  end if;
end $$;

-- 3. Length limits on free text a person types into their profile. NOT VALID
--    means existing rows are left alone and every new write is checked.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_full_name_len') then
    alter table public.profiles add constraint profiles_full_name_len
      check (full_name is null or char_length(full_name) <= 80) not valid;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='diagnosis' and data_type='text')
     and not exists (select 1 from pg_constraint where conname = 'profiles_diagnosis_len') then
    alter table public.profiles add constraint profiles_diagnosis_len
      check (diagnosis is null or char_length(diagnosis) <= 300) not valid;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='allergies' and data_type='text')
     and not exists (select 1 from pg_constraint where conname = 'profiles_allergies_len') then
    alter table public.profiles add constraint profiles_allergies_len
      check (allergies is null or char_length(allergies) <= 500) not valid;
  end if;
end $$;

-- 4. Functions that run as their owner must pin their search path, or a caller
--    can shadow a table name and have the function act on the wrong object.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
  loop
    execute format('alter function %s set search_path = public', f.sig);
  end loop;
end $$;

-- 5. Device lock for shared emergency links. A link works without an account,
--    but only on the first few devices that open it (one per emergency contact,
--    plus spares). After that, a forwarded or leaked link shows nothing.
create table if not exists public.emergency_viewers (
  emergency_id uuid not null,
  device_hash  text not null check (char_length(device_hash) = 64),
  created_at   timestamptz not null default now(),
  primary key (emergency_id, device_hash)
);
-- No policies on purpose: only the server (service role) reads or writes this.
alter table public.emergency_viewers enable row level security;

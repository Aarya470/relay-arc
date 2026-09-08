-- Aggregate page view counts.
--
-- WHY NOT A THIRD-PARTY SCRIPT
-- Google Analytics, Plausible and the rest all mean another origin in the CSP,
-- another processor to name in the privacy policy, and in most readings a
-- consent prompt before the first request. The privacy policy for this project
-- says plainly that there is no third-party analytics and no tracking pixels,
-- and that sentence is worth more than a dashboard with session recordings.
--
-- WHAT THIS STORES
-- One row per path per day, holding a count. That is all. No visitor id, no
-- session, no IP, no user agent, no referrer, no user_id. Two people loading
-- /flare on the same day are indistinguishable from one person loading it
-- twice, and that is the point: there is nothing here to link back to a person,
-- so there is nothing here to leak.
--
-- It answers "is anyone finding /rights" and "did the post work", which is what
-- the project actually needs. It cannot answer "what did this user do", and it
-- is not meant to.

create table if not exists public.page_views (
  path       text not null,
  day        date not null default (now() at time zone 'utc')::date,
  views      integer not null default 0,
  primary key (path, day)
);

-- No policies are added on purpose. RLS is on and nothing is granted to anon or
-- authenticated, so the table is unreadable and unwritable from the browser.
-- The only way in is the function below, which runs as its owner, and the
-- metrics route, which uses the service role.
alter table public.page_views enable row level security;

-- Atomic increment. Doing this as a read-then-write from the API route would
-- drop counts under concurrency, and the whole value of the table is that the
-- number is right.
create or replace function public.bump_page_view(p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Guard the key. An unbounded path column invites someone to write a million
  -- junk rows by requesting /aaaa..., and a 200 character cap is far longer
  -- than any real route here.
  if p_path is null or length(p_path) > 200 or p_path !~ '^/' then
    return;
  end if;

  insert into public.page_views (path, day, views)
  values (p_path, (now() at time zone 'utc')::date, 1)
  on conflict (path, day)
  do update set views = public.page_views.views + 1;
end;
$$;

-- The browser never calls this directly, but granting execute to anon keeps the
-- option open without exposing the table itself.
grant execute on function public.bump_page_view(text) to anon, authenticated;

create index if not exists page_views_day_idx on public.page_views (day desc);

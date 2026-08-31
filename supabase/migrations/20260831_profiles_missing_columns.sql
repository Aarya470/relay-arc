-- Two columns the application code has always written to, and which were never
-- created in the database.
--
-- HOW THIS SURFACED
-- Signing up and completing onboarding failed with:
--   Could not find the 'blood_type' column of 'profiles' in the schema cache
-- app/onboarding/page.tsx spreads its whole form object into
-- .from('profiles').insert(), and blood_type is one of the fields. PostgREST
-- rejects the entire insert when any key has no matching column, so the profile
-- was never saved at all — not partially saved, not saved without blood type.
--
-- Blood type is also the first field on the ER handoff brief and the emergency
-- card, and it is named in the PROFILE_COLS select list in
-- app/api/ai/generate/route.ts. So the column the product is arguably built
-- around was the one column missing.
--
-- health_ingest_token has the same shape of problem and had not been noticed
-- yet: app/connect-health/page.tsx selects it and app/api/health/ingest/route.ts
-- looks a profile up by it, so that route could never have matched a row.
--
-- Both are nullable and additive. Nothing existing is rewritten, so this is safe
-- to run against production and safe to re-run.
alter table public.profiles
  add column if not exists blood_type text,
  add column if not exists health_ingest_token text;

-- The ingest route treats this token as a credential and fetches a single
-- profile by it, so duplicates would let one device write to another person's
-- record. Partial index rather than a plain unique constraint because every
-- existing row is null and null has to stay allowed for everyone who has not
-- connected a device.
create unique index if not exists profiles_health_ingest_token_key
  on public.profiles (health_ingest_token)
  where health_ingest_token is not null;

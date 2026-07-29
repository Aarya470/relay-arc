# Relay Arc

**Cardiac emergency response for the places an ambulance doesn't reach in eight minutes.**

Relay Arc turns the minutes between a cardiac event and treatment into a coordinated
handoff: it classifies the emergency, picks the hospital that can actually treat *that*
condition, sends the patient's medical record ahead, solves transport, and keeps the
family and the ER on the same live picture.

Live: **https://relay-arc.vercel.app** · Guided demo (no GPS needed): **/demo** ·
Live dependency health: **/status**

---

## Why it exists

More than 65% of people in India live where the nearest hospital can be 30+ km away, and
in Mumbai, Delhi and Kolkata an ambulance can sit in traffic for 45 minutes while covering
a few kilometres. In that world an emergency starts with a family doing arithmetic — *can
we afford the ambulance, how far is the hospital, will we make it* — instead of getting
help. Relay's only metric is **time to treatment**.

---

## What actually happens when someone holds SOS

| Step | What Relay does |
| --- | --- |
| Detect | Tap a condition, or **speak it** — Web Speech transcribes and an LLM classifies it into the emergency taxonomy |
| Rank | Candidate hospitals from OpenStreetMap, priced by **real road drive-time** (OSRM matrix), adjusted for traffic and for what the facility reports it can do right now |
| Brief | The medical profile (blood type, allergies, medications) is posted to the destination ER's dispatch board before the patient leaves |
| Move | In-app turn-by-turn navigation; if there's no car, nearby community drivers are alerted |
| Coordinate | Family join a realtime **Relay Room** — live position, event timeline, shared tasks |
| Protect | **Guardian** asks "are you still responsive?"; silence triggers an alarm and turns the phone into a bystander beacon with CPR guidance |

---

## Architecture

```
Next.js 16 (App Router, React 19, TypeScript)
├── Supabase          Postgres + Auth + Realtime broadcast/presence (RLS on every table)
├── MapLibre GL       vector maps, native 3D chase camera (OpenFreeMap Liberty style)
├── OSRM              routing + drive-time matrix (FOSSGIS primary, demo fallback)
├── Groq (Llama)      emergency classification, triage, check-in intelligence — server-side only
├── web-push          VAPID push notifications + Vercel cron reminders
└── Vercel            hosting, cron, edge OG image generation
```

**Key design decisions**

- **No paid map/routing dependency.** Vector tiles and routing are free and keyless.
  Live traffic is an *optional* upgrade: set `NEXT_PUBLIC_TOMTOM_KEY` and the top
  candidates re-rank on live traffic; without it a documented time-of-day model applies
  and the UI says "estimated" rather than implying live data.
- **Never claim a capability we don't have.** "ER is expecting you" appears only when a
  real partner facility is connected. Simulated content is badged.
- **Degrade, don't fail.** Routing has a fallback provider; the medical profile is cached
  locally so SOS and first-responder info work offline; realtime falls back to polling.
- **Emergency numbers are regional** — 108 in India, 911 in the Americas, 112 in Europe.

## Security posture

- Row-level security on every table; the browser holds only the anon key.
- The service-role key is used **only** inside server routes (ER dispatch board, push
  fan-out, operations) — never shipped to the client.
- ER board access is per-facility access codes, rotatable from `/admin`; the operations
  portal itself is gated by `ADMIN_PORTAL_KEY`.
- Every board and patient action is written to an append-only `er_audit` trail.
- Strict CSP (`next.config.ts`) with an explicit allowlist per origin; HSTS, frame-deny,
  nosniff, restricted permissions policy.
- No PHI in URLs or query strings. AI calls are server-side so no key reaches the browser.
- Not a medical device, not an emergency service — stated in-product at `/terms`,
  `/privacy`, and on every failure screen.

## Repository map

```
app/
  page.tsx                    marketing site
  dashboard/ checkin/ vitals/ medications/ timeline/   daily patient loop
  emergency/                  entry · routing · cpr · brief · triage · recovery · live room
  hospital/                   ER dispatch board (partner facilities)
  admin/                      operations: onboard facilities, rotate codes, audit trail
  status/                     live dependency health
  api/                        groq · push · hospital · admin · cron · status
components/
  Navigation.tsx              turn-by-turn engine (snap, trim, voice, wake lock, night)
  GuardianWatch.tsx           unresponsiveness escalation + bystander takeover
lib/
  hospitals.ts                dispatch scoring: drive time × traffic × facility capability
  demo.ts  legal.ts  emergency-number.ts  notifications.ts
supabase/                     SQL migrations (partner network, responder mesh)
tests/                        navigation geometry suite (runs the real shipped code)
docs/                         dispatch engine + responder mesh design notes
```

## Running locally

```bash
npm install
cp .env.local.example .env.local   # fill Supabase, Groq, VAPID values
npm run dev
```

Then apply `supabase/hospital-partners.sql` in the Supabase SQL editor and onboard a
facility from `/admin`.

## Tests

```bash
python3 tests/extract.py                                  # sync logic from the component
cd tests && node --experimental-strip-types navigation.test.ts
```

Exercises the real shipped navigation geometry against live routing servers: cumulative
distance vs the router's own total, snap accuracy, drifted-GPS correction, a full
simulated drive (monotonic remaining distance, route trimming, maneuver advance,
arrival), the off-route threshold, instruction composition, and the dispatch matrix.

## Roadmap

- **Responder Mesh** — nearby opted-in users pinged to help; schema and plan in
  `supabase/responder-mesh.sql` and `docs/RESPONDER_MESH.md`
- Offline vector tiles cached along the route corridor (rural, no-signal navigation)
- Live traffic and incident feeds via a commercial provider
- Partner integration beyond the portal (HL7/FHIR intake where hospitals support it)
- Clinical validation and formal privacy review before any real-patient deployment

## Status, honestly

Every feature described above is implemented and deployed. What has **not** happened yet:
real patients, clinical validation, a regulatory review, or a signed hospital partner.
The partner network is live software waiting on its first facility.

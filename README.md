# Relay Arc

A free emergency web app for families who live far from a hospital.

Live site: https://www.relay-arc.org

## What it does

- **SOS.** Press the button, or type or say what is happening (English, Spanish, Hindi or
  Marathi). The phone works out what kind of emergency it is, even with no internet.
- **Picks a hospital.** Ranks nearby hospitals by real driving time and by whether they
  can treat the problem (for heart attacks, using New Jersey Department of Health data).
  If the best one is 25 minutes or more away, it tells you to call 911 first.
- **Directions.** Turn-by-turn directions inside the app.
- **Family.** Texts your family the hospital and a live location link.
- **Emergency card.** A no-account card with blood type, allergies, medications and who
  to call. It is saved only on your phone and works offline.
- **Vitals.** Pulse from the phone camera, breathing rate from the motion sensor, and a
  NEWS2 score a clinician can read.

Relay Arc helps with decisions. It does not diagnose. In an emergency, call 911 first.

## Tech

- Next.js 16, React 19, TypeScript
- Supabase for accounts and data (row-level security on every table)
- Two small triage models (a linear model and a neural network) trained in Python with
  NumPy and compiled into the app, so they run on the phone
- Groq (`openai/gpt-oss-20b`) for the daily check-in and as a fallback when the on-phone
  model is unsure
- OpenStreetMap and OSRM for hospitals and drive times, MapLibre for the map

## Project layout

```
app/          pages and API routes
components/   shared UI
lib/          triage, risk (NEWS2), hospitals, pulse and other logic
ml/           Python training code for the triage models
supabase/     database schema
tests/        unit tests
```

## Running it locally

```
npm install
npm run dev
```

You need a `.env.local` with your Supabase URL and anon key, and a Groq API key for the
server routes. Keys that must stay secret are only used on the server.

Checks:

```
npx tsc --noEmit
npm run verify
```

## How it was built

The idea, the design decisions, the training phrases, testing on real phones and the
outreach were done by the Relay Arc team. Much of the code was written with the help of
an AI coding assistant (Claude, by Anthropic).

# Relay Risk Engine

Deterministic deterioration scoring. No language model, no API, 0.015 ms.

```
lib/risk/index.ts         the engine — pure, zero dependencies, client-safe
app/api/risk/route.ts     server path (care-team alerting, background jobs)
tests/risk.test.ts        50 assertions, incl. full NEWS2 table conformance
```

```bash
cd tests && node --experimental-strip-types risk.test.ts
```

## Why this replaced an LLM call

The old `/api/groq/crash-risk` asked `llama-3.1-8b-instant`, at temperature 0.2,
to read free-text check-in summaries and return a crash-risk level.

A deterioration flag is a medical claim, and it has to be three things that an
LLM in that position is not:

| | LLM | This engine |
| --- | --- | --- |
| Reproducible | no — same vitals, different answer | **yes, bit-identical** |
| Attributable | no — cannot cite the measurement | **yes, per-signal with the number** |
| Available offline | no | **yes** |
| Latency | ~200 ms + network | **0.015 ms** |
| Cost | metered | **0** |

The reproducibility point is the one that matters most. If a patient shows a
clinician "the app told me I was at risk", the clinician has to be able to see
*why*, and get the same answer running it again. That is not optional for
something that influences whether a person seeks care.

## What it computes

### Layer 1 — NEWS2 (validated)

The vital-sign subscores of **NEWS2** (National Early Warning Score 2, Royal
College of Physicians), the early-warning score used to detect acute
deterioration in UK hospitals. Thresholds are transcribed from the published
table and pinned by tests:

| Parameter | 3 | 2 | 1 | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Respiratory rate | ≤8 | | 9–11 | 12–20 | | 21–24 | ≥25 |
| SpO₂ (Scale 1) | ≤91 | 92–93 | 94–95 | ≥96 | | | |
| Systolic BP | ≤90 | 91–100 | 101–110 | 111–219 | | | ≥220 |
| Pulse | ≤40 | | 41–50 | 51–90 | 91–110 | 111–130 | ≥131 |
| Temperature °C | ≤35.0 | ≥39.1 | 35.1–36.0 · 38.1–39.0 | 36.1–38.0 | | | |
| Consciousness | C/V/P/U | | | Alert | | | |
| Supplemental O₂ | | on oxygen | | room air | | | |

**All seven parameters are now implemented.** A reading reports `partial: true`
whenever any are missing and names them; a complete observation set reports
`partial: false` and drops the under-estimation caveat.

**Two caveats a clinician should confirm first:**

1. **The temperature row.** Every other row was transcribed from a source that
   stated its bands unambiguously. For temperature the sources I could reach
   disagreed on alignment, so `scoreTemperature()` implements the standard
   published table as I understand it, pinned by boundary tests. This is the first
   thing to check in review.
2. **Age.** NEWS2 is designed for adults aged 16 and over and is **not validated in
   children** — paediatric practice uses PEWS. `assessRisk()` accepts `ageYears` and
   sets `pediatricCaveat` when under 16. This matters directly for a school pilot,
   where most subjects are under 16.

Escalation follows the published bands: aggregate 0–4 low, 5–6 medium, ≥7 high —
plus NEWS2's separate rule that **any single parameter scoring 3 escalates on its
own**, even with a low aggregate. That branch is the most safety-critical code
here and has its own test.

### PARTIAL READINGS ARE STATED EVERYWHERE THEY SURFACE

All seven parameters are implemented, but a reading is only as complete as what was
actually recorded — and most check-ins will not include a temperature.

- **Complete set** → `partial: false`, and the under-estimation caveat is dropped.
- **Anything missing** → `partial: true`, and `coverage.missing` names it. The
  disclaimer is generated from that list, so it can never drift out of sync with
  what was really measured.

A partial score can only ever **under**-estimate risk, never over-estimate it. That
makes it safe as a prompt to seek care and unsafe as a reason not to. The dashboard
prints `NEWS2 n/20 · k of 7 parameters` under every alert, followed by either the
partial caveat or "Complete observation set", plus the paediatric line when age is
known and under 16. It is decision support, not a diagnosis, and not a substitute for
a clinician or for emergency services.

### Layer 2 — personal baseline (heuristic, unvalidated)

NEWS2 uses absolute thresholds, which is right for acute hospital care and wrong
for the chronic conditions Relay serves. Someone with ME/CFS whose resting pulse
normally sits at 58 and is suddenly at 76 scores **NEWS2 0** — textbook normal —
while being 18 bpm into their own crash pattern.

So a second layer scores deviation from that person's own history:

- **Resting pulse vs personal baseline** — median of readings 1–21 days old
  (today's reading is excluded so it cannot pollute its own baseline);
  +10 bpm → 1 point, +15 → 2
- **Narrow pulse pressure** — SBP−DBP under a quarter of systolic, suggesting
  reduced stroke volume
- **Rising pulse trend** — least-squares slope ≥2 bpm/day across the week
- **Logging gap** — a person who has been logging daily and stops for 3+ days is
  often too unwell to log. Absence of data is data.

**This layer is a heuristic and is labelled as such in every signal it emits**
(`not part of NEWS2, not independently validated`). By construction it can nudge
`low` up to `medium` and **can never on its own produce `high`** — there is a test
that throws every baseline signal at the engine at once with NEWS2 = 0 and asserts
the result is not `high`.

## Design rules the tests enforce

- **Points always sum.** The NEWS2 signals' points must sum exactly to the
  reported aggregate — no unexplained score.
- **Every signal quotes its number.** `Pulse 18 bpm above your usual 60 bpm`, not
  "elevated pulse".
- **Zero and null are missing, not measured.** An SpO₂ of `0` is a blank field,
  not fatal hypoxia.
- **Two vitals minimum.** One lone reading returns `null`, not a risk level.
- **`null` ≠ low risk.** "Not enough data to say" is its own answer.
- **Refuses to guess a baseline** from fewer than 4 prior readings.

## A bug this work uncovered

The dashboard's vitals query selected `blood_pressure_systolic`,
`blood_pressure_diastolic` and `weight_kg`. None of those columns exist on
`vitals_logs` (the real ones are `systolic`, `diastolic`, `oxygen_sat`,
`resp_rate`, `logged_at`). Postgres rejects the whole select, so the query had
been failing outright and `/api/groq/insights` was being handed an empty vitals
array on every dashboard load. Fixed alongside this.

## Roadmap

1. **Have a clinician confirm the temperature band table.** It is the one row
   transcribed from sources that disagreed, and it is the first thing to check.
2. **Decide what to do about under-16s.** NEWS2 is not validated in children, the
   engine flags it, but a school pilot is mostly under-16s. The honest options are
   to implement PEWS as well, or to restrict the risk indicator to adults.
3. Offer SpO₂ Scale 2 selection now that supplemental-oxygen status is captured —
   it is only correct for documented hypercapnic respiratory failure and must be a
   deliberate clinical choice, not a default.
4. Validate the personal-baseline layer against outcomes once there is consented
   production data. Until then it stays labelled unvalidated.
4. Orthostatic vitals (lying vs standing HR/BP) — the actual diagnostic signal for
   POTS, and currently not captured at all.

## Sources

- NEWS2 scoring thresholds and escalation bands: Royal College of Physicians,
  as tabulated at <https://www.iatrox.com/calculators/news2>
- NEWS2 predictive performance: <https://pmc.ncbi.nlm.nih.gov/articles/PMC11942526/>

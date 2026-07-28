# Relay Dispatch Engine

Routing is now ranked by a dispatch score, not straight-line distance:

1. Candidates from OpenStreetMap (existing Overpass query, top 8 by distance)
2. Real drive times: one OSRM /table matrix call (FOSSGIS primary, OSRM demo
   fallback) — actual road network, not km / 50kph
3. Traffic: time-of-day congestion multiplier (metro peaks 1.5-1.6x), shown
   in the UI as "heavy/moderate traffic est." — honest labeling.
   LIVE traffic seam: replace trafficMultiplier() in lib/hospitals.ts with a
   per-route factor from TomTom Traffic API / Mapbox (needs an API key).
4. Facility status from the partner network (below): diverting hospitals are
   penalized 2.2x, confirmed-accepting get 0.85x.

## Hospital partner network
- Run supabase/hospital-partners.sql, then insert a partner row with the
  facility's real coordinates (within 400m of its OSM position) and an
  access code.
- The facility opens /hospital, enters the code, and gets a dispatch board:
  accepting/diverting toggle, cath-lab availability, free beds, and a live
  feed of incoming Relay patients (name, type, ETA, Relay Room link).
- Patient side: when routing picks a partnered hospital, the patient is
  posted to that board automatically and the UI shows "ER is expecting you"
  — only ever claimed when a real partner is connected.

## Not claimed (yet)
Live accidents/incident avoidance requires a commercial feed. The seam is
the same as live traffic.

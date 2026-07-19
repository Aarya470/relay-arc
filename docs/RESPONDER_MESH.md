# Responder Mesh — V3 phase 2 plan

The idea: every opted-in Relay user makes every other user safer. When an SOS
fires, nearby available responders get pinged; the first to accept gets
walking/driving navigation to the patient and the CPR coach.

## Prerequisites
1. Run `supabase/responder-mesh.sql` in the Supabase SQL editor.
2. Two test devices/accounts.

## Build steps
1. Settings: "Be a responder" section — availability toggle, CPR-trained
   toggle. On enable: geolocation permission, write row to `responders`,
   refresh lat/lng on dashboard visits (throttled).
2. Server: `/api/mesh/ping` (called from routing page after SOS insert,
   service role): finds `responders` where available, within ~800m
   (haversine in SQL or JS filter), not the patient; inserts
   `responder_alerts` rows; sends web-push to each ("Cardiac emergency
   400m away — can you help?").
3. Responder flow: push click -> `/respond/[alertId]` page: emergency type,
   distance, Accept / Can't. Accept -> status=accepted, opens Relay
   navigation to patient coords + CPR coach shortcut; joins the Relay Room
   channel as role "responder" so family sees "A CPR-trained neighbor is
   2 min away".
4. Patient routing page: listens for accepted alerts (realtime on
   `responder_alerts` filtered by emergency_id needs replication enabled,
   or poll) -> timeline event + banner.
5. Safety copy: responders are volunteers, not medical professionals;
   always alongside 911, never instead of it.

## Risks
- Location freshness (stale responder positions) — refresh on app open.
- Ghost responders — expire availability after 24h without update.
- Abuse — only ping verified accounts; cap radius and frequency.

# Relay Arc — Code Quality, Security & Bug Audit

**Date:** 2026-06-20  
**Scope:** Full codebase review of a life-critical cardiac emergency PWA  
**Stack:** Next.js 14 App Router · TypeScript · Supabase · Groq SDK · Leaflet · Framer Motion

---

## Severity Key

| Icon | Level | Meaning |
|------|-------|---------|
| 🔴 | Critical | Exploitable now or causes data loss / patient harm in emergency scenarios |
| 🟠 | High | Significant risk to security, reliability, or patient safety |
| 🟡 | Medium | Degrades correctness or maintainability in non-trivial ways |
| 🟢 | Low | Code smell, minor inconsistency, or polish issue |

---

## 1. Security Vulnerabilities

### 🔴 SEC-1 — Groq API key exposed in client bundle (3 files)

**Files:** `app/checkin/page.tsx:12`, `app/timeline/page.tsx:11`, `app/care-team/dashboard/page.tsx:12–15`  
**Description:** All three files construct a `Groq` client using `process.env.NEXT_PUBLIC_GROQ_API_KEY!` with `dangerouslyAllowBrowser: true`. The `NEXT_PUBLIC_` prefix forces Next.js to inline the value into the browser JavaScript bundle. Anyone who opens DevTools → Network → Sources or `view-source:` can steal the key and make unlimited Groq API calls at the project owner's expense.

**Impact:** Key theft, unlimited LLM usage billed to the developer, potential extraction of other patients' medical data if the key is also used server-side.

**Fix:** Remove all browser-side Groq instantiation. Create server-side API routes (e.g. `app/api/groq/checkin/route.ts`, `app/api/groq/timeline/route.ts`, `app/api/groq/summary/route.ts`). Move the key to a non-`NEXT_PUBLIC_` env var (`GROQ_API_KEY`). The client pages call these routes over HTTPS; the key never leaves the server.

---

### 🔴 SEC-2 — Real credentials committed in `.env.local`

**File:** `.env.local`  
**Description:** The `.env.local` file contains live production credentials:
- Supabase project URL and anon key (identifies the real database)
- Groq API key (`gsk_[REDACTED: rotated]`)
- VAPID public and **private** keys
- Contact email

If this repository is ever pushed to a public remote, all credentials are immediately compromised. The VAPID private key in particular cannot be rotated without invalidating every existing push subscription.

**Impact:** Full database access, ability to send push notifications to all patients, Groq billing abuse.

**Fix:**
1. Add `.env.local` to `.gitignore` immediately and verify it is not in git history (`git log --all --full-history -- .env.local`).
2. If it has ever been committed, rotate all credentials now.
3. Create `.env.example` with placeholder values only.

---

### 🔴 SEC-3 — Care team access code hardcoded and displayed in UI

**File:** `app/care-team/login/page.tsx:9, 111`  
**Description:**
```ts
const CARE_TEAM_CODE = 'relay-care-2026'
```
The access code is (a) a JavaScript constant compiled into the bundle, and (b) **printed in plain text at the bottom of the login page** (`line 111`):
```tsx
<p ...>Access code: relay-care-2026</p>
```
Any patient who navigates to `/care-team/login` can see this code and self-register as a care team member. There is no server-side validation of the code.

**Impact:** Patients or external actors can create care team accounts and read all patient profiles, check-ins, medications, emergencies, and PHI. This is a complete privilege escalation.

**Fix:**
1. Remove the on-screen display immediately.
2. Move code validation to a server-side API route where it is compared against an env var, not a client constant.
3. Consider replacing the shared-secret model with an invite-link or admin-approval flow.

---

### 🔴 SEC-4 — API route uses anon Supabase client to authorise push notifications

**Files:** `app/api/push/send/route.ts:11–14`, `app/api/push/subscribe/route.ts:4–7`  
**Description:** Both push API routes create a Supabase client with the public anon key:
```ts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```
They then call `supabase.auth.getUser(token)` with this anon client. The anon key is rate-limited and subject to Row-Level Security policies designed for the browser, not a privileged server context. The correct pattern for server-side token verification and privileged DB writes is to use the **service-role key** (`SUPABASE_SERVICE_ROLE_KEY`, never `NEXT_PUBLIC_`).

**Impact:** Depending on RLS configuration, the anon client may silently fail to read `push_subscriptions`, return empty data, or have its queries bypassed by a crafted JWT.

**Fix:** Use `createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)` in all API routes that perform privileged operations. Keep the service role key out of the `NEXT_PUBLIC_` namespace.

---

### 🟠 SEC-5 — No Row-Level Security verification visible for critical tables

**Files:** `lib/supabase.ts`, all pages querying Supabase  
**Description:** The app relies exclusively on the Supabase anon key from the browser. Without confirmed RLS policies on `profiles`, `checkins`, `emergencies`, `medications`, `medication_logs`, `appointments`, and `push_subscriptions`, any authenticated user can read or modify any other user's data with a simple crafted query. The code does not demonstrate any server-side access control beyond trusting the caller's `user.id`.

**Impact:** If RLS is misconfigured (a common oversight), patient A can read patient B's medical history, medications, check-ins, and emergency records.

**Fix:** Verify that every table has RLS enabled and that each policy checks `auth.uid() = user_id` (or equivalent). Add this to a CI test using Supabase's `pg_tap` or the CLI's `supabase test` tooling. Document the policies in a `SECURITY.md`.

---

### 🟠 SEC-6 — Hospital API route has no authentication and is open to abuse

**File:** `app/api/hospitals/route.ts`  
**Description:** The `/api/hospitals` POST endpoint accepts a `{ lat, lng }` body and makes an outbound Nominatim query with no authentication, rate limiting, or input validation. An attacker can:
- Spam the endpoint, exhausting Nominatim's rate limit (1 req/s for anonymous callers per OSM policy), breaking the emergency flow for real users.
- Pass arbitrary lat/lng values to probe the OSM API through the app's server.

**Impact:** DoS of the hospital-lookup critical path; potential IP ban from Nominatim that breaks hospital routing for all users.

**Fix:**
1. Require a valid Supabase JWT in the `Authorization` header.
2. Validate `lat` and `lng` are finite floats in `[-90,90]` and `[-180,180]` respectively.
3. Add server-side rate limiting (e.g. 1 req per 10 s per user).
4. Add the `Nominatim-User-Agent` header with a real contact email (required by OSM policy).

---

### 🟠 SEC-7 — LegalModal consent stored only in `localStorage`

**File:** `components/LegalModal.tsx:164`  
**Description:** Acceptance of the Privacy Policy and Terms of Service is recorded only in `localStorage` under the key `relay_arc_legal_v1`. There is no server-side record of when a user accepted, which version they accepted, or their identity.

**Impact:**
- Legal: the app collects PHI and AI-processes health data. A timestamped, server-stored consent record is essential for GDPR/CCPA compliance and potential litigation.
- Practical: a user who clears storage is asked to re-accept but the prior acceptance is unrecoverable.
- Privacy Policy section 8 explicitly states the platform is not HIPAA-compliant, but consent records are still required under CCPA and EU GDPR Article 7.

**Fix:** On final acceptance, write a record to a `consents` table in Supabase: `{ user_id, accepted_at, policy_version, ip_hash }`. Keep `localStorage` as the "already shown" flag only.

---

### 🟠 SEC-8 — UUID generation for meeting rooms uses `Math.random()`

**Files:** `app/appointments/page.tsx:248`, `components/MeetingAlert.tsx:299`  
**Description:** Meeting room IDs are generated with:
```ts
([1e7] as any + (-1e3) + (-4e3) + (-8e3) + (-1e11))
  .replace(/[018]/g, (c: any) => (c ^ (Math.random() * 16 >> c/4)).toString(16))
```
`Math.random()` is not cryptographically secure. An attacker who can observe one room ID and knows the approximate timing could brute-force or predict future room IDs and join video calls uninvited.

**Impact:** Uninvited third parties could join patient-doctor video consultations, exposing PHI.

**Fix:** Use `crypto.randomUUID()` (available natively in modern Node.js and browsers) or `uuid` package's `v4()`. Both use a CSPRNG.

---

### 🟡 SEC-9 — `next.config.ts` CSP allows `unsafe-inline` and `unsafe-eval`

**File:** `next.config.ts:22`  
**Description:** The Content Security Policy includes `'unsafe-inline'` and `'unsafe-eval'` in `script-src`. While this is noted as required for Next.js hydration, it neutralises the XSS protection that CSP is intended to provide. Any XSS vulnerability in the app or a dependency can execute arbitrary scripts.

**Impact:** Reduces defence-in-depth against XSS, which is particularly dangerous given the app processes PHI.

**Fix:** Migrate to Next.js nonce-based CSP (available since Next.js 13.4) which injects a per-request nonce into `script-src` and allows removal of `unsafe-inline`. Replace `unsafe-eval` with the specific hashes of any eval-using scripts, or replace those dependencies.

---

### 🟡 SEC-10 — Push notification `nudge.content` rendered unescaped in a notification body

**File:** `components/MeetingAlert.tsx:267`  
**Description:**
```ts
body: `Please take your ${nudge.content}.`
```
`nudge.content` is read directly from the `patient_notes` Supabase table, inserted by care team members. While notification `body` is not rendered as HTML, it is displayed verbatim on the lock screen. A care team member with bad intent could insert misleading or alarming content (e.g. fake dosage instructions).

**Fix:** Sanitise or truncate `nudge.content` to a known-safe maximum length (e.g. 120 chars) server-side before inserting, and validate it on read.

---

## 2. Bugs and Logic Errors

### 🔴 BUG-1 — Emergency flow uses hardcoded New Jersey coordinates as geolocation fallback

**File:** `app/emergency/routing/page.tsx:124`  
**Description:** When `navigator.geolocation` fails or the user denies permission:
```ts
const hospitals = await findNearbyHospitals(40.2715, -74.6600, type)
```
Coordinates `40.2715, -74.6600` are in central New Jersey, USA. A patient in London, Tokyo, or Sydney who cannot share their location will be shown hospitals 10,000 km away — or no hospitals at all if none match within the search radius.

**Impact:** In a life-threatening emergency, a patient is given wrong or no hospital guidance. This is the single highest-risk bug in the codebase.

**Fix:**
1. Do not fall back to a hardcoded coordinate. Instead, show a clear error state: "We cannot find your location. Call 999 / 911 immediately."
2. Optionally, prompt the user to type their city/postcode as a fallback.
3. Remove the misleading `setLocationError('Using demo location')` message — a real emergency patient seeing "demo location" is terrifying.

---

### 🔴 BUG-2 — `handleSelect` in `app/emergency/page.tsx` does not `await` the Supabase insert before navigating

**File:** `app/emergency/page.tsx:34–55`  
**Description:** The emergency record insert is awaited but error is not checked:
```ts
const { data } = await supabase
  .from('emergencies')
  .insert(...)
  .select()
  .single()
emergencyId = data?.id || ''
```
If the insert fails (network error, RLS denial, Supabase outage), `emergencyId` is silently set to `''` and the routing page proceeds with no emergency ID. The care team dashboard will never see this emergency. There is no try/catch and no error UI shown to the user.

**Impact:** During an actual emergency, the care team is not alerted. The patient believes help has been called when it has not.

**Fix:**
```ts
const { data, error } = await supabase.from('emergencies').insert(...).select().single()
if (error || !data) {
  // Show a prominent error: "Failed to alert care team. Call 911 immediately."
  setLoading(false)
  return
}
emergencyId = data.id
```

---

### 🔴 BUG-3 — Checkin `sendMessage` has no try/catch around the primary Groq call

**File:** `app/checkin/page.tsx:58–66`  
**Description:**
```ts
const completion = await groq.chat.completions.create({ ... })
```
This `await` is at the top level of `sendMessage` with no surrounding `try/catch`. If the Groq API is down, rate-limits the request, or returns a malformed response, an unhandled promise rejection is thrown. The UI is left in `loading=true` with the spinner stuck — there is no way for the user to recover without a page reload.

**Impact:** Patient cannot complete check-in; care team is not notified of symptoms that may be clinically important.

**Fix:** Wrap the entire async body in try/catch; on error, show a toast and set `loading(false)`:
```ts
} catch (e) {
  toast.error('Could not reach health assistant. Please try again.')
  setLoading(false)
}
```

---

### 🟠 BUG-4 — `processAndMarkMissed` fires-and-forgets the Supabase update (3 locations)

**Files:** `app/appointments/page.tsx:33–36`, `app/care-team/dashboard/page.tsx:46–56`  
**Description:**
```ts
supabase.from('appointments').update({ status: 'missed' }).in('id', missedIds)
// no await, no error handling
```
The promise is not awaited. If the update fails (network issue, RLS), the UI shows the appointment as "missed" but the database still shows "confirmed". On next page load, the appointment reverts.

**Impact:** Care team may see different appointment states than what the database actually holds; a patient may try to join a "confirmed" call that the care team believes is missed.

**Fix:** `await` the update and check the error response. Alternatively, move this logic to a server-side cron or database trigger.

---

### 🟠 BUG-5 — Navigation component `useEffect` re-runs every GPS position update, causing route re-fetching

**File:** `components/Navigation.tsx:141–199`  
**Description:**
```ts
useEffect(() => {
  // sets up watchPosition
  // navigator.geolocation.watchPosition(...)
}, [steps, currentStep])  // ← depends on steps and currentStep
```
The `useEffect` dependency array includes `steps` and `currentStep`. Every time the user moves and `currentStep` advances, the entire effect re-runs: it calls `getCurrentPosition` again, fires a new `watchPosition`, and fetches the OSRM route again. The previous `watchPosition` is also cleared, causing GPS tracking gaps. The `fetchRoute` function is wrapped in `useCallback` but `hospital` is listed as a dependency, meaning a new function reference is created on every render.

**Impact:** During an emergency navigation, route refetches may blank out the map for several seconds. Multiple overlapping `watchPosition` listeners could drain battery rapidly.

**Fix:** Split the effect into two:
1. One `useEffect([], [])` (empty deps) for `getCurrentPosition` + `fetchRoute`.
2. One `useEffect(() => { ... }, [steps, currentStep])` for the step-advance logic only, using a ref for position instead of GPS events.

---

### 🟠 BUG-6 — `requestAgain` in `app/appointments/page.tsx` does not await cancellation before re-showing the form

**File:** `app/appointments/page.tsx:232–237`  
**Description:**
```ts
const requestAgain = (appt: any) => {
  supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appt.id) // no await
  setAppointments(prev => prev.filter(a => a.id !== appt.id))
  setConcern(appt.patient_concern || '')
  setShowRequest(true)
}
```
The cancellation is fire-and-forget. If it fails, the old appointment remains "missed" in the DB while being removed from local state. The patient creates a new appointment request without the old one ever being cancelled — the care team sees two active requests.

**Fix:** Make the function `async`, await the update, check for error, and only proceed if successful.

---

### 🟠 BUG-7 — `medications` page `taken` state resets on every page mount

**File:** `app/medications/page.tsx:29, 56–69`  
**Description:** The `taken` state is pure in-memory React state initialised to `{}`. There is no persistence to `localStorage` or the database. If the user navigates away and returns, all tick marks are cleared. The medication log is still written to Supabase, but the UI shows all doses as untaken. Additionally, when a user "untakes" a dose (`!taken[key]` becomes `true` again), no database log is created for the reversal — but the previous log record remains, causing double-counting in the care team's adherence calculation.

**Fix:**
1. On load, fetch today's `medication_logs` for the current user and pre-populate `taken` state from them.
2. Handle "undo" actions by deleting the corresponding log record.

---

### 🟡 BUG-8 — Timeline LLM response is `JSON.parse`d without validation of shape

**File:** `app/timeline/page.tsx:51`  
**Description:**
```ts
const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
setTimeline(parsed)
```
If the LLM returns something that is valid JSON but not an array (e.g. `{"error": "..."}` or a nested object), the `.map()` call on the timeline will throw or render nothing with no user feedback. The `catch` only logs the error and shows a "Could not generate timeline" state, but only after `setGenerating(false)` — if `parsed` is not an array, `setTimeline(parsed)` runs first and can crash the render.

**Fix:**
```ts
if (!Array.isArray(parsed)) throw new Error('Unexpected LLM response shape')
```

---

### 🟡 BUG-9 — `buildScheduledAt` falls back to `new Date()` when no day is selected

**File:** `app/appointments/page.tsx:214–219`  
**Description:**
```ts
const buildScheduledAt = () => {
  if (!selectedDay) return new Date().toISOString()
  ...
}
```
The `canSubmit` check requires `selectedDay !== null`, so this branch should be unreachable in normal usage. However, if `request()` is called programmatically (e.g. via keyboard shortcut, race condition, or future refactor), an appointment is silently booked for the current moment. The broken UUID UUID generation for `meetingRoomId` (see SEC-8) makes this doubly fragile.

**Fix:** Replace the fallback with `throw new Error('No day selected')` inside `buildScheduledAt`, or remove the fallback entirely since `canSubmit` should guard it.

---

### 🟡 BUG-10 — `dismissEmergency` resolves all of a patient's active emergencies, not just the displayed one

**File:** `app/care-team/dashboard/page.tsx:271–275`  
**Description:**
```ts
const dismissEmergency = async (patientId: string) => {
  await supabase.from('emergencies')
    .update({ status: 'resolved' })
    .eq('user_id', patientId)
    .eq('status', 'active')
```
This resolves **every** active emergency for the patient, not the specific one shown on screen. If two SOS events were created in rapid succession (possible given BUG-2 can leave orphaned records), both are resolved when the care team dismisses one.

**Fix:** Pass and use `emergency.id` instead of `patient_id`:
```ts
.eq('id', emergencyId)
```

---

## 3. Error Handling

### 🟠 ERR-1 — `registerServiceWorker` swallows errors silently

**File:** `lib/notifications.ts:5–8`  
**Description:**
```ts
try {
  await navigator.serviceWorker.register('/sw.js')
} catch {}
```
Empty catch block. If service worker registration fails (e.g. the file 404s, a CSP violation, an HTTPS requirement not met in dev), the failure is invisible. Push notifications will silently stop working and the user will never know.

**Fix:** At minimum `console.error` the caught error. Optionally surface a non-blocking UI indicator that push notifications could not be registered.

---

### 🟠 ERR-2 — `sendPushNotification` in `lib/notifications.ts` swallows errors silently

**File:** `lib/notifications.ts:37–49`  
**Description:**
```ts
try {
  await fetch('/api/push/send', ...)
} catch {}
```
Empty catch. Push notification delivery failures after a check-in are silently ignored. The `fetch` could fail if the API route is down or returns a non-2xx status — but the status is never checked either.

**Fix:**
```ts
const res = await fetch(...)
if (!res.ok) console.error('Push send failed:', await res.text())
```

---

### 🟠 ERR-3 — `app/emergency/page.tsx` has no error handling for geolocation or Supabase failures

**File:** `app/emergency/page.tsx:34–55`  
**Description:** The `handleSelect` async function does not wrap its body in try/catch. Supabase `update` and `insert` errors are silently discarded (`const { data } = await ...` — the `error` field is never read). The `loading` state is also never reset to `false` if an error occurs, permanently disabling all buttons.

**Fix:** Add try/catch. On error, reset `loading(false)`, reset `selected('')`, and show a toast: "Failed to start emergency. Call 911 now."

---

### 🟡 ERR-4 — `app/medications/page.tsx` does not handle `removeMedication` or `addTime`/`removeTime` errors

**File:** `app/medications/page.tsx:86–108`  
**Description:** `removeMedication`, `addTime`, and `removeTime` all fire Supabase `update` calls without awaiting or checking errors. State is updated optimistically. If the DB write fails, the UI and database are out of sync with no recovery path.

**Fix:** Await the Supabase calls, check for errors, and revert state on failure.

---

### 🟡 ERR-5 — `app/care-team/dashboard/page.tsx` `generateSummaries` silently skips failed patients

**File:** `app/care-team/dashboard/page.tsx:223–245`  
**Description:**
```ts
} catch (e) {
  console.error('Error for', patient.full_name)
}
```
An LLM failure for a high-priority patient is logged to console but the care team sees no indication that the summary is stale or missing. The summary card simply shows `—`.

**Fix:** Set a per-patient error state or flag so the UI can show "Analysis failed — retry" for specific patients.

---

## 4. TypeScript Issues

### 🟠 TS-1 — Pervasive use of `any` type across all pages

**Files:** Every page file uses `useState<any[]>`, `useState<any>`, `(m: any)`, `(el: any)`, etc.  
**Description:** The following variables are typed as `any` with no runtime shape validation:
- `profile` in dashboard, checkin, appointments, timeline, care-team/dashboard
- `medications` array items in medications, care-team/dashboard
- `appointments`, `patients`, `checkins`, `emergencies`, `medLogs` in care-team/dashboard
- All Supabase query results

**Impact:** TypeScript provides no protection against missing fields being accessed (e.g. `profile.medications.slice(0, 3)` would throw if `medications` is `null`). Refactoring is dangerous because no IDE can detect cascading breakages.

**Fix:** Define TypeScript interfaces for core data models (`Profile`, `Medication`, `Appointment`, `Emergency`, `CheckIn`) and type Supabase queries using the generated Supabase client types (`supabase gen types typescript`).

---

### 🟡 TS-2 — Non-null assertion `!` used on all env vars without runtime guard

**Files:** `lib/supabase.ts`, `lib/notifications.ts`, `app/checkin/page.tsx`, `app/timeline/page.tsx`, `app/care-team/dashboard/page.tsx`, all API routes  
**Description:** Every environment variable is accessed with `!` (non-null assertion), e.g. `process.env.NEXT_PUBLIC_GROQ_API_KEY!`. If the env var is missing (common in CI, staging, or onboarding), the `!` suppresses the TypeScript error and the value is `undefined`, which causes a runtime crash at the first use.

**Fix:** Add a startup validation module:
```ts
// lib/env.ts
function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}
export const GROQ_API_KEY = required('GROQ_API_KEY')
```

---

### 🟡 TS-3 — `(c: any)` cast in UUID generation hides type error

**Files:** `app/appointments/page.tsx:248`, `components/MeetingAlert.tsx:299`  
**Description:** The UUID generation uses `as any` casts to work around TypeScript's type system for a fundamentally incorrect UUID algorithm (see SEC-8). This is a code smell indicating the implementation should be replaced entirely.

---

### 🟢 TS-4 — `MapController` `useEffect` missing `map` dependency

**File:** `components/Navigation.tsx:71–78`  
**Description:**
```ts
useEffect(() => {
  if (position) map.setView(position, 16, ...)
}, [position])  // map is missing from deps
```
`map` is declared inside the component via `useMap()` and could theoretically change between renders. While in practice Leaflet's `useMap()` returns a stable reference, the missing dependency will cause ESLint (with `react-hooks/exhaustive-deps`) to warn and may behave incorrectly if the map instance is ever replaced.

---

## 5. Performance Issues

### 🟠 PERF-1 — `scheduleCheckinReminders` uses recursive `setTimeout` and is never cleaned up

**File:** `app/dashboard/page.tsx:12–48` (referenced in the brief; not re-read)  
**Description:** A recursive `setTimeout` inside a `useEffect` without a cleanup function creates a persistent interval that continues after component unmount. Each re-mount adds another concurrent timer chain.

**Impact:** Memory leak and duplicate check-in reminders firing multiple times. In PWA context this can wake up the app repeatedly.

**Fix:** Use `setInterval` with a return cleanup:
```ts
useEffect(() => {
  const id = setInterval(scheduleCheckinReminders, INTERVAL_MS)
  return () => clearInterval(id)
}, [])
```

---

### 🟠 PERF-2 — Care team dashboard polls 3 separate Supabase tables every 25 seconds (silent refresh) plus 8-second emergency poll, loading all records with no pagination

**File:** `app/care-team/dashboard/page.tsx:141–155`  
**Description:**
```ts
supabase.from('profiles').select('*').order('created_at', ...)
supabase.from('appointments').select('*').order('scheduled_at', ...)
supabase.from('emergencies').select('*').order('created_at', ...)
```
All three queries fetch every record with no `.limit()`, `.range()`, or date filter. As the number of patients grows, this becomes increasingly slow. The emergency poll runs every 8 seconds and fetches the full emergencies table.

**Impact:** Increased latency and Supabase read unit consumption; potential UI jank as large state updates trigger re-renders.

**Fix:** Use Supabase Realtime subscriptions (already partially implemented for emergencies) for live tables, and paginate historical records. Add `created_at > NOW() - INTERVAL '30 days'` filters where appropriate.

---

### 🟡 PERF-3 — `generateSummaries` calls the LLM sequentially for all patients in a `for` loop

**File:** `app/care-team/dashboard/page.tsx:191–248`  
**Description:** Patient summaries are generated one at a time with a sequential `for...of` loop. For 20 patients this makes 20+ serial LLM API calls, taking potentially 60+ seconds.

**Fix:** Use `Promise.allSettled()` with a concurrency limit (e.g. `p-limit` with concurrency 3) to parallelise while respecting Groq's rate limits.

---

### 🟡 PERF-4 — `MeetingAlert` component polls Supabase every 30 seconds for all confirmed appointments on every authenticated page

**File:** `components/MeetingAlert.tsx:178–283`  
**Description:** The `MeetingAlert` component is mounted on every patient-facing page (via the layout). Every 30 seconds it queries `appointments`, `patient_notes`, and potentially fires service worker notifications. This means for a user who leaves the app open, there are continuous DB reads every 30 seconds.

**Fix:** Use Supabase Realtime channel for appointment state changes instead of polling. The `patient_notes` check specifically could be replaced with a push notification from the care team side.

---

## 6. Race Conditions

### 🟠 RACE-1 — Emergency ID resolution race: routing page loads before emergency record exists

**File:** `app/emergency/routing/page.tsx:66–83`, `app/emergency/page.tsx:54`  
**Description:**
```ts
// page.tsx (emergency select)
setTimeout(() => router.push(`/emergency/routing?type=${type}&id=${emergencyId}`), 500)
```
The 500ms `setTimeout` is intended to give the Supabase insert time to complete. This is an anti-pattern. If the insert takes longer than 500ms (slow network, high latency), the routing page receives `id=''` and falls back to a second query (`resolveEmergencyId`) that may also fail if the record still doesn't exist yet.

**Fix:** Remove the `setTimeout`. Navigate immediately after the insert completes (or fails). The insert is already awaited — the delay is artificial and unreliable.

---

### 🟠 RACE-2 — `MeetingAlert` timer map and `userId` state can race on mount

**File:** `components/MeetingAlert.tsx:149–176`  
**Description:** The initial `init()` call sets `userId` via `setUserId(user.id)`. The second `useEffect` that depends on `userId` starts the polling loop. However, if `init()` takes longer than the re-render cycle, and another async operation completes and triggers a re-render before `userId` is set, the polling loop may start with an empty `userId`. The `timers` ref is also never cleared when `userId` changes (e.g. sign-out and sign-back-in without full page reload).

**Fix:** Store the user ID in a `ref` alongside the state to avoid the async gap. Clear the `timers` ref on `userId` change.

---

### 🟡 RACE-3 — `MeetingAlert` and `app/appointments/page.tsx` both manage the upcoming-meeting banner independently

**Files:** `components/MeetingAlert.tsx`, `app/appointments/page.tsx`  
**Description:** When the user is on the `/appointments` page, both the page component and the global `MeetingAlert` component check for upcoming meetings and can show the meeting modal simultaneously. The `appointments` page skips `MeetingAlert` via `pathname === '/appointments'` but runs its own 30-second poll. Both poll the same table with the same logic.

**Impact:** If the user joins via the page's banner and `MeetingAlert` fires a separate native notification, they may receive duplicate alerts.

**Fix:** Centralise meeting-alert state in a Context provider or Zustand store, consumed by both components.

---

## 7. PWA / Service Worker

### 🟡 SW-1 — Service worker intercepts all fetches and passes them through with no caching strategy

**File:** `public/sw.js:3`  
**Description:**
```js
self.addEventListener('fetch', (event) => event.respondWith(fetch(event.request)))
```
The fetch handler is a passthrough — it adds a service worker overhead to every network request with no caching benefit. A PWA is expected to provide offline functionality or at least cache the app shell; this implementation provides neither.

**Impact:**
- Every request incurs an extra service worker dispatch hop.
- The app has no offline capability despite being a PWA with a manifest.
- During an emergency, if the user loses signal after loading the page, nothing is cached and the app goes blank.

**Fix:** Implement a cache-first strategy for the app shell (HTML, CSS, JS) and a network-first strategy for API calls. Consider using Workbox (via `next-pwa`) to generate a proper precache manifest.

---

### 🟡 SW-2 — Push notification payload is not validated in the service worker

**File:** `public/sw.js:5–15`  
**Description:**
```js
const data = event.data.json()
```
If `event.data` is `null` (a push with no payload) or contains non-JSON data, this throws an unhandled exception inside the service worker, silently killing the push handler for that event.

**Fix:**
```js
if (!event.data) return
let data
try { data = event.data.json() } catch { return }
```

---

### 🟡 SW-3 — `clients.matchAll` in notification click handler uses `var` and lacks `openWindow` null check

**File:** `public/sw.js:17–31`  
**Description:** The handler uses `var c` (not `const` or `let`) inside a `for...of` loop, which is a scope hazard. More critically, `clients.openWindow(url)` is called without checking if the `url` is a same-origin URL — the Web Push spec requires `openWindow` to only open same-origin URLs, and it will throw on a cross-origin URL.

**Fix:** Use `const`, validate `url` starts with `self.location.origin`, and add a try/catch around `clients.openWindow`.

---

## 8. Dead Code and Missing Implementations

### 🟠 DEAD-1 — `careTeamAlerted` state is set but never reflected in care team actions

**File:** `app/emergency/routing/page.tsx:34, 104, 120–121, 136`  
**Description:**
```ts
const [careTeamAlerted, setCareTeamAlerted] = useState(false)
// ...
setTimeout(() => setCareTeamAlerted(true), 1800)
```
`careTeamAlerted` is set to `true` after 1.8 seconds as a UI-only indicator. There is no actual push notification, email, SMS, or Supabase event sent to the care team when an SOS is triggered. The care team only knows via:
1. Polling the `emergencies` table every 8 seconds in their dashboard.
2. Supabase Realtime (which may or may not be enabled).

This means there is no active alert to the care team — only a passive DB record.

**Impact:** In a life-threatening emergency, the care team may not notice the SOS for up to 8 seconds (or longer if their tab is backgrounded and Realtime is not enabled). There is no push notification, no sound, no email.

**Fix:** When a new SOS emergency is created, immediately call `sendPushNotification` for each care team member's user ID. The API route for this already exists. Wire it up from the emergency creation step.

---

### 🟠 DEAD-2 — `console.log` left in production path

**File:** `lib/hospitals.ts:71`  
**Description:**
```ts
console.log('Hospital elements:', elements.length, elements[0])
```
This fires on every emergency hospital search and logs potentially sensitive data (hospital names, coordinates derived from the patient's location) to the browser console.

**Fix:** Remove before deployment. Replace with a debug-mode only log if needed.

---

### 🟡 DEAD-3 — `radius` parameter in hospital search is passed to the API route but the route ignores it

**File:** `lib/hospitals.ts:62`, `app/api/hospitals/route.ts:3`  
**Description:** `findNearbyHospitals` passes `{ lat, lng, radius }` in the POST body, but `route.ts` only destructures `{ lat, lng }`:
```ts
const { lat, lng } = await req.json()
```
The `radiusKm` parameter is silently ignored. The API route uses a hardcoded bounding box series (`0.2, 0.5, 1.0, 2.0` degrees) regardless of the requested radius.

**Fix:** Either destructure and use `radius` in the route, or remove it from the client call to avoid the misleading API contract.

---

### 🟡 DEAD-4 — `app/api/cron/checkin-reminder/route.ts` exists but is not linked to any cron configuration

**File:** `app/api/cron/checkin-reminder/route.ts`  
**Description:** A cron route exists but there is no `vercel.json` with a `crons` configuration, no `next.config.ts` cron entry, and no documentation of how it is triggered.

**Fix:** Add a `vercel.json` with:
```json
{
  "crons": [{ "path": "/api/cron/checkin-reminder", "schedule": "0 9 * * *" }]
}
```
Or document and remove if unused.

---

### 🟡 DEAD-5 — `radius` field in `findNearbyHospitals` type is passed but Nominatim search uses bounding boxes, not radius

**File:** `lib/hospitals.ts:52–57`  
**Description:** The function signature says `radiusKm: number = 50` but Nominatim's `viewbox` parameter is a bounding box, not a circle. The effective search area for a given radius varies with latitude (a 1-degree box at the equator ≠ a 1-degree box at 60°N). This can result in missed hospitals at high latitudes and overly broad searches near the equator.

**Fix:** Either convert `radiusKm` to a lat/lng bounding box correctly (`Δlat = radius_km / 111`, `Δlng = radius_km / (111 * cos(lat))`), or switch to the Overpass API which natively supports radius-based queries.

---

### 🟢 DEAD-6 — `NavigationComponent.tsx:heading` state is tracked but never used for map rotation

**File:** `components/Navigation.tsx:90, 169`  
**Description:** `setHeading(pos.coords.heading || 0)` updates state, and `<MapController position={position} heading={heading}/>` accepts it as a prop, but inside `MapController` the `heading` prop is never used — the map is not rotated to match the user's travel direction.

**Fix:** Either implement map rotation using `map.setBearing(heading)` (requires a Leaflet plugin like `leaflet-rotate`), or remove the `heading` state and prop to reduce unnecessary re-renders.

---

### 🟢 DEAD-7 — `BottomNav` partial path matching for `/emergency` will incorrectly hide nav on unrelated routes

**File:** `components/BottomNav.tsx:19`  
**Description:**
```ts
const hideOn = ['/login', '/onboarding', '/emergency', '/care-team', '/nurse', '/driver', '/transport']
if (hideOn.some(p => pathname.startsWith(p))) return null
```
A future route like `/emergencycontact` or `/emergency-prep` would be incorrectly treated as part of the emergency flow and hide the bottom nav. Similarly, `/transport` and `/driver` appear to be planned routes that don't exist yet.

**Fix:** Use exact matches or trailing-slash-anchored patterns: `pathname === '/emergency' || pathname.startsWith('/emergency/')`.

---

## Summary Table

| # | Severity | Category | File | Short Description |
|---|----------|----------|------|-------------------|
| SEC-1 | 🔴 Critical | Security | checkin, timeline, care-team/dashboard | Groq API key in client bundle |
| SEC-2 | 🔴 Critical | Security | `.env.local` | Live credentials in potentially-committed file |
| SEC-3 | 🔴 Critical | Security | care-team/login | Access code hardcoded + displayed in UI |
| SEC-4 | 🔴 Critical | Security | api/push/* | API routes use anon key instead of service-role |
| BUG-1 | 🔴 Critical | Bug | emergency/routing | NJ hardcoded fallback for global users |
| BUG-2 | 🔴 Critical | Bug | emergency/page | No error handling on emergency DB insert |
| BUG-3 | 🔴 Critical | Bug | checkin/page | Primary Groq call uncaught; UI stuck on error |
| SEC-5 | 🟠 High | Security | all pages | RLS not verified; anon key for all DB access |
| SEC-6 | 🟠 High | Security | api/hospitals | Unauthenticated, rate-unlimited hospital endpoint |
| SEC-7 | 🟠 High | Security | LegalModal | Consent stored in localStorage only |
| SEC-8 | 🟠 High | Security | appointments, MeetingAlert | `Math.random()` for meeting room IDs |
| BUG-4 | 🟠 High | Bug | appointments, care-team/dashboard | processAndMarkMissed fire-and-forget |
| BUG-5 | 🟠 High | Bug | Navigation | useEffect deps cause repeated route re-fetch |
| BUG-6 | 🟠 High | Bug | appointments | requestAgain fire-and-forget cancellation |
| ERR-1 | 🟠 High | Error Handling | lib/notifications | Empty catch on SW registration |
| ERR-2 | 🟠 High | Error Handling | lib/notifications | Empty catch on push send |
| ERR-3 | 🟠 High | Error Handling | emergency/page | No error handling in handleSelect |
| RACE-1 | 🟠 High | Race Condition | emergency flow | setTimeout used to wait for DB insert |
| RACE-2 | 🟠 High | Race Condition | MeetingAlert | userId/timers race on mount |
| DEAD-1 | 🟠 High | Missing Impl. | emergency/routing | Care team never actually alerted via push |
| DEAD-2 | 🟠 High | Dead Code | lib/hospitals | console.log leaks patient location data |
| PERF-1 | 🟠 High | Performance | dashboard | Recursive setTimeout memory leak |
| PERF-2 | 🟠 High | Performance | care-team/dashboard | Unbounded table fetches every 8–25 sec |
| TS-1 | 🟠 High | TypeScript | all pages | Pervasive `any` typing |
| SEC-9 | 🟡 Medium | Security | next.config.ts | CSP allows unsafe-inline/eval |
| SEC-10 | 🟡 Medium | Security | MeetingAlert | nudge.content unescaped in notification |
| BUG-7 | 🟡 Medium | Bug | medications | `taken` state not persisted; adherence double-counts |
| BUG-8 | 🟡 Medium | Bug | timeline | LLM response shape not validated |
| BUG-9 | 🟡 Medium | Bug | appointments | buildScheduledAt silent fallback |
| BUG-10 | 🟡 Medium | Bug | care-team/dashboard | dismissEmergency resolves by user not by ID |
| ERR-4 | 🟡 Medium | Error Handling | medications | Mutation errors silently ignored |
| ERR-5 | 🟡 Medium | Error Handling | care-team/dashboard | LLM failures silent per-patient |
| TS-2 | 🟡 Medium | TypeScript | all files | Env vars asserted non-null with no guard |
| TS-3 | 🟡 Medium | TypeScript | appointments, MeetingAlert | `as any` cast for UUID generation |
| PERF-3 | 🟡 Medium | Performance | care-team/dashboard | Sequential LLM calls for all patients |
| PERF-4 | 🟡 Medium | Performance | MeetingAlert | 30s poll on every patient page |
| RACE-3 | 🟡 Medium | Race Condition | appointments/MeetingAlert | Duplicate meeting alert logic |
| SW-1 | 🟡 Medium | PWA | sw.js | SW passthrough = no caching, no offline |
| SW-2 | 🟡 Medium | PWA | sw.js | Unvalidated push payload can crash SW |
| SW-3 | 🟡 Medium | PWA | sw.js | var scoping + no URL origin check |
| DEAD-3 | 🟡 Medium | Dead Code | hospitals.ts / route.ts | radius param ignored by API route |
| DEAD-4 | 🟡 Medium | Missing Impl. | api/cron | Cron route not wired to any scheduler |
| DEAD-5 | 🟡 Medium | Bug | hospitals.ts | Radius-to-bounding-box conversion incorrect |
| TS-4 | 🟢 Low | TypeScript | Navigation | Missing `map` dep in useEffect |
| DEAD-6 | 🟢 Low | Dead Code | Navigation | heading state tracked but never applied |
| DEAD-7 | 🟢 Low | Dead Code | BottomNav | Partial path matching is fragile |

---

## Immediate Action Checklist (Critical Path)

These must be addressed before any production deployment or public access:

- [ ] **SEC-1** Move all Groq calls server-side; remove `NEXT_PUBLIC_GROQ_API_KEY`
- [ ] **SEC-2** Rotate all credentials; add `.env.local` to `.gitignore`; audit git history
- [ ] **SEC-3** Remove access code from UI; move validation server-side
- [ ] **BUG-1** Remove hardcoded NJ coordinates; show clear "call 911" error on location failure
- [ ] **BUG-2** Add error handling to emergency insert; block navigation on failure
- [ ] **BUG-3** Wrap Groq call in try/catch in `sendMessage`
- [ ] **DEAD-1** Wire push notification to care team on every new SOS event
- [ ] **SEC-4** Use service-role key in all API routes

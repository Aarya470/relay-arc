# Relay Arc — UX Audit
**Audited:** 2026-06-20  
**Scope:** All patient-facing pages + shared components  
**Files reviewed:** `app/page.tsx`, `app/login/page.tsx`, `app/onboarding/page.tsx`, `app/dashboard/page.tsx`, `app/emergency/page.tsx`, `app/emergency/routing/page.tsx`, `app/checkin/page.tsx`, `app/medications/page.tsx`, `app/appointments/page.tsx`, `app/timeline/page.tsx`, `app/care-team/login/page.tsx`, `components/BottomNav.tsx`, `components/MeetingAlert.tsx`, `components/LegalModal.tsx`, `components/Navigation.tsx`

---

## Severity Legend
- 🔴 **Critical** — Can block or endanger a user during an actual cardiac emergency  
- 🟠 **High** — Significant UX failure that will cause confusion, data loss, or missed care  
- 🟡 **Medium** — Real friction that harms usability but does not endanger  
- 🟢 **Low** — Polish, copy, or minor accessibility issue  

---

## 1. Emergency Flow (`/emergency`, `/emergency/routing`)

### 🔴 CRIT-1 — "Alerting care team" is cosmetic, not real
**File:** `app/emergency/routing/page.tsx`, lines 233–254  
**Issue:** The "Care team alerted" status is triggered by a `setTimeout(() => setCareTeamAlerted(true), 1500)` (line 104) or 1800 ms (line 120). It is purely a UI animation. No push notification, webhook, email, or database trigger is fired to notify a care team member. The `emergencies` table row is created in `/emergency/page.tsx`, but there is no mechanism shown that actually alerts a care provider in real time.  
**Why it matters:** A patient who triggers SOS and sees "Care team alerted — they can see your emergency" believes help is coming. If no human is actually notified, this false confirmation is a life-safety lie during a cardiac event.  
**Fix:** Either wire up a real-time notification (Supabase real-time subscription on the care team dashboard, or a server-side push/webhook on `emergencies` insert), or change the copy to "Emergency logged — call 911 if you need immediate help."

---

### 🔴 CRIT-2 — Fallback location is hardcoded to New Jersey
**File:** `app/emergency/routing/page.tsx`, lines 123–128  
**Issue:** When geolocation fails, the code silently falls back to coordinates `40.2715, -74.6600` (Princeton, NJ) and still shows a hospital list with distance/ETA as though they are real. No permanent error state is shown to the user; `locationError` is set to `'Location unavailable — using demo area'` but this message only appears if `!hospital` is also null (line 166), which it won't be because the NJ fallback returns hospitals.  
**Why it matters:** A user in the UK or California who denies location permission is routed to a hospital 5,000 km away with fabricated turn-by-turn navigation and a plausible-looking ETA. They may spend critical minutes following wrong directions.  
**Fix:** When geolocation fails, show a persistent visible banner saying location is unavailable and display only the 911 call button. Do not show any hospital list or ETA derived from the fallback coordinates.

---

### 🔴 CRIT-3 — SOS navigation is blocked by 500 ms artificial delay
**File:** `app/emergency/page.tsx`, line 54  
**Issue:** `setTimeout(() => router.push(...)`, 500)` adds a deliberate half-second delay before routing to the emergency flow. During this time the UI shows the selected type highlighted but gives no clear indication to the user.  
**Why it matters:** In a cardiac event, 500 ms of perceived non-response after a tap causes users to tap again, triggering duplicate emergency records. The code at lines 41–44 resolves previous emergencies, but the double-tap confusion wastes time.  
**Fix:** Remove the `setTimeout`. Immediately navigate and let the routing page show its own loading state. Disable all other buttons on first tap, not after 500 ms.

---

### 🔴 CRIT-4 — "I'm safe" / cancel button is visually equal to "Call 911"
**File:** `app/emergency/routing/page.tsx`, lines 281–292  
**Issue:** The "Call 911" and "I'm safe" (cancel) buttons are rendered in a `grid` side-by-side with equal visual weight and similar sizing. During a high-stress emergency a patient or a bystander helping them could easily hit "I'm safe" instead of "Call 911" and cancel the emergency alert.  
**Why it matters:** Cancelling an emergency in error removes the active emergency record and ends care team visibility. Getting back to the SOS flow requires navigating back to the dashboard.  
**Fix:** "Call 911" should be the dominant, full-width button. "I'm safe / Cancel" should be a secondary text link below it, clearly differentiated in size and color.

---

### 🔴 CRIT-5 — No call-to-action to actually call 911 on the symptom-selection screen
**File:** `app/emergency/page.tsx`  
**Issue:** The emergency type selection screen has a red banner, animated dot, and 7 symptom cards. There is no "Call 911" button anywhere on this screen. The user must complete a 2-step flow (select symptom → wait 500 ms → reach routing page) before they can call emergency services.  
**Why it matters:** For a true cardiac emergency (chest pain, unconscious, can't breathe, stroke), every second matters. A user who accidentally opened the emergency flow and found this screen, or a bystander helping someone collapsed, cannot immediately call 911.  
**Fix:** Add a persistent "Call 911" button at the top of the symptom-selection screen, above the type grid.

---

### 🟠 HIGH-6 — Navigation component uses `watchPosition` but steps are derived from a stale closure
**File:** `components/Navigation.tsx`, lines 164–199  
**Issue:** `navigator.geolocation.watchPosition` callback closes over `steps` and `currentStep` from the outer `useEffect` dependency array (which lists `[steps, currentStep]`). Each time `steps` changes, a new watcher is started and the old one is not cleared mid-closure — the return cleanup is registered for the initial effect run's `watchId`, not subsequent ones. This causes multiple GPS watchers to run simultaneously after the first route fetch.  
**Why it matters:** Multiple GPS watchers drain battery rapidly. On a phone in a moving ambulance this can cause the app to freeze or the screen to lock due to power-saving mode.  
**Fix:** Move the `watchPosition` call into its own `useEffect` with an empty dependency array and call it only once. Advance step via a `ref` rather than state to avoid re-registering the watcher on every step change.

---

### 🟠 HIGH-7 — OSRM (open-source routing) times out or fails silently; no retry mechanism
**File:** `components/Navigation.tsx`, lines 106–137  
**Issue:** The route is fetched from `router.project-osrm.org`, a public demo server with no SLA. On failure, `setError('Could not load route')` is set and `setLoading(false)` is called, but the error message is only shown in the loading bar, not as a persistent user-visible error. There is no retry button.  
**Why it matters:** If OSRM is down or rate-limits the request (common with the public endpoint), the map renders without a route and the user's only visual cue is a small greyed-out text where the instruction bar would be. In an emergency the user has no navigation.  
**Fix:** Show a full error state with a prominent retry button and a fallback link to open Apple/Google Maps with the hospital address.

---

### 🟠 HIGH-8 — Emergency routing page is accessible to unauthenticated users
**File:** `app/emergency/routing/page.tsx`, line 87–91  
**Issue:** The routing page calls `supabase.auth.getUser()` but does not redirect if `!user`. Profile is set to null and the app continues to show the emergency UI without a user session. The `emergencyId` comes from query params and is never validated.  
**Why it matters:** A care team member or anyone with a direct URL can view the routing page. More importantly, a patient whose session has expired mid-emergency loses all data (profile name, emergency type logging) but does not know their session expired.  
**Fix:** If `!user`, show a prominent "Session expired — please sign in again" message with a sign-in button, not a silent empty experience.

---

### 🟡 MED-9 — "Relay Arc is scanning nearby hospitals in real time" is false
**File:** `app/emergency/page.tsx`, lines 150–153  
**Issue:** This status bar appears on the symptom-selection page before any geolocation request has been made. No hospital scanning is happening at this point.  
**Why it matters:** In a trust-critical medical app, false status copy erodes credibility. If a user notices hospitals are not being scanned until they tap, they will distrust other status messages including the "Care team alerted" confirmation.  
**Fix:** Remove this line, or replace it with neutral copy like "Select the closest description to continue."

---

### 🟡 MED-10 — Arrived state has no action and no dismiss mechanism
**File:** `components/Navigation.tsx`, lines 204–221  
**Issue:** When the user is within 50 m of the hospital, the map area shows "You have arrived — the ER team is ready for you" as a black screen. There is no button, no way to get back to the routing bottom sheet, and no call-to-action.  
**Why it matters:** At arrival a patient is being helped out of a vehicle. They or a bystander may need to quickly show the phone to hospital staff to communicate the emergency type, care team alert status, or medication list. The arrived screen gives no affordance for this.  
**Fix:** Add a "Show emergency details" button on the arrived screen that scrolls to the routing bottom sheet info.

---

## 2. Dashboard (`/dashboard`)

### 🟠 HIGH-11 — "Care team" button fires a `toast` instead of navigating anywhere
**File:** `app/dashboard/page.tsx`, line 473  
**Issue:** The Care team card has `onClick={() => toast('Coming soon...')}` and is rendered at 70% opacity with a "SOON" badge. It is a full interactive card in the center of the dashboard.  
**Why it matters:** This is a cardiac emergency app. Users who need to contact their care team will instinctively reach for this card. Getting a toast saying "coming soon" when they need help is a critical trust failure. It also contradicts the `/appointments` page which is fully functional.  
**Fix:** Either remove the card entirely (the BottomNav already has "Care" as a tab) or make it navigate to `/appointments`. Do not show a non-functional tappable element in a medical emergency app.

---

### 🟠 HIGH-12 — Active emergency redirect may re-trigger on stale data for 15 minutes
**File:** `app/dashboard/page.tsx`, lines 119–136  
**Issue:** On dashboard load, any `emergencies` row with `status='active'` created within the last 15 minutes automatically redirects to `/emergency/routing`. There is no way for a user who has already resolved their emergency via the "I'm safe" flow to prevent this redirect if the Supabase update (line 150 in `routing/page.tsx`) fails silently.  
**Why it matters:** A user who safely resolves an emergency but whose `cancelEmergency()` call failed (network timeout) will be trapped in a redirect loop for up to 15 minutes, unable to use any other part of the app.  
**Fix:** After the redirect to routing, always show the cancel/safe confirmation UI first so the user can re-confirm and force-resolve. Add error handling to `cancelEmergency()` with a toast on failure.

---

### 🟡 MED-13 — Recovery progress hardcodes a 12-week linear model for all conditions
**File:** `app/dashboard/page.tsx`, lines 183–184  
**Issue:** `recoveryPct = Math.min((weeksSinceSurgery / 12) * 100, 100)`. This means a POTS patient who had no surgery shows 0% and capped at 100% after 12 weeks regardless of outcome.  
**Why it matters:** Showing a wrong progress percentage to a cardiac patient managing a chronic condition (ME/CFS, POTS) is medically misleading. A patient 15 weeks post-op seeing "100% recovery" may reduce precautions prematurely.  
**Fix:** Either remove the progress arc for non-surgery conditions, or frame it as "weeks tracked" rather than "% recovered." The Timeline AI already generates condition-specific phases — pull progress from there.

---

### 🟡 MED-14 — Check-in status "Done" persists until midnight using `toDateString()`
**File:** `app/dashboard/page.tsx`, line 183  
**Issue:** `checkinToday` uses `new Date(checkins[0].created_at).toDateString() === new Date().toDateString()`. This is a client-side date string comparison using local time, while `created_at` is a UTC ISO string from Supabase. For users west of UTC (USA, South America) a check-in done after 8 PM EST on day N will be stored as day N+1 UTC and will incorrectly show as "done" the following day.  
**Fix:** Normalize both dates to the same timezone before comparison, or use date-only comparison in UTC consistently. Consider using `startOfDay` in the user's local timezone.

---

### 🟢 LOW-15 — Dashboard greeting shows only first name but the first-name split uses index 0
**File:** `app/dashboard/page.tsx`, line 233  
**Issue:** `profile?.full_name?.split(' ')[0]` crashes gracefully to `undefined` if `full_name` is null, but renders nothing at all (no fallback). Similarly the avatar initial on line 249 (`profile?.full_name?.[0]`) is undefined for users who bypass onboarding.  
**Fix:** Add a fallback: `profile?.full_name?.split(' ')[0] || 'there'` and `profile?.full_name?.[0] || '?'`.

---

## 3. Onboarding (`/onboarding`)

### 🟠 HIGH-16 — Step 2 → Step 3 can proceed with zero conditions selected
**File:** `app/onboarding/page.tsx`, lines 210–215  
**Issue:** The "Continue" button from Step 2 (conditions selection) calls `setStep(3)` with no validation. The `handleSubmit` on Step 3 checks `form.diagnosis.length === 0` (line 60), but the user can advance to Step 3 freely and then hit Submit to get an error. Worse, Step 2 also contains `surgery_date` and `allergies` inputs — these are mixed with condition selection but have no label.  
**Why it matters:** A user who clicks Continue without realizing they must select a condition advances to Step 3, fills in contacts and medications, then gets a toast error on Submit and must go back to Step 2. For an elderly or anxious cardiac patient this flow failure causes significant frustration.  
**Fix:** Validate `form.diagnosis.length > 0` on the Step 2 Continue button, same as Step 1 validates full_name.

---

### 🟠 HIGH-17 — Date of birth and surgery date use plain text inputs with YYYY-MM-DD placeholder
**File:** `app/onboarding/page.tsx`, lines 141, 203  
**Issue:** Both date fields are `<input type="text">` with `placeholder="Date of birth (YYYY-MM-DD)"`. Mobile keyboards show the alphanumeric keyboard, not a date picker. The date format (ISO) is uncommon for US users who expect MM/DD/YYYY.  
**Why it matters:** Incorrect date format entry (e.g., "12/25/1965" instead of "1965-12-25") is stored as-is and causes the Timeline AI to receive a garbage `surgery_date`. The dashboard's `weeksSinceSurgery` calculation (`new Date(profile.surgery_date)`) will return `NaN` for non-ISO strings, silently breaking the recovery tracker.  
**Fix:** Use `<input type="date">` which provides a native date picker on mobile. If a custom picker is required for design reasons, use a controlled component with format enforcement and visible error feedback.

---

### 🟠 HIGH-18 — Emergency contacts have no validation and phone number is a text field
**File:** `app/onboarding/page.tsx`, lines 238–253  
**Issue:** The emergency contact phone field is `<input type="text" placeholder="Phone">`. There is zero validation — a user can enter "mom" and submit successfully. The stored contact phone number is then presumably used to call or text an emergency contact during an SOS, but no dialing mechanism for contacts is visible in the codebase.  
**Why it matters:** A blank or malformed emergency contact phone number means no one will be alerted when the SOS is triggered. The entire value proposition of the app breaks down.  
**Fix:** Use `<input type="tel">` for phone fields. Add client-side regex validation (at minimum check for digits). Make at least one valid emergency contact required before submission.

---

### 🟡 MED-19 — Onboarding allows submission with a blank medication added (empty name + dose)
**File:** `app/onboarding/page.tsx`, line 260, and `handleSubmit` line 68  
**Issue:** The medications array is initialized with one empty medication `{ name: '', dose: '', frequency: '', times: ['Morning'] }` (line 31). If the user submits without touching the medication section, this empty object is saved to the `profiles.medications` JSONB column. The medications page then renders an unnamed pill card.  
**Fix:** Filter out empty medications before submission: `medications: form.medications.filter(m => m.name.trim())`.

---

### 🟡 MED-20 — Step 3 header says "Who to alert in an emergency" but the step also contains medications
**File:** `app/onboarding/page.tsx`, line 231  
**Issue:** The sub-heading under "Contacts & meds" is "Who to alert in an emergency", which only describes the contacts section. Medications are a separate concern mixed in the same step.  
**Fix:** Change the sub-heading to "Emergency contacts and your current medications" or consider splitting into 4 steps if the form is long enough to cause scroll fatigue.

---

### 🟡 MED-21 — No "Skip" option for optional onboarding fields
**File:** `app/onboarding/page.tsx`  
**Issue:** Fields like cardiologist, surgery date, allergies, medications, and emergency contacts are all optional by behavior but presented without any "skip" affordance. Users with no surgery date, no specialist yet, or no medications to enter must navigate blank fields with no guidance.  
**Fix:** Add `(optional)` labels to non-required fields. Consider a "Skip for now" link below the Continue button on steps 2 and 3.

---

### 🟢 LOW-22 — Onboarding has no back-navigation from Step 1
**File:** `app/onboarding/page.tsx`, step 1 section  
**Issue:** Step 1 has no back button. Steps 2 and 3 have back buttons. If a new user tapped through from the landing page and wants to return to login, they must use the browser back gesture — which works on most phones but may not be obvious.  
**Fix:** Add a back/close button to Step 1 that navigates to `/login`.

---

## 4. Check-in (`/checkin`)

### 🟠 HIGH-23 — Groq API key is exposed in the browser bundle
**File:** `app/checkin/page.tsx`, line 12 and `app/timeline/page.tsx`, line 11  
**Issue:** Both files instantiate Groq with `process.env.NEXT_PUBLIC_GROQ_API_KEY` and `dangerouslyAllowBrowser: true`. The `NEXT_PUBLIC_` prefix means the key is embedded in the public JavaScript bundle and visible to anyone who opens DevTools. The `dangerouslyAllowBrowser: true` flag explicitly acknowledges this risk but proceeds anyway.  
**Why it matters:** Anyone can use the API key to run unlimited Groq queries at the app's expense. More critically for a medical app, this pattern prevents rate-limiting and could allow prompt injection attacks via the check-in conversation.  
**Fix:** Move all Groq calls to a Next.js API route (`/api/checkin`, `/api/timeline`). The API key stays server-side, never shipped to the browser. Health conversation data also remains server-side rather than flowing through the user's browser.

---

### 🟠 HIGH-24 — Check-in has no error handling if Groq API call fails
**File:** `app/checkin/page.tsx`, lines 58–90  
**Issue:** The `sendMessage()` function makes two sequential Groq calls (lines 58–89). There is no `try/catch` around either call. If the network fails, the API rate-limits, or Groq is down, the function throws an unhandled promise rejection, the loading spinner never resolves, and the input is permanently disabled because `loading` never returns to `false`.  
**Why it matters:** A patient in recovery who encounters this bug sees a frozen chat interface and may believe the app is processing their symptoms. They cannot back out of the loading state.  
**Fix:** Wrap both Groq calls in try/catch. On error, set `loading(false)`, show a toast with a retry option, and re-enable the input.

---

### 🟡 MED-25 — AI check-in can complete after only 4 exchanges even with urgent symptoms
**File:** `app/checkin/page.tsx`, lines 48–56  
**Issue:** The system prompt instructs the AI to end with `[CHECKIN_COMPLETE]` after "4–5 exchanges". If the user reports serious symptoms in the first message (e.g., "I've been having chest tightness all morning"), the AI is supposed to say "tap the SOS button right now", but the check-in then also ends in 4 exchanges, saving a `flags: 'none'` record to the database (line 84) regardless of symptom severity.  
**Why it matters:** A clinical summary flagged as `'none'` when the user described chest pain will not prompt a care team member to act urgently. The flags field is hardcoded to `'none'` — it is never set based on actual content.  
**Fix:** Extract symptom keywords from the conversation before saving. Set `flags` to `'urgent'` if any emergency keyword is detected. The care team dashboard should sort and highlight flagged check-ins.

---

### 🟡 MED-26 — Quick replies only appear after the first AI message and disappear after one use
**File:** `app/checkin/page.tsx`, lines 213–228  
**Issue:** Quick replies are shown only when `messages.length === 1`. After the user sends their first message, quick replies are permanently hidden. Subsequent exchanges that might benefit from quick replies ("Yes", "No", "Same as yesterday") have no affordance.  
**Fix:** Show contextual quick replies after each AI message, not just the first. The AI could include reply suggestions, or a static set of context-appropriate options can be shown.

---

### 🟢 LOW-27 — Check-in does not prevent duplicate same-day check-ins
**File:** `app/checkin/page.tsx`  
**Issue:** There is no guard preventing a user from doing a second check-in on the same day. The dashboard shows `checkinToday` = true after the first, but the check-in page itself doesn't warn that today's check-in is already done.  
**Fix:** On page load, check if a check-in exists for today. If yes, show it with an option to "Start a new check-in" rather than immediately starting a new conversation.

---

## 5. Medications (`/medications`)

### 🟠 HIGH-28 — "Taken" state is not persisted across page reloads
**File:** `app/medications/page.tsx`, lines 29, 56–70  
**Issue:** The `taken` state is local React state initialized as `{}`. When the user taps "Take" for a dose, it logs to `medication_logs` (line 63), but the `taken` map is never re-populated from the database on page load. Navigating away and back resets all checkboxes to untaken.  
**Why it matters:** A patient who taps "Take" for their morning dose, navigates to check-in, and returns to medications sees the morning dose as untaken again. They may take the medication a second time.  
**Fix:** On page load, fetch today's `medication_logs` for the user and pre-populate the `taken` map using `medication_name` + time as the key.

---

### 🟠 HIGH-29 — "Remove medication" has no confirmation dialog
**File:** `app/medications/page.tsx`, lines 86–91 and line 341  
**Issue:** The red X button on each medication card directly calls `removeMedication(index)` which updates the database. The remove-time X button (line 397) also immediately removes with no confirmation. There is no undo mechanism.  
**Why it matters:** A twitchy tap or an accidental touch near the dose time row deletes a medication permanently. For a cardiac patient on anticoagulants, ACE inhibitors, or beta-blockers, inadvertently deleting a medication and not noticing means missed doses and no reminders.  
**Fix:** Show a confirmation sheet before removing a medication (similar to the cancel emergency confirmation pattern already used in the routing page). At minimum, use an undo toast for 5 seconds after removal.

---

### 🟡 MED-30 — Medication dose tracking resets at midnight by index, not by date
**File:** `app/medications/page.tsx`  
**Issue:** The `taken` key is `"${medIndex}-${timeIndex}"` — a positional key with no date component. This means if the user leaves the app open from 11:30 PM and checks back after midnight, they see yesterday's checkmarks, not a fresh slate.  
**Fix:** Include a date component in the key: `` `${new Date().toDateString()}-${medIndex}-${timeIndex}` ``. Or fetch today's logs on load and re-derive `taken` from the database.

---

### 🟡 MED-31 — Adding a time to an existing medication that already has that time silently does nothing
**File:** `app/medications/page.tsx`, lines 93–101  
**Issue:** `addTime()` checks `if (!updated[medIndex].times.includes(time))` and skips if duplicate, then calls `setAddingTime(null)`. The time picker panel closes without any feedback to the user about why nothing was added.  
**Fix:** Show a `toast.info('That time is already added')` when the time is a duplicate.

---

### 🟢 LOW-32 — Dose time "Remove" button (X icon at 12px) is dangerously small
**File:** `app/medications/page.tsx`, line 397–400  
**Issue:** The remove-time button uses `<X size={12}/>` inside a button with only `padding: '4px'`, making the tap target approximately 20×20 px — well below Apple's 44×44 pt and Google's 48×48 dp minimum touch target guidelines.  
**Fix:** Increase the button padding to at least `padding: '10px'` or wrap it in a larger invisible touch area.

---

## 6. Appointments (`/appointments`)

### 🟠 HIGH-33 — Appointment requests default to `meeting_room_id` set at request time, not confirmation time
**File:** `app/appointments/page.tsx`, lines 248–265  
**Issue:** A `meeting_room_id` UUID is generated when the patient submits an appointment request (line 248), before any care team member has confirmed. The UUID is generated using a non-standard inline UUID pattern: `` ([1e7] as any + (-1e3) + (-4e3) + (-8e3) + (-1e11)).replace(...) `` — this is a v4-like UUID generated with `Math.random()`, which is not cryptographically secure.  
**Why it matters:** Anyone who knows (or guesses) the room ID can join the Jitsi call. Since the room is created at request time, there is a long window before the appointment. The same pattern is used in `MeetingAlert.tsx` for rescheduling.  
**Fix:** Generate the `meeting_room_id` on the server (an API route) using `crypto.randomUUID()` when the care team confirms, not when the patient requests. Never expose the room ID client-side until the appointment is confirmed.

---

### 🟠 HIGH-34 — Page header says "Care Team" but the route is `/appointments`
**File:** `app/appointments/page.tsx`, line 337  
**Issue:** The `<h1>` reads "Care Team" (line 337) and the sub-heading says "Talk to a professional." But the BottomNav labels this tab "Care" and the page functionality is appointment scheduling. The "Care Team" dashboard the BottomNav implies lives at a different route (`/care-team`).  
**Why it matters:** Users looking for "their care team contacts" will land here and be confused — they can only schedule a video call, not send a message or see who their care team members are.  
**Fix:** Change the heading to "Appointments" or "Schedule a call". Clarify the sub-heading: "Schedule a video call with your care team."

---

### 🟡 MED-35 — `processAndMarkMissed` fires a Supabase update without awaiting it
**File:** `app/appointments/page.tsx`, lines 28–37  
**Issue:** The `processAndMarkMissed()` function calls `supabase.from('appointments').update(...).in('id', missedIds)` without `await` (line 34). The function is synchronous and returns the modified array immediately. The database update is fire-and-forget. If it fails, the patient's appointments page shows "missed" locally but the database still shows "confirmed", causing the care team dashboard to show a different state.  
**Fix:** Make `processAndMarkMissed` async and await the Supabase update, or handle the update within the existing async `load()` function.

---

### 🟡 MED-36 — The appointment join window is ±10 min before / 60 min after — undisclosed to the user
**File:** `app/appointments/page.tsx`, line 242  
**Issue:** `isJoinable()` returns true from 10 min before to 60 min after the scheduled time. This logic is invisible to the user. A user who sees an appointment with "Join video call" might tap it and be confused if they're 2 hours early (outside the window, button not shown) or wonder why the button disappeared exactly 60 min post-appointment.  
**Fix:** Show the join window to the user: "Join available 10 min before until 1 hour after your scheduled time."

---

### 🟢 LOW-37 — Time scroll picker has no snap feedback on slower devices
**File:** `app/appointments/page.tsx`, lines 50–93  
**Issue:** The `TimeScrollPicker` uses `scroll-snap-type: y mandatory` and updates `onChange` on every scroll event. On older devices or Chrome on Android, the scroll snap may not settle between scroll events, causing multiple onChange calls in rapid succession. There is no debounce.  
**Fix:** Debounce `handleScroll` or use the `scrollend` event (when available) to only fire `onChange` once the user stops scrolling.

---

## 7. Recovery Timeline (`/timeline`)

### 🟠 HIGH-38 — Groq API key exposed and no error handling on timeline generation
**File:** `app/timeline/page.tsx`, lines 11, 44–56  
**Issue:** Same API key exposure as CK-23. Additionally, if the Groq response is not valid JSON (which is common with LLMs even at `temperature: 0.3`), `JSON.parse()` on line 51 throws an unhandled exception and the `catch (e)` block on line 55 only `console.error`s — no user-visible feedback. The `generating` spinner stops, and the empty-state "Could not generate timeline" message appears.  
**Why it matters:** If the AI generates a partial JSON response, the user gets a blank page with a generic error and a retry button. This is the entire value-add of the timeline feature.  
**Fix:** Move Groq to an API route. Add robust JSON extraction (use a regex to find the first `[...]` block, not just strip code fences). Show a descriptive error message on failure.

---

### 🟡 MED-39 — Timeline re-generates from scratch on every page visit
**File:** `app/timeline/page.tsx`, line 29  
**Issue:** `generateTimeline(data)` is called inside the `useEffect` on every component mount. The generated timeline is not cached in the database or localStorage. Every visit to `/timeline` triggers a Groq API call.  
**Why it matters:** This wastes API quota, adds 2–5 seconds of loading on every visit, and returns slightly different timeline content each time (even at 0.3 temperature), which is confusing for a medical recovery document.  
**Fix:** Cache the generated timeline in the `profiles` table (a `recovery_timeline` JSONB column). Regenerate only when the "Refresh" button is explicitly tapped, or when key profile fields (surgery_date, diagnosis) change.

---

### 🟡 MED-40 — Timeline uses patient's full name in the Groq prompt including PHI
**File:** `app/timeline/page.tsx`, lines 39–42  
**Issue:** The prompt sent to Groq includes `p?.full_name`, `p?.diagnosis`, `p?.medications`, and `p?.surgery_date` — all protected health information — sent directly to a third-party LLM. The Privacy Policy (line 34 of `LegalModal.tsx`) discloses Groq processing but notes "We do not control how third-party AI providers handle data once transmitted."  
**Why it matters:** The full name is not needed for a personalized timeline — the AI only needs condition/surgery data. Including it unnecessarily expands PHI exposure.  
**Fix:** Omit `full_name` from the Groq prompt. Personalize the display with the name in the UI without sending it to the AI.

---

## 8. Care Team Login (`/care-team/login`)

### 🔴 CRIT-41 — Care team access code is hardcoded in source and displayed in plaintext on the page
**File:** `app/care-team/login/page.tsx`, lines 9 and 111  
**Issue:** `const CARE_TEAM_CODE = 'relay-care-2026'` is a hardcoded constant in the JavaScript bundle. Worse, line 111 renders it directly on screen: `Access code: relay-care-2026` (in light grey text that may not be visible but is in the DOM and readable by inspect).  
**Why it matters:** Anyone who opens DevTools or views the page source can find the access code. Anyone can create a care team account and access patient data including emergency alerts, check-in summaries, medications, and video calls.  
**Fix:** Remove the on-screen display immediately. Move the access code to a server-side check (API route). Better: implement invite-only care team onboarding where a unique token is emailed to verified healthcare providers.

---

### 🟡 MED-42 — Care team login uses same Supabase auth as patients; no role separation
**File:** `app/care-team/login/page.tsx`, lines 25–43  
**Issue:** `supabase.auth.signUp({ email, password })` creates a standard Supabase auth user, identical to patient accounts. The only distinction is a row in `care_team_members`. A care team user who navigates to `/dashboard` is treated as a patient and may see onboarding.  
**Fix:** Implement Row Level Security (RLS) policies in Supabase to separate patient and care team access. Add a `role` field to the auth user metadata on creation and verify it server-side before granting care team access.

---

## 9. Navigation & Bottom Nav

### 🟡 MED-43 — BottomNav is hidden on `/emergency` but the emergency type selection page still shows it briefly
**File:** `components/BottomNav.tsx`, line 19  
**Issue:** `hideOn` includes `'/emergency'` so `pathname.startsWith('/emergency')` correctly hides the nav on `/emergency/routing`. However the type selection page at `/emergency` also passes this check, so the BottomNav does not show — which is correct. BUT if the route transitions from `/emergency` to `/emergency/routing`, there is a brief moment where the BottomNav could flash before the route fully updates.  
**Note:** This is a minor cosmetic issue, but on the emergency routing page any stray navigation element is a distraction.  
**Fix:** Accept the current implementation as-is but verify that SSR/hydration does not briefly render the BottomNav before the client-side `usePathname` resolves.

---

### 🟡 MED-44 — BottomNav has no emergency/SOS shortcut
**File:** `components/BottomNav.tsx`  
**Issue:** The bottom nav has 5 tabs: Home, Check-in, Meds, Timeline, Care. None of them is "Emergency." The SOS button is only accessible from the dashboard home. If a user is on the Medications page and has an emergency, they must navigate to Home first, then tap SOS.  
**Why it matters:** In a cardiac event, navigating 2 taps to reach SOS is too slow. Any extra step has consequences.  
**Fix:** Add a persistent floating SOS button or a dedicated SOS tab in the BottomNav (perhaps replacing the Timeline tab, which is low-urgency). Alternatively, position a small SOS chip in the top-right corner of every page.

---

### 🟡 MED-45 — BottomNav active state uses exact path match; child routes appear inactive
**File:** `components/BottomNav.tsx`, line 43  
**Issue:** `const active = pathname === tab.href` uses strict equality. Navigating to `/medications/some-sub-page` (if it existed) or `/checkin` sub-flows would not highlight the corresponding tab.  
**Fix:** Use `pathname.startsWith(tab.href)` for all tabs except `/dashboard` (which should stay exact to avoid matching everything).

---

## 10. MeetingAlert Component

### 🟡 MED-46 — MeetingAlert mounts globally but polls Supabase every 30 seconds on every page
**File:** `components/MeetingAlert.tsx`, lines 178–283  
**Issue:** The `MeetingAlert` component runs a `setInterval(check, 30000)` that queries `appointments`, `patient_notes`, and checks notification state every 30 seconds. It also loops through `profile.medications` to check if any dose time is within 5 minutes. This runs on every page except care-team routes, login, and onboarding.  
**Why it matters:** On a low-end Android phone with a weak cellular connection, 3 Supabase queries every 30 seconds on top of the current page's own queries will cause significant battery drain and may hit Supabase rate limits.  
**Fix:** Replace polling with Supabase Realtime subscriptions for appointments. Use a single subscription to the `appointments` table filtered by `patient_id`. Schedule medication notifications server-side (e.g., via a cron edge function) rather than polling client-side every 30 seconds.

---

### 🟡 MED-47 — MeetingAlert reschedule creates a new appointment but does not notify the care team
**File:** `components/MeetingAlert.tsx`, lines 293–319  
**Issue:** `handleReschedule()` cancels the old appointment and inserts a new one with `status: 'pending'`. There is no push notification or other mechanism to alert the care team that the patient rescheduled. The care team's dashboard will just see a cancelled appointment and a new pending one with no link between them.  
**Fix:** Include a note in `patient_concern` such as "Rescheduled from [original time]" or add a `rescheduled_from_id` foreign key column so care team members know this is a reschedule rather than a new request.

---

## 11. Legal Modal (`LegalModal.tsx`)

### 🟠 HIGH-48 — Legal consent is bypassed if localStorage is unavailable
**File:** `components/LegalModal.tsx`, lines 143–145  
**Issue:** The modal skips showing if `localStorage.getItem(STORAGE_KEY)` returns a value. If `localStorage` throws (private browsing mode in some browsers, storage quota exceeded, iOS Safari restriction), the `catch` block on line 144 calls `setStep(1)` — which actually shows the modal. This part is correct. But if a user clears localStorage or switches browsers, they will see the legal modal again on every session, which may cause consent fatigue and "accept without reading" behavior.  
**Why it matters:** In a medical app, evidence of informed consent should be stored server-side (in the user's database record) with a timestamp, not only in localStorage which can be cleared by the browser.  
**Fix:** Save consent with timestamp to the `profiles` table on acceptance. Check the database first; use localStorage only as a secondary cache.

---

### 🟡 MED-49 — Privacy Policy discloses that Relay Arc is not HIPAA-compliant in fine print at 11px
**File:** `components/LegalModal.tsx`, line 52 (Privacy Policy content)  
**Issue:** Section 8 of the Privacy Policy ("NOT A COVERED ENTITY") states the platform "does not carry HIPAA compliance guarantees." This is a major disclosure that directly affects the medical trust relationship. It is buried in a long scrollable text block at `font-size: 11px`.  
**Why it matters:** Cardiac patients sharing diagnoses, medications, and symptom history deserve to clearly understand that this data may not be protected under HIPAA. Burying this in small print in a scroll-to-accept modal is ethically problematic and may have legal consequences.  
**Fix:** Surface this disclosure prominently on the sign-up page and the first screen of the legal modal, not only in the body text.

---

### 🟡 MED-50 — Terms of Service liability cap is "$0" — disclosed in the same 11px scroll
**File:** `components/LegalModal.tsx`, line 101 (Terms content)  
**Issue:** Section 8 caps liability at "the greater of (A) the amount you paid... or (B) USD $0." For a free app used for cardiac emergencies, this effectively means zero liability for any harm including "loss of life" (explicitly listed). This is an extreme liability waiver that deserves prominent disclosure.  
**Fix:** Same as MED-49 — surface the key terms (not HIPAA, not a medical device, $0 liability) on the account creation page, not only in a scroll-to-accept modal.

---

## 12. Accessibility

### 🔴 CRIT-51 — Virtually all interactive elements lack accessible names
**Issue:** Across all pages, buttons use icon-only or visual-only content with no `aria-label`. Examples:  
- The X (close) button in the emergency header: `<X size={15}>` inside a `<motion.button>` with no label  
- The + (add medication) button in `medications/page.tsx` line 152  
- All BottomNav tabs (they have a visible text label but it is inside a `<span>` — this may be adequate, but the button itself has no `aria-label`)  
- SOS button (`dashboard/page.tsx` line 308): has visual "SOS" text, but screen readers would read "Emergency routing SOS" from the two nested paragraphs — which is acceptable

**Why it matters:** Cardiac patients may have motor or vision impairments. Emergency-related buttons that screen readers cannot identify are a safety issue, not just an accessibility issue.  
**Fix:** Add `aria-label` to all icon-only buttons. Example: `<motion.button aria-label="Close emergency type selection">`.

---

### 🟠 HIGH-52 — Color is the only indicator of state in multiple critical components
**Issue:**  
- Medication "taken" state: the check circle turns green but the dose row also drops to 55% opacity. Users with low vision or color blindness lose the "Done" label at 0.55 opacity.  
- Emergency routing: "Care team alerted" vs "Alerting..." is distinguished by border color (green vs grey) with no icon change other than a spinner/checkmark — the spinner is too small (16px) at arm's length.  
- Appointment status badges: "confirmed", "missed", "pending" use color text only with 9px font.  

**Fix:** Never rely on color alone. Ensure every state change is accompanied by both a color and a text/icon change. Increase appointment status badge font to at least 11px.

---

### 🟡 MED-53 — LegalModal cannot be dismissed on iOS Safari with Escape key
**File:** `components/LegalModal.tsx`  
**Issue:** The modal is `position: fixed, inset: 0, zIndex: 9999` with no `onKeyDown` handler for Escape. There is no close/dismiss button until the user reads and accepts. While this is intentional (forced acceptance), on iOS Safari the entire viewport is trapped behind the modal with no escape.  
**Fix:** This is intentional behavior but should be tested: ensure that iOS Safari's pull-down to dismiss gesture cannot dismiss the modal's bottom sheet (it can with `overflow: auto` containers on iOS). Add `overscroll-behavior: contain` to the scrollable content div.

---

## 13. Mobile-Specific Issues

### 🟠 HIGH-54 — Input fields in onboarding/medications are obscured by keyboard on iOS
**File:** `app/onboarding/page.tsx`, `app/medications/page.tsx`  
**Issue:** Pages use `min-height: 100dvh` with `padding: 48px 20px` at the top level. When the iOS keyboard appears, the viewport height shrinks but the outer container does not scroll to keep the focused input above the keyboard — `dvh` units adapt to the visual viewport but the layout may still push content behind the keyboard on older iOS.  
**Fix:** Test on iOS 15/16 Safari. Use `paddingBottom` that accounts for the keyboard inset via `env(safe-area-inset-bottom)`. Consider using the `visualViewport` API to scroll focused inputs into view.

---

### 🟡 MED-55 — SOS button uses `clipPath: polygon(...)` which can be hard to tap accurately
**File:** `app/dashboard/page.tsx`, line 315  
**Issue:** The SOS button uses `clipPath: 'polygon(20px 0%, calc(100% - 20px) 0%, 100% 20px, ...)'` (a chamfered rectangle). CSS `clip-path` clips the visual but not the pointer event area — the full bounding box is still tappable. However, the visual shape cuts corners by 20 px, which could create perceived "dead zones" in the corners.  
**Fix:** The tap target is actually fine because pointer events use the bounding box. No change needed, but add a comment explaining this to prevent future "bug fixes" that add `pointer-events` clip logic.

---

### 🟡 MED-56 — BottomNav is 16px from screen edges but may overlap system gesture zones on Android
**File:** `components/BottomNav.tsx`, line 26  
**Issue:** The bottom nav is positioned `bottom: 16px` with no `padding-bottom: env(safe-area-inset-bottom)`. On Android phones with a gesture navigation bar (Pixel, Samsung with 3-button-less navigation), the nav may conflict with the system swipe-up gesture area.  
**Fix:** Add `paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))'` to the nav container and adjust `bottom` to `0` so the safe area inset is calculated from the screen edge.

---

## 14. Content & Copy Issues

### 🟡 MED-57 — "Relay Arc is scanning nearby hospitals in real time" (already noted as CRIT-9 in emergency) also appears during loading
**File:** `app/emergency/routing/page.tsx`, loading state lines 155–161  
**Issue:** During the loading state, the sub-text reads "Alerting care team..." — but as established in CRIT-1, no actual care team alert is sent. This copy re-states the same false confirmation in a different context.

---

### 🟡 MED-58 — The "Other" emergency type produces no useful routing context
**File:** `app/emergency/page.tsx`, line 26  
**Issue:** Selecting "Other" with description "Something else urgent" creates an emergency record with `emergency_type: 'other'`. The routing page shows "Emergency" as the label. The care team sees "other" with no detail. There is no follow-up prompt for the user to describe what is happening.  
**Fix:** After selecting "Other", show a single text input: "Briefly describe what's happening (e.g. 'severe back pain', 'allergic reaction')" before proceeding to routing.

---

### 🟢 LOW-59 — "POTS episode" and "ME/CFS severe crash" are not standard emergency descriptors
**File:** `app/emergency/page.tsx`, lines 23–26  
**Issue:** The emergency type selection screen includes condition-specific options (POTS episode, ME/CFS crash). These are valid conditions but they are chronic episode types, not acute life-threatening emergencies. Including them alongside "Unconscious" and "Can't breathe" may encourage patients with manageable flares to use the SOS flow unnecessarily.  
**Fix:** Add guidance below POTS/ME/CFS cards: "For severe episodes — use SOS only if you cannot care for yourself." Or separate them into "Acute emergency" vs "Episode support" categories.

---

### 🟢 LOW-60 — Appointments page shows "pending" as a status badge but never explains what it means
**File:** `app/appointments/page.tsx`, line 283  
**Issue:** A newly created appointment shows `status: 'pending'` in a monospace badge. There is no explanation that "pending" means "waiting for a care team member to confirm." Users may think the appointment was already scheduled.  
**Fix:** Replace the badge copy with "Awaiting confirmation" or add a tooltip/info text below the appointment card: "Your care team will confirm this time."

---

## 15. Missing Features

### 🔴 CRIT-61 — No mechanism to actually contact emergency contacts during an SOS
**Issue:** Emergency contacts are collected in onboarding (Step 3) and stored in `profiles.emergency_contacts`. There is no code anywhere that reads these contacts and calls, texts, or notifies them when an SOS is triggered. The `emergencies` table insert happens, but the contacts are never used.  
**Fix:** On `emergencies` insert, trigger a server-side edge function (Supabase Edge Function or Next.js API route) to send SMS via Twilio/AWS SNS to all emergency contacts with the user's name, emergency type, and the closest hospital name.

---

### 🟠 HIGH-62 — No "share location" mechanism during emergencies
**Issue:** Once an emergency is active, neither the patient nor emergency contacts receive a shareable location link. The care team can see the emergency record but not the patient's real-time GPS coordinates.  
**Fix:** Store the user's geolocation in the `emergencies` table on SOS. Update it via the `watchPosition` callback in `Navigation.tsx`. Expose a read-only link care team members can open to see the patient's live location.

---

### 🟠 HIGH-63 — No offline / service worker fallback for the emergency flow
**Issue:** The entire app is a Next.js SPA that requires network access for authentication, hospital lookups, and routing. The manifest/service worker is referenced (`icon-192.png` etc.) but there is no visible offline caching strategy in the codebase. In a cardiac emergency in a building with poor signal, the app may fail to load at all.  
**Fix:** Cache the emergency type selection page, the 911 call deeplink, and the user's profile (including emergency contacts) in the service worker so they are available offline. At minimum, "Call 911" should work without a network connection.

---

### 🟠 HIGH-64 — No medication interaction warnings or allergy cross-reference
**Issue:** The medications page stores drug names but has no logic to check for interactions between listed medications or flag medications against the allergies field collected during onboarding.  
**Why it matters:** A cardiac patient adding a new medication has no warning that it might interact with an existing drug.  
**Note:** This is a complex medical feature with liability implications (see Terms Section 2 — not medical advice). Consider at minimum linking to a drug interaction checker or prominently advising users to check with their pharmacist.

---

### 🟡 MED-65 — No push notification when care team confirms or declines an appointment
**Issue:** When a care team member updates `appointments.status` from `pending` to `confirmed` or `declined`, there is no notification sent to the patient. Patients must manually check the appointments page.  
**Fix:** Use a Supabase Realtime subscription on the `appointments` table or a database trigger to send a push notification via the existing `registerPushNotifications` infrastructure.

---

### 🟡 MED-66 — No way to update or correct profile information after onboarding
**Issue:** There is no settings page or profile edit screen. A user who changes their cardiologist, gets a new diagnosis, or updates their medications must use the `/medications` page for medication changes, but cannot update their name, DOB, phone, or cardiologist from within the app.  
**Fix:** Add a `/settings` or `/profile` page accessible from the dashboard header (e.g., tapping the avatar) with an edit form pre-populated from the profile.

---

### 🟡 MED-67 — Check-in history is not viewable by the patient
**Issue:** Check-in summaries are visible as a preview on the dashboard (last check-in only), but there is no page to view the full check-in history. The `checkins` table stores all records but they are only consumed by the care team dashboard.  
**Fix:** Add a check-in history view accessible from the "Last check-in" card on the dashboard, showing a chronological list of summaries.

---

*End of audit — 67 issues identified across 15 categories.*

# Relay Arc — Intended Use and Regulatory Position

**Status:** working position, not legal advice. Prepared to be handed to a
regulatory consultant and a healthcare attorney so their time is spent correcting
this rather than discovering what the product is.

**Governing guidance:** *Clinical Decision Support Software — Guidance for Industry
and Food and Drug Administration Staff*, FDA, **January 2026** (docket
FDA-2017-D-6569, content current as of 29 January 2026). This replaced the
September 2022 version. All criteria references below are to section 520(o)(1)(E)
of the FD&C Act as added by section 3060(a) of the 21st Century Cures Act.

---

## 1. Intended Use Statement

> **Relay Arc is a health information management and facility directory tool for
> people living with cardiac and autonomic conditions, and a clinician-facing
> deterioration surveillance aid for the care teams that support them.**
>
> For the person using it, Relay Arc stores and displays medical information they
> have entered themselves, produces a summary of that information for presentation
> to responders, lists nearby emergency facilities with their reported
> capabilities and current accepting status, and transmits the person's own
> summary to a receiving facility they have selected.
>
> For a clinician, Relay Arc displays patient-reported observations and computes
> the National Early Warning Score 2 (NEWS2) from those observations, itemised so
> that every point scored is attributable to a named measurement, to support a
> decision about whether to review a patient sooner.
>
> **Relay Arc does not diagnose. It does not determine whether a medical emergency
> is occurring. It does not summon emergency services and is not a substitute for
> doing so. It does not direct or replace clinical judgement. Users are instructed
> to contact emergency services first.**
>
> Relay Arc is not validated for patients under 16 years of age. NEWS2 is designed
> for adults; paediatric practice uses PEWS. The software flags this automatically
> when age is known.

Everything below exists to make that statement defensible, and every product
decision should be checked against it.

---

## 2. The two criteria that decide this, in FDA's own words

**On patient-facing software (Criterion 3):**

> "Software functions that support or provide recommendations to patients or
> caregivers – not HCPs – meet the definition of a device."

**On time-critical software (Criterion 4):**

> "FDA does not consider software functions intended for a critical,
> time-sensitive task or decision to meet Criterion 4, because an HCP is unlikely
> to have sufficient time to independently review the basis of the
> recommendations."

**The consequence for Relay Arc is uncomfortable and needs stating plainly.** The
emergency SOS flow is *both* patient-facing *and* time-critical. It is the single
hardest thing in this product to keep outside the device definition, and no amount
of wording fixes that if the software is making a clinical recommendation.

**But "device" does not mean "requires clearance."** The same guidance says FDA
"supports increased access to innovative, safe, and effective CDS for non-HCP
users" and intends to regulate it consistently with existing policies — explicitly
naming the *Policy for Device Software Functions and Mobile Medical Applications*
and *General Wellness: Policy for Low Risk Devices*. Both contain enforcement
discretion for low-risk functions. So the practical question is not only "is this
a device" but "is this a function FDA actively regulates."

---

## 3. Feature-by-feature position

| Feature | Audience | Position | Confidence |
| --- | --- | --- | --- |
| Medical ID storage and display | Patient | Records management. Squarely within the mobile medical app enforcement-discretion policy — it stores and displays information the user entered. | **High** |
| `/card` lock-screen and wallet card | Patient | Same. Formats user-entered information for presentation. Makes no assessment. | **High** |
| Facility directory with capability and accepting status | Patient | Informational listing. Comparable to a provider directory. Does not assess the patient. | **High** |
| Records transmission to a chosen facility | Patient → facility | Data transport. See §5 for the HIPAA consequences, which are the real issue here, not FDA. | **High** on device status |
| Turn-by-turn navigation | Family | Not a health function. | **High** |
| Daily check-in and vitals logging | Patient | Records management. | **High** |
| **NEWS2 score shown to a clinician** | **HCP** | **The strongest position in the product.** See §4. | **Moderate-high** |
| **NEWS2 score shown to the patient** | **Patient** | **Device.** A deterioration risk level presented to a patient is a recommendation to a non-HCP. Mitigation in §6. | **Low — needs change** |
| **Triage classifier inferring emergency type from speech** | **Patient** | **Weakest position in the product.** Patient-facing, time-critical, and derived from a self-trained model rather than an accepted source. See §6. | **Low — needs change** |
| Personal-baseline heuristic layer | Either | Not derived from an accepted source. Already labelled unvalidated everywhere it appears; keep it advisory and never sole-determinative. | **Low** |

---

## 4. Why the clinician-facing NEWS2 path is the strong one

This is the finding that should reshape the roadmap. The care-team surveillance
feature — treated until now as secondary to the emergency button — is the part
that can plausibly reach a defensible non-device position.

**Criterion 1 — inputs.** NEWS2 consumes discrete numeric observations that a
person entered. It does not acquire, process, or analyse a medical image, an
in-vitro diagnostic signal, or a pattern from a signal acquisition system. There
is no waveform analysis anywhere in the risk engine. **Met.**

**Criterion 2 — medical information from well-understood and accepted sources.**
FDA interprets this to include "peer-reviewed clinical studies, clinical practice
guidelines." NEWS2 is a Royal College of Physicians clinical practice guideline.
This is close to the paradigm case. **Met.**

**Criterion 3 — recommendation to an HCP.** Satisfied *only* for the nurse and
care-team surfaces. The recommendation is "consider reviewing this patient sooner,"
which enhances rather than replaces judgement. **Met for HCP surfaces only.**

**Criterion 4 — independent review.** This is where the engineering decisions
already made turn out to matter enormously:

- The score is **deterministic**. Same inputs, same output, every time. An HCP
  re-running it gets the same answer.
- Every point is **attributable to a named measurement** — "Pulse 18 bpm above
  your usual 60 bpm," not "elevated." The points sum to the aggregate and a test
  enforces that they do.
- The **thresholds are published** and transcribed from the guideline, pinned by
  boundary tests.
- The decision is **not time-critical**: it answers "review today?", not "act in
  the next sixty seconds."
- FDA asks for "a plain language description of the underlying algorithm
  development and validation." `docs/RISK_ENGINE.md` and `/engineering` already
  substantially provide this, including the parts that are uncertain.

**The LLM was removed from this scoring path for engineering reasons — because a
medical flag must be reproducible and must show its work. That decision happens to
be close to what Criterion 4 requires.** It is the most valuable asset in this
project and must not be reversed for convenience.

**Known gaps to close before relying on this position:**

1. The temperature band table was transcribed from sources that disagreed. It is
   flagged in code and docs. A clinician must confirm it.
2. NEWS2 is not validated under 16. The engine flags it; a policy decision is
   still owed — implement PEWS, or restrict the indicator to adults.
3. The personal-baseline layer is not from an accepted source. It is labelled
   unvalidated and cannot alone produce `high`. Keep both properties.
4. Labelling must state the intended HCP user and intended patient population
   explicitly on the surface itself, not only in documentation.

---

## 5. HIPAA, and why it is a bigger near-term issue than FDA

**Today, Relay Arc is probably not HIPAA-covered.** It is not a provider, plan, or
clearing house, and the data is entered by the individual themselves. Direct-to-
consumer health apps in this position fall under the **FTC Act section 5** and the
**FTC Health Breach Notification Rule**, which the FTC has actively enforced
against health apps.

**This changes the moment a hospital sends data back.** Receiving PHI from a
covered entity, or handling PHI on its behalf, makes Relay Arc a **business
associate**. That requires a signed BAA and triggers the full HIPAA Security Rule:
risk analysis, access control, audit logging, encryption at rest and in transit,
workforce training, and 60-day breach notification.

**The current one-directional design is therefore a feature, not a limitation.**
Patient-to-facility transmission of the patient's own record is a materially
lighter posture than bidirectional EHR integration. Any move to two-way sync
should be a deliberate, advised decision — not something that happens because a
FHIR endpoint was available.

**`/card` is the cleanest surface in the entire product** on this axis: no account,
no transmission, no server-side storage. It should stay that way.

---

## 6. Required product changes

Ordered by how much regulatory exposure each removes.

1. **Do not present a deterioration risk level to the patient.** Show the patient
   their own recorded observations and trends — that is records management. Route
   the computed score and its escalation banding to clinician surfaces. A patient
   may see that their care team was notified without being told a risk tier.
2. **Reframe the triage classifier as input assistance, not determination.** It
   should help a person select the category they were going to select anyway,
   faster, with the selection visible and always overridable. It must never assert
   what is happening to them. The existing abstention behaviour supports this
   framing well; the labelling does not yet.
3. **State the intended use on the surfaces themselves.** Clinician screens should
   name the intended user and patient population and link the algorithm
   description. Criterion 4 asks for labelling, not just docs.
4. **Keep every safety instruction where it is.** "Call emergency services first"
   is load-bearing for this entire position.

---

## 7. What to do, in order

| # | Action | Cost | Why now |
| --- | --- | --- | --- |
| 1 | Ship the §6 product changes | Days | Removes the worst exposure at the lowest cost |
| 2 | Get a named clinical advisor | Weeks | Closes the §4 gaps; prerequisite for everything else |
| 3 | Publish the FHIR export built against a public sandbox | Days | Credibility with hospital IT without touching PHI |
| 4 | Paid consult: FDA regulatory consultant + healthcare attorney | $ | Bring this document; pay them to correct it, not to discover it |
| 5 | Entity formation with an adult officer, plus tech E&O and cyber liability insurance | $$ | No liability limitation is possible without this. Insurance, not paperwork, is the gate hospital review actually checks |
| 6 | **FDA Q-Submission (Pre-Sub)** | Free | FDA charges no fee and does not cap the number of meetings; Digital Health Center of Excellence staff can join. A written FDA response on this product's device status is worth more than any pitch deck |
| 7 | SOC 2 Type II readiness | $$$ | Only once a hospital integration is actually in prospect |

**On sequencing money:** non-dilutive funding first — SBIR, foundations, state
programmes. It rewards precisely the evidence a regulator wants, and it creates no
pressure to monetise an emergency tool. Equity, if ever, after items 1–3 exist.

---

## 8. Honest limits of this document

I am not a lawyer or a regulatory professional, and this is a reading of a
nonbinding guidance document, not a determination. Two things in particular are
genuinely uncertain and should not be presented to anyone as settled:

- Whether the patient-facing facility-ranking function is "informational" or a
  clinical recommendation. A reasonable regulator could disagree with §3.
- Whether the enforcement-discretion policies FDA cross-references actually cover
  an emergency-context app, given that most examples in those policies concern
  lower-acuity wellness software.

**Nothing in this repository, on the website, or in any outreach material may
describe Relay Arc as FDA approved, FDA cleared, clinically validated, or
certified.** It is none of those things. The correct description is decision
support that does not diagnose and does not replace emergency services.

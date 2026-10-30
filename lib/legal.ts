// Single source of truth for legal copy, used by the consent modal
// (components/LegalModal.tsx) and the public /privacy and /terms pages.

export const LEGAL_LAST_UPDATED = 'September 2026'

const CONTACT = 'relay.arc.org@gmail.com'

export const PRIVACY_POLICY = `PRIVACY POLICY
Last updated: September 2026

1. THE SHORT VERSION
Relay Arc is free and is run as a nonprofit project. We do not sell your data, we do not share it with advertisers, and we do not use it to build advertising profiles. We collect the least we can get away with while still being useful in an emergency.

Two things are worth knowing before the detail:
• The emergency card at /rights and /card is made in your browser and stays there. It is not uploaded, there is no account, and closing the tab discards it.
• If you create an account, the medical details you enter are stored so they can be sent ahead to a hospital during an emergency. That is the whole point of the account, and it means real health information leaves your device.

2. WHO WE ARE
Relay Arc is operated by an individual maintainer as a nonprofit project. Contact for any privacy question, request or complaint: ${CONTACT}. We answer privacy requests within 30 days.

3. WHAT WE COLLECT, AND WHY
Information you type in:
• Name, email address and password. Needed to have an account at all.
• Date of birth. Used to pick the correct clinical thresholds, because some of them differ for ages 12 to 19.
• Medical conditions, medications, allergies and blood type. Sent ahead to a hospital during an emergency, and shown on the emergency card.
• Emergency contacts, including their name and phone number.
• Daily check-in answers, symptoms and vital signs you record.
• Your cardiologist or care team, if you add them.

Information collected automatically:
• Device type, browser and operating system.
• IP address, which reveals approximate location.
• Which features you used and when, so we can tell what is broken.

Location, treated separately because it is the most sensitive:
• Precise device location is read only when you start an emergency, and only to find hospitals near you and produce directions. It is not tracked in the background and it is not recorded when the app is idle.

4. LEGAL BASIS FOR PROCESSING
If you are in the UK, the EU or another region with similar law:
• Health data is a special category of personal data. We rely on your explicit consent, given when you accept this policy during signup and again when you enter medical details. You can withdraw consent at any time by deleting your account or by writing to us.
• For account security, fraud prevention and keeping the service running, we rely on our legitimate interests.
• Where the law requires us to keep something, we rely on our legal obligation.

Withdrawing consent does not undo processing that already happened, and it does not reach data a third party has already received. Section 6 explains that limit.

5. WHO ELSE RECEIVES YOUR DATA
We use other companies to run the service. Each of them has its own privacy policy and its own security practices, and we do not control what they do once data reaches them.
• Supabase. Database, accounts and authentication. Receives everything stored in your account.
• Vercel. Hosting and content delivery. Receives your IP address and request data.
• Groq. Large language model processing, currently openai/gpt-oss-20b. Receives the text of check-ins and symptom notes when a summary or classification is generated.
• Resend. Sends account email such as the signup confirmation. Receives your email address.
• Jitsi and 8x8. Video consultations, if you use one. Receives the call itself.
• OpenStreetMap Nominatim and OSRM. Address lookup and driving directions. Receives location during an emergency.
• MapLibre and map tile providers. Draws the map. Receives the area you are looking at.

We do not sell personal information, and we do not share it for cross-context behavioural advertising. If you are a California resident, that means there is nothing for you to opt out of on that front.

6. AUTOMATED PROCESSING AND ITS LIMITS
Some features send your text to Groq to produce a summary or a suggested category. Two limits are worth stating plainly:
• Output from a language model can be wrong. It is not a medical opinion and no clinical decision should rest on it.
• Once text has been sent to a third-party model provider we cannot retrieve or delete it. Do not type anything into a check-in that you would not want to leave your device.

The part of the app that decides how urgent something is does not use a language model. It is arithmetic on published thresholds, it runs on your phone, and it produces the same answer every time.

7. INTERNATIONAL TRANSFERS
Our providers operate servers outside your country, including in the United States. Where the law requires a safeguard for that transfer, we rely on the standard contractual terms those providers offer. If you would rather your data did not leave your region, do not create an account. The emergency card works without one.

8. STORAGE ON YOUR DEVICE
We use your browser storage rather than tracking cookies. Specifically:
• An authentication token, so you stay signed in.
• Emergency card contents and form drafts, so a half-finished card survives a reload.
• Small preferences such as the last screen you used.

We do not use advertising cookies and we do not run third-party analytics or tracking pixels.

We do count page views, on our own server. One row per page per day, holding a number. No visitor identifier, no session, no IP address, no referrer and no user agent, which means two people opening the same page on the same day are indistinguishable from one person opening it twice. There is nothing in that table that can be traced to you. We honour Do Not Track and Global Privacy Control automatically, and the notice at the bottom of the site lets you switch the counting off.

You can clear all of this at any time through your browser settings, which will sign you out.

9. HOW LONG WE KEEP IT
• Account and medical data: while your account exists, and for up to 30 days after you delete it, so an accidental deletion can be undone.
• Emergency records: kept while the account exists, because a history of past events is clinically useful.
• Server logs: about 30 days.
• Anything already sent to a third-party provider: governed by that provider, and outside our control.

10. SECURITY, STATED HONESTLY
Data is encrypted in transit with HTTPS, access is controlled by row-level database rules, and authentication uses short-lived tokens. No system is perfectly secure and we are not going to claim otherwise. If we discover a breach affecting your data, we will tell affected users and any regulator we are required to notify, without undue delay.

11. HIPAA
Relay Arc is not a HIPAA covered entity and not a business associate. If your clinician uses this to coordinate your care, their obligations are theirs and not ours. Do not treat this app as your official medical record. Keep that with your clinician.

12. YOUR RIGHTS
Whatever region you are in, you can ask us to:
• Show you what we hold about you.
• Correct anything wrong.
• Delete your account and its data.
• Send you a copy in a portable format.
• Stop processing, or withdraw consent.
• Object to a particular use.

Write to ${CONTACT}. We will not charge you, and we will not treat you differently for asking. If you are in the UK or EU you can also complain to your data protection authority, and if you are in California you can use an authorised agent.

13. CHILDREN
This app is built for people with heart rhythm and dysautonomia conditions, and those conditions affect teenagers. Some clinical thresholds in the app are specific to ages 12 to 19, so pretending the service is adults only would be dishonest.

You must be at least 13 to hold an account. If you are under 18, a parent or guardian has to set the account up and stay involved in how it is used. We do not knowingly collect data from anyone under 13. If you believe a child under 13 has an account, write to us and we will delete it.

14. CHANGES
If we change this policy in a way that materially affects you, we will say so in the app rather than quietly updating this page. The date at the top always reflects the current version.

15. CONTACT
${CONTACT}`

export const TERMS_OF_SERVICE = `TERMS OF SERVICE
Last updated: September 2026

Please read this. Using Relay Arc means you accept it. If you do not accept it, do not use the app.

1. THIS IS NOT AN EMERGENCY SERVICE
Relay Arc does not send an ambulance and cannot summon help on your behalf. In a life-threatening situation, call your local emergency number first. Nothing in this app is a reason to delay that call.

The SOS feature notifies contacts you chose and prepares information for a hospital. It depends on your phone, your signal and other people answering, and none of that is guaranteed.

2. NOT MEDICAL ADVICE, AND NOT A DIAGNOSIS
Relay Arc does not diagnose anything and does not tell you what treatment you need. It is decision support. It organises information you provide, applies published clinical thresholds to it, and shows you the result along with the reasoning. A licensed clinician makes medical decisions, not this app and not you on the basis of this app alone.

3. NOT A REGULATED MEDICAL DEVICE
Relay Arc has not been reviewed, cleared or approved by the FDA or any other regulator. It is not certified and it is not clinically validated. It is built to sit within the clinical decision support exclusion, which means it always shows the basis for what it says so a clinician can independently review it.

4. WHO CAN USE IT
You must be at least 13. If you are under 18, a parent or guardian must set up the account and supervise its use, and by accepting these terms that adult accepts them too.

5. YOUR ACCOUNT
Keep your password to yourself. You are responsible for what happens under your account. Tell us if you think someone else has got into it.

6. ACCURACY IS ON YOU
The app is only as good as what you put into it. If your blood type, allergies or medication list is wrong, the information sent to a hospital will be wrong. Keep it current, and check it after any change to your medication.

7. WHAT YOU MAY NOT DO
• Use it for anything unlawful.
• Break into it, take it apart, or try to disrupt it.
• Enter false medical information, or information about someone who has not agreed.
• Pretend to be someone else, including a clinician or a hospital.
• Scrape it or hammer it with automated traffic.

8. IT IS FREE, AND IT IS PROVIDED AS IS
Relay Arc costs nothing and there is nothing to buy. It is provided as is and as available, with no warranty of any kind, including no warranty that it will be accurate, reliable, uninterrupted or fit for a particular purpose.

9. LIMITS ON OUR LIABILITY
To the fullest extent the law allows, we are not liable for indirect, incidental, special or consequential loss arising from your use of the app or your inability to use it. Our total liability for any claim is capped at zero, which reflects the fact that you have paid nothing.

Nothing here limits liability that cannot be limited by law, which in many places includes death or personal injury caused by negligence, and fraud. Where your local consumer law gives you rights that these terms cannot remove, those rights still apply.

10. AUTOMATED CONTENT
Some summaries are produced by a language model and may be wrong. Read them before relying on them, and never act on one in place of advice from a clinician.

11. AVAILABILITY
This runs on free infrastructure and is maintained by one person. It can go down, and it may change or stop. Do not build a care plan that depends on it being up.

12. ENDING IT
You can delete your account whenever you like. We can suspend an account that is being used to break these terms, or to put someone at risk.

13. GOVERNING LAW AND DISPUTES
These terms are governed by the laws of the operator's place of residence, and disputes will be heard by the courts there, unless your local consumer law gives you the right to bring a claim where you live, in which case that right applies.

We would much rather sort a problem out by email than in a court. Write to ${CONTACT} first and we will make a genuine attempt to resolve it.

14. THE REST
If any part of this is unenforceable, the rest still stands. These terms and the Privacy Policy are the whole agreement between us. If we change them in a way that materially affects you, we will say so in the app.

15. CONTACT
${CONTACT}`

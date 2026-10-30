// ─── Know your rights ─────────────────────────────────────────────────────────
// Why this is in an emergency app.

export type Country = 'US' | 'IN'

export interface Right {
  id: string
  /** The claim, in the plainest form that is still accurate. */
  title: string
  /** What it actually means in a hospital, at the counter, that night. */
  body: string
  /**
   * The limit. Never optional and never softened — a right described without its
   * boundary is how someone ends up ambushed by a bill they were told would not
   * come.
   */
  limit: string
  /** What to physically say or do to use it. */
  action?: string
  /** Statute or regulation, shown so a person can check it or quote it. */
  basis: string
}

export interface RightsPack {
  country: Country
  label: string
  /** Shown at the top. Sets expectations before anything else is read. */
  preamble: string
  rights: Right[]
  /** Emergency number for that country, kept here so the card is self-contained. */
  emergencyNumber: string
}

const US: RightsPack = {
  country: 'US',
  label: 'United States',
  emergencyNumber: '911',
  preamble:
    'Two federal rules decide most of what happens to someone who arrives at an emergency room without money. Knowing them changes what you can ask for. Neither of them makes care free, and this card will not pretend otherwise.',
  rights: [
    {
      id: 'emtala_screen',
      title: 'An emergency room has to examine you, whether or not you can pay',
      body: 'Any hospital that takes Medicare and runs an emergency department must give you a medical screening examination when you ask for one. They cannot ask about insurance first and refuse based on the answer. This applies regardless of insurance status, immigration status, or ability to pay.',
      limit:
        'It is a duty to examine and stabilise, not a duty to treat you for free. You can still be billed afterwards, and often will be. It also does not cover non-emergency or follow-up care.',
      action:
        'You do not have to argue or cite anything. Asking to be seen is enough to trigger it.',
      basis: 'Emergency Medical Treatment and Labor Act (EMTALA), 42 U.S.C. §1395dd',
    },
    {
      id: 'emtala_stabilise',
      title: 'If they cannot treat you, they have to arrange the transfer',
      body: 'Once an emergency condition is found, the hospital has to stabilise it. If they do not have what you need, a catheterisation lab or a stroke unit, they must arrange an appropriate transfer to somewhere that does. Sending you away untreated to find your own way is the violation.',
      limit:
        'The obligation ends once you are stable. After that point they can discharge you, and a stabilised patient is not the same as a treated one.',
      basis: 'EMTALA, 42 U.S.C. §1395dd(b)–(c)',
    },
    {
      id: 'fap_exists',
      title: 'Every nonprofit hospital must have a financial assistance policy',
      body: 'Around three in five US hospitals are nonprofit. In exchange for paying no federal income tax, each one is required to have a written financial assistance policy, publish it, and apply it. Ask for the financial assistance policy by that name, or for the "charity care application".',
      limit:
        'It applies to nonprofit hospitals. For-profit hospitals are not covered by this rule, though many have their own programme, and public hospitals run separate schemes. Federal law also sets no income cut-off. Each hospital picks its own, so eligibility genuinely varies by hospital.',
      action:
        'Ask financial counselling or the billing office for the financial assistance policy in writing. Get it before you agree to a payment plan, because a signed plan is harder to undo than an unpaid bill.',
      basis: 'Internal Revenue Code §501(r)(4), 26 CFR §1.501(r)-4',
    },
    {
      id: 'fap_window',
      title: 'You can still apply after the visit, for months afterwards',
      body: 'The most common and most expensive mistake is assuming it is too late. A nonprofit hospital has to accept and process a financial assistance application for 240 days from the date of your first bill. Applying after treatment is normal, not a special case.',
      limit:
        'The 240 days run from the first billing statement, not from the visit, and not from when the debt is sold. Missing the window means losing it.',
      action:
        'Apply even if the bill has already gone to collections. Ask for the application in writing and keep the date you sent it.',
      basis: 'Internal Revenue Code §501(r)(6), 26 CFR §1.501(r)-6',
    },
    {
      id: 'fap_collections',
      title: 'They have to check whether you qualify before coming after you',
      body: 'Before a nonprofit hospital can take aggressive collection action, it has to make reasonable efforts to work out whether you were eligible for financial assistance. It also has to warn you in writing at least 30 days beforehand, and it stays responsible for what a debt collector does on its behalf.',
      limit:
        'This restricts the aggressive actions specifically. Ordinary billing and ordinary reminders continue throughout.',
      action:
        'If a collection notice arrives and nobody ever offered you the financial assistance policy, say so in writing. That is the point the rule exists for.',
      basis: 'Internal Revenue Code §501(r)(6), 26 CFR §1.501(r)-6',
    },
  ],
}

// India is a stub on purpose.
const IN: RightsPack = {
  country: 'IN',
  label: 'India',
  emergencyNumber: '112',
  preamble:
    'This card has not been written for India yet. The rules here are different enough from the US that adapting the American version would produce something confidently wrong, so it is being left blank until it can be checked against Ayushman Bharat and the relevant state schemes properly.',
  rights: [],
}

const PACKS: Record<Country, RightsPack> = { US, IN }

export function rightsFor(country: Country): RightsPack {
  return PACKS[country] ?? US
}

/**
 * Best guess at country from the browser, falling back to US.
 *
 * Locale is a weak signal — it says what language someone reads, not where they
 * are standing — so anywhere this is used the UI has to let them change it. It
 * exists to save a tap in the common case, not to be authoritative.
 */
export function guessCountry(locale?: string): Country {
  const l = (locale || '').toLowerCase()
  if (l.endsWith('-in') || l === 'hi' || l === 'mr' || l.startsWith('hi-') || l.startsWith('mr-'))
    return 'IN'
  return 'US'
}

export const COUNTRIES: { code: Country; label: string }[] = [
  { code: 'US', label: 'United States' },
  { code: 'IN', label: 'India' },
]

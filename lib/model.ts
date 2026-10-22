// The language model id, in one place.
//
// WHY THIS FILE EXISTS
// The model id was hardcoded in eight separate route files. On 16 August 2026
// Groq shut down llama-3.1-8b-instant, and from that moment every one of those
// eight calls returned an error. The daily check-in, the care summary, the
// emergency classifier, the health intelligence panel, the insights and the
// timeline all stopped working at the same instant, and the app reported it to
// users as "could not reach the AI right now, please try again", which reads
// like a network blip rather than a permanently dead model. It sat broken for
// three weeks because nothing pointed at a single place to look.
//
// Groq announced it on 17 June 2026 with a two month window. The announcement
// goes to the account email, so if that inbox is not watched, the next shutdown
// lands the same way. Model ids on this provider have been retired roughly
// every month for two years, so this will happen again.
//
// See https://console.groq.com/docs/deprecations before changing this.
//
// WHY NOT AN ENV VAR
// It could be, and that would let the owner swap it without a deploy. But an
// env var that is unset falls back to a default anyway, and a wrong value fails
// exactly as silently as a wrong constant. The value of this file is that there
// is one place to change, and one place that explains why.
export const CHAT_MODEL = 'openai/gpt-oss-20b'

// THE REPLACEMENT IS A REASONING MODEL, AND THAT IS NOT A DROP-IN SWAP.
//
// llama-3.1-8b-instant answered directly. gpt-oss-20b thinks first, and those
// reasoning tokens are spent from the same completion budget as the answer. So
// a route that worked fine with max_tokens: 512 now spends the budget thinking
// and gets cut off before it finishes, or never starts the answer at all.
//
// That is exactly what happened when the model was swapped. Two routes came
// back broken and I had to test them to find it:
//   /api/groq/insights            512 tokens  ->  truncated mid-JSON
//   /api/groq/health-intelligence 600 tokens  ->  content came back EMPTY
//
// The third failure was the worst. /api/groq/classify-emergency has a fallback
// of { type: 'other', confidence: 'low' } when it cannot parse a reply, so
// "crushing chest pain and I cannot breathe" was classified as "other" with low
// confidence. It failed silently and safely-looking, which is the most
// dangerous shape a bug can have in a triage path.
//
// reasoning_effort 'low' keeps the thinking short, include_reasoning false
// keeps it out of the payload, and the token budget is set well above the size
// of any JSON these routes ask for.
//
// Groq's guidance also says to avoid system prompts with these models and put
// instructions in the user message. Worth knowing before touching the prompts.
export const REASONING_JSON = {
  reasoning_effort: 'low' as const,
  include_reasoning: false,
  max_completion_tokens: 2000,
}

/** Same, for routes that return prose rather than JSON. */
export const REASONING_TEXT = {
  reasoning_effort: 'low' as const,
  include_reasoning: false,
  max_completion_tokens: 1200,
}

/**
 * Groq's recommended replacement for llama-3.1-8b-instant, per their own
 * migration table. Same role: fast, cheap, good enough for summarising a
 * check-in conversation into bullet points.
 */
export const CHAT_MODEL_NOTE = 'openai/gpt-oss-20b, replacing llama-3.1-8b-instant which Groq shut down on 16 August 2026'

/**
 * groq.chat.completions.create, hardened for gpt-oss.
 *
 * gpt-oss intermittently answers in its "tool call" channel even when no tools
 * are offered, and Groq rejects that turn with HTTP 400 code tool_use_failed
 * ("Tool choice is none, but model called a tool"). In testing it hit roughly
 * one plain chat turn in eight. Every route surfaced it as "could not reach the
 * assistant", and the daily check-in was the one people noticed.
 *
 * Retry that specific failure (it is random, the next sample is usually fine);
 * if it keeps happening, recover the text the model actually generated from
 * the error's failed_generation instead of failing the user.
 */
export async function createChat(groq: any, params: any, attempts = 3): Promise<any> {
  let last: any
  for (let i = 0; i < attempts; i++) {
    try {
      return await groq.chat.completions.create(params)
    } catch (e: any) {
      last = e
      const body = e?.error?.error || e?.error || {}
      const isToolGlitch = e?.status === 400 && (body.code === 'tool_use_failed' || String(e?.message || '').includes('tool_use_failed'))
      if (!isToolGlitch) throw e
      if (i === attempts - 1) {
        const gen: string = body.failed_generation || ''
        // failed_generation looks like {"name": "...", "arguments": <the reply>}
        const m = gen.match(/"arguments"\s*:\s*"?([\s\S]*?)"?\s*\}\s*$/)
        const text = (m ? m[1] : gen).replace(/\\n/g, '\n').trim()
        if (text) return { choices: [{ message: { role: 'assistant', content: text }, finish_reason: 'recovered' }] }
      }
    }
  }
  throw last
}

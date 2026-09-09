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

/**
 * Groq's recommended replacement for llama-3.1-8b-instant, per their own
 * migration table. Same role: fast, cheap, good enough for summarising a
 * check-in conversation into bullet points.
 */
export const CHAT_MODEL_NOTE = 'openai/gpt-oss-20b, replacing llama-3.1-8b-instant which Groq shut down on 16 August 2026'

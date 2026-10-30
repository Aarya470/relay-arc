// The language model id, in one place.
export const CHAT_MODEL = 'openai/gpt-oss-20b'

// The replacement is a reasoning model, and that is not a drop-in swap.
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
export const CHAT_MODEL_NOTE =
  'openai/gpt-oss-20b, replacing llama-3.1-8b-instant which Groq shut down on 16 August 2026'

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
/**
 * Models to fall back to, in order, when the primary is rate-limited. On Groq
 * each model has its OWN daily token allowance, so when gpt-oss-20b's runs out
 * (HTTP 429 rate_limit_exceeded, "tokens per day") the others still answer.
 * That exact failure took the daily check-in down on 22 Oct 2026.
 */
export const FALLBACK_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b']

function forModel(params: any, model: string) {
  const p = { ...params, model }
  if (!model.startsWith('openai/gpt-oss')) {
    delete p.reasoning_effort
    delete p.include_reasoning
  }
  return p
}
function stripThinking(r: any) {
  const m = r?.choices?.[0]?.message
  if (m && typeof m.content === 'string')
    m.content = m.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  return r
}

export async function createChat(groq: any, params: any, attempts = 3): Promise<any> {
  const models = [params.model, ...FALLBACK_MODELS.filter((m) => m !== params.model)]
  let last: any
  for (const model of models) {
    try {
      return stripThinking(await createChatOne(groq, forModel(params, model), attempts))
    } catch (e: any) {
      last = e
      const body = e?.error?.error || e?.error || {}
      const exhausted =
        e?.status === 429 ||
        body.code === 'rate_limit_exceeded' ||
        body.code === 'model_decommissioned' ||
        e?.status === 404 ||
        e?.status >= 500
      if (!exhausted) throw e
      console.warn(
        `createChat: ${model} unavailable (${e?.status} ${body.code || ''}), trying the next model`,
      )
    }
  }
  throw last
}

async function createChatOne(groq: any, params: any, attempts = 3): Promise<any> {
  let last: any
  for (let i = 0; i < attempts; i++) {
    try {
      return await groq.chat.completions.create(params)
    } catch (e: any) {
      last = e
      const body = e?.error?.error || e?.error || {}
      const isToolGlitch =
        e?.status === 400 &&
        (body.code === 'tool_use_failed' || String(e?.message || '').includes('tool_use_failed'))
      if (!isToolGlitch) throw e
      if (i === attempts - 1) {
        const gen: string = body.failed_generation || ''
        // failed_generation looks like {"name": "...", "arguments": <the reply>}
        const m = gen.match(/"arguments"\s*:\s*"?([\s\S]*?)"?\s*\}\s*$/)
        const text = (m ? m[1] : gen).replace(/\\n/g, '\n').trim()
        if (text)
          return {
            choices: [
              { message: { role: 'assistant', content: text }, finish_reason: 'recovered' },
            ],
          }
      }
    }
  }
  throw last
}

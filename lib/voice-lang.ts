// Voice SOS languages.
//
// The on-device Relay Triage Engine normalises Hindi, Marathi and Spanish — in both
// Devanagari and romanised form — onto the same canonical English tokens it was
// trained on (see ml/featurize.py MULTILINGUAL). So the classifier itself is
// language-agnostic; the only thing that has to change per language is the
// speech-recognition locale we hand to the browser, and the label on the button.
//
// NOTE: the Hindi and Marathi phrasings in the corpus were authored from general
// knowledge and are pending native-speaker review before we lean on them in
// production. See ml/corpus.py.

export type LangId = 'en' | 'hi' | 'mr' | 'es'

export interface VoiceLang {
  id: LangId
  /** What we show on the selector chip, in that language's own script. */
  chip: string
  /** BCP-47 tag for SpeechRecognition. */
  locale: string
  /** Button copy: idle state. */
  speak: string
  /** Button copy: actively listening. */
  listening: string
}

export const VOICE_LANGS: VoiceLang[] = [
  {
    id: 'en',
    chip: 'EN',
    locale: 'en-IN',
    speak: 'Speak it instead. Tap and talk',
    listening: "Listening. Describe what's happening",
  },
  {
    id: 'hi',
    chip: 'हिंदी',
    locale: 'hi-IN',
    speak: 'बोलकर बताएं, दबाएं और बोलें',
    listening: 'सुन रहे हैं, क्या हो रहा है बताएं',
  },
  {
    id: 'mr',
    chip: 'मराठी',
    locale: 'mr-IN',
    speak: 'बोलून सांगा, दाबा आणि बोला',
    listening: 'ऐकत आहोत, काय होत आहे सांगा',
  },
  // Spanish: added for East Windsor and Hightstown. es-US is the acoustic
  // model for Spanish as spoken in the United States.
  {
    id: 'es',
    chip: 'ES',
    locale: 'es-US',
    speak: 'Dígalo en voz alta. Toque y hable',
    listening: 'Escuchando. Diga qué está pasando',
  },
]

export function langById(id: LangId): VoiceLang {
  return VOICE_LANGS.find(l => l.id === id) || VOICE_LANGS[0]
}

const STORE_KEY = 'relay_voice_lang'

/**
 * Best default: an explicit past choice wins, then the browser's own languages.
 * We check the full navigator.languages list because a phone set to English
 * often still lists hi-IN second, which is a strong signal.
 */
export function detectLang(): LangId {
  if (typeof window === 'undefined') return 'en'
  try {
    const saved = localStorage.getItem(STORE_KEY)
    if (saved === 'en' || saved === 'hi' || saved === 'mr' || saved === 'es') return saved
  } catch { /* private mode */ }
  try {
    const tags = [...(navigator.languages || []), navigator.language || '']
    for (const t of tags) {
      const base = t.toLowerCase().split('-')[0]
      if (base === 'mr') return 'mr'
      if (base === 'hi') return 'hi'
      if (base === 'es') return 'es'
    }
  } catch { /* ignore */ }
  return 'en'
}

export function rememberLang(id: LangId) {
  try { localStorage.setItem(STORE_KEY, id) } catch { /* private mode */ }
}

/**
 * For English we prefer the user's actual English locale when they have one, so
 * an American user isn't forced through the Indian acoustic model.
 */
export function resolveLocale(l: VoiceLang): string {
  if (l.id !== 'en') return l.locale
  if (typeof navigator === 'undefined') return 'en-US'
  const tags = [...(navigator.languages || []), navigator.language || '']
  const en = tags.find(t => t.toLowerCase().startsWith('en') && t.includes('-'))
  return en || 'en-IN'
}

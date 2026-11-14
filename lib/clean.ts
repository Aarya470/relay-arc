// Browser safe text cleaning, the same rules as cleanText() in lib/security.ts.
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F­​-‏‪-‮⁠-⁩﻿]/g

/** Fold lookalike characters into one form, drop invisible ones, cap the length. */
export function clean(input: string, maxChars = 80): string {
  return Array.from(input.normalize('NFKC').replace(INVISIBLE, '').trim()).slice(0, maxChars).join('')
}

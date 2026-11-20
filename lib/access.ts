// Display and access preferences. Stored on this device only and applied to
// <html> as data attributes, so CSS does the work and nothing is sent anywhere.
export type AccessPrefs = {
  text: 'md' | 'lg' | 'xl'
  contrast: 'normal' | 'high'
  motion: 'system' | 'reduce'
  links: 'normal' | 'underline'
}
export const ACCESS_KEY = 'relay-access'
export const DEFAULT_ACCESS: AccessPrefs = { text: 'md', contrast: 'normal', motion: 'system', links: 'normal' }

export function readAccess(): AccessPrefs {
  try {
    const raw = localStorage.getItem(ACCESS_KEY)
    if (raw) return { ...DEFAULT_ACCESS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_ACCESS
}

export function applyAccess(p: AccessPrefs) {
  const d = document.documentElement.dataset
  d.text = p.text
  d.contrast = p.contrast
  d.motion = p.motion
  d.links = p.links
  window.dispatchEvent(new CustomEvent('relay-access', { detail: p }))
}

export function saveAccess(p: AccessPrefs) {
  try {
    localStorage.setItem(ACCESS_KEY, JSON.stringify(p))
  } catch {}
  applyAccess(p)
}

/** Runs in <head> before first paint so large text never flashes small. */
export const ACCESS_BOOT = `try{var a=JSON.parse(localStorage.getItem('${ACCESS_KEY}')||'{}'),d=document.documentElement.dataset;d.text=a.text||'md';d.contrast=a.contrast||'normal';d.motion=a.motion||'system';d.links=a.links||'normal'}catch(e){}`

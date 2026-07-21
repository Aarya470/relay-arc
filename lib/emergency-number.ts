'use client'

// Region-correct emergency numbers. The mission is India-first: 108 is the
// national ambulance service. 112 is the global GSM standard and works in
// most of the world (including India, where it routes to 108-era services).
export function emergencyNumber(): { number: string; label: string } {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return { number: '108', label: '108' }
    if (tz.startsWith('America/')) return { number: '911', label: '911' }
    if (tz.startsWith('Europe/')) return { number: '112', label: '112' }
    if (tz.startsWith('Australia/')) return { number: '000', label: '000' }
    if (tz.startsWith('Asia/')) return { number: '112', label: '112' }
  } catch {}
  return { number: '112', label: '112' }
}

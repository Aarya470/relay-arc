// Browser side of the breathing reader: the accelerometer, sampled while the
// phone rests on the chest of someone lying back.
export interface MotionReader { stop: () => void }

/** iOS asks permission for motion sensors, and only from inside a tap handler. */
export async function requestMotionPermission(): Promise<boolean> {
  const D = (typeof window !== 'undefined' ? (window as any).DeviceMotionEvent : undefined)
  if (!D) return false
  if (typeof D.requestPermission === 'function') {
    try { return (await D.requestPermission()) === 'granted' } catch { return false }
  }
  return true
}

export function startMotion(onSample: (t: number, v: number) => void): MotionReader {
  const t0 = performance.now()
  const handler = (e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity
    if (!a || a.z == null) return
    // Lying flat on the chest, breathing tilts the phone, so the share of
    // gravity on its z axis rises and falls with each breath.
    onSample((performance.now() - t0) / 1000, a.z)
  }
  window.addEventListener('devicemotion', handler)
  return { stop: () => window.removeEventListener('devicemotion', handler) }
}

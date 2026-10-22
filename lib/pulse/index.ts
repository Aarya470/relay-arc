// ─────────────────────────────────────────────────────────────────────────────
// Phone-as-sensor signal processing. No hardware to buy.
//
// HEART RATE FROM THE CAMERA (photoplethysmography, PPG)
// A fingertip pressed over the rear camera, lit by the flash, goes very slightly
// darker each time a pulse of blood arrives. Averaging the red channel of every
// frame gives a waveform with one bump per heartbeat. This is the same physics a
// pulse oximeter or a smartwatch uses; the phone camera is just a cheaper sensor.
//
// BREATHING RATE FROM THE ACCELEROMETER
// A phone resting on the chest of someone lying back rises and falls with each
// breath. The accelerometer sees that as a slow oscillation, about one cycle
// every 3 to 5 seconds at rest.
//
// Both are estimated the same way: resample to an even rate, remove the slow
// drift, then find the strongest frequency inside the physiological band with a
// direct Fourier scan. The answer comes with a QUALITY score (how much of the
// band's energy sits at that one frequency) so the app can refuse to report a
// number from a noisy recording instead of showing a confident wrong one.
//
// Everything here is a pure function, so it is unit-tested against synthetic
// signals with a known answer in tests/pulse.test.ts.
//
// This is a wellness-grade estimate, not a medical device. The /check page says
// so, and a reading only feeds NEWS2 when its quality passes the gate below.
// ─────────────────────────────────────────────────────────────────────────────

export interface Sample { t: number; v: number }   // t in seconds

export interface RateEstimate {
  /** Beats or breaths per minute, rounded. Null when quality is too low. */
  rate: number | null
  /** 0..1, share of in-band spectral energy at the winning frequency (±1 bin). */
  quality: number
  /** True when quality passes the gate and enough signal was recorded. */
  ok: boolean
  /** Seconds of signal used. */
  seconds: number
  /** Why it is not ok, in words a person can act on. */
  problem?: string
}

/** Linear-interpolate irregular samples onto an even grid. */
export function resample(samples: Sample[], hz: number): number[] {
  if (samples.length < 2) return []
  const t0 = samples[0].t, t1 = samples[samples.length - 1].t
  const n = Math.floor((t1 - t0) * hz)
  const out: number[] = new Array(Math.max(0, n))
  let j = 0
  for (let i = 0; i < n; i++) {
    const t = t0 + i / hz
    while (j < samples.length - 2 && samples[j + 1].t < t) j++
    const a = samples[j], b = samples[j + 1]
    const f = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t)
    out[i] = a.v + (b.v - a.v) * Math.min(1, Math.max(0, f))
  }
  return out
}

/** Subtract a centred moving average: removes drift slower than ~1/windowSec Hz. */
export function detrend(x: number[], hz: number, windowSec: number): number[] {
  const w = Math.max(1, Math.round(windowSec * hz))
  const half = Math.floor(w / 2)
  const pre = new Float64Array(x.length + 1)
  for (let i = 0; i < x.length; i++) pre[i + 1] = pre[i] + x[i]
  return x.map((v, i) => {
    const a = Math.max(0, i - half), b = Math.min(x.length, i + half + 1)
    return v - (pre[b] - pre[a]) / (b - a)
  })
}

/**
 * Strongest frequency in [loHz, hiHz], by direct DFT on a fine grid with a Hann
 * window. Returns the frequency and the share of band energy near it.
 */
/** Power at each frequency in [loHz, hiHz] (Hann window, direct DFT). */
export function spectrum(x: number[], hz: number, loHz: number, hiHz: number, stepHz = 0.005) {
  const n = x.length
  const win = x.map((v, i) => v * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))))
  const freqs: number[] = [], power: number[] = []
  for (let f = loHz; f <= hiHz + 1e-9; f += stepHz) {
    let re = 0, im = 0
    const w = (2 * Math.PI * f) / hz
    for (let i = 0; i < n; i++) { re += win[i] * Math.cos(w * i); im -= win[i] * Math.sin(w * i) }
    freqs.push(f); power.push(re * re + im * im)
  }
  return { freqs, power }
}

export function dominantFrequency(x: number[], hz: number, loHz: number, hiHz: number, stepHz = 0.005) {
  const n = x.length
  const win = x.map((v, i) => v * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))))
  const freqs: number[] = [], power: number[] = []
  for (let f = loHz; f <= hiHz + 1e-9; f += stepHz) {
    let re = 0, im = 0
    const w = (2 * Math.PI * f) / hz
    for (let i = 0; i < n; i++) { re += win[i] * Math.cos(w * i); im -= win[i] * Math.sin(w * i) }
    freqs.push(f); power.push(re * re + im * im)
  }
  let best = 0
  for (let i = 1; i < power.length; i++) if (power[i] > power[best]) best = i
  const total = power.reduce((a, b) => a + b, 0) || 1
  // Energy within one frequency-resolution bin of the peak (1 / duration).
  const res = hz / n
  let near = 0
  for (let i = 0; i < power.length; i++) if (Math.abs(freqs[i] - freqs[best]) <= res) near += power[i]
  return { freq: freqs[best], quality: near / total }
}

function estimate(samples: Sample[], opt: {
  hz: number; loHz: number; hiHz: number; detrendSec: number; minSec: number; minQuality: number;
  perMinuteLabel: string
}): RateEstimate {
  const seconds = samples.length > 1 ? samples[samples.length - 1].t - samples[0].t : 0
  if (seconds < opt.minSec) {
    return { rate: null, quality: 0, ok: false, seconds, problem: `Keep going: need ${opt.minSec} seconds` }
  }
  const x = detrend(resample(samples, opt.hz), opt.hz, opt.detrendSec)
  const { freq, quality } = dominantFrequency(x, opt.hz, opt.loHz, opt.hiHz)
  const rate = Math.round(freq * 60)
  const ok = quality >= opt.minQuality
  return {
    rate: ok ? rate : null, quality: Math.round(quality * 100) / 100, ok, seconds,
    problem: ok ? undefined : `Signal too noisy to trust a ${opt.perMinuteLabel} reading. Hold still and try again`,
  }
}

/** Heart rate from per-frame red-channel means. 40–200 bpm. */
// Gate tuned on 300 synthetic 15-second traces: on pure noise the quality
// score's 95th percentile is about 0.29, a weak but real fingertip trace sits
// well above. A reading is only CONFIRMED when, on top of this gate, the last
// 10 seconds agree with the whole window to within 5 bpm (confirmHeartRate):
// that cut false readings from noise to about 1 in 100 while still accepting
// about 93 in 100 weak real traces.
export const PULSE_MIN_QUALITY = 0.30
export function estimateHeartRate(samples: Sample[]): RateEstimate {
  return estimate(samples, {
    hz: 30, loHz: 40 / 60, hiHz: 200 / 60, detrendSec: 1.2, minSec: 8,
    minQuality: PULSE_MIN_QUALITY, perMinuteLabel: 'pulse',
  })
}

/**
 * A pulse reading you can trust: the full window and its last 10 seconds must
 * both pass the gate and agree within 5 bpm. Noise peaks wander; a real pulse
 * does not.
 */
export function confirmHeartRate(samples: Sample[]): RateEstimate & { confirmed: boolean } {
  const all = estimateHeartRate(samples)
  if (!all.ok || samples.length < 2) return { ...all, confirmed: false }
  const tEnd = samples[samples.length - 1].t
  const tail = estimateHeartRate(samples.filter(s => s.t > tEnd - 10))
  const confirmed = tail.ok && tail.rate != null && all.rate != null && Math.abs(tail.rate - all.rate) <= 5
  return { ...all, confirmed, ok: confirmed, rate: confirmed ? all.rate : null,
    problem: confirmed ? undefined : 'Almost there. Keep holding still' }
}

// 15 seconds is short for breathing (three or four breaths), so the gate is
// strict and the page offers tap counting as the more reliable option.
/** Breathing rate from accelerometer samples. 6–40 breaths per minute. */
export const BREATH_MIN_QUALITY = 0.75
export function estimateBreathRate(samples: Sample[]): RateEstimate {
  return estimate(samples, {
    hz: 20, loHz: 6 / 60, hiHz: 40 / 60, detrendSec: 8, minSec: 12,
    minQuality: BREATH_MIN_QUALITY, perMinuteLabel: 'breathing',
  })
}

/** Breaths per minute from manual taps (one tap per breath). */
export function breathRateFromTaps(tapTimesSec: number[]): number | null {
  if (tapTimesSec.length < 3) return null
  const span = tapTimesSec[tapTimesSec.length - 1] - tapTimesSec[0]
  if (span <= 0) return null
  return Math.round(((tapTimesSec.length - 1) / span) * 60)
}

/**
 * Is a fingertip actually covering the lens?
 *
 * The first version demanded a bright, strongly red frame (red > 1.6 x green).
 * That failed in two common cases, and in testing it took about fifteen tries
 * to register: with the flash ON the red channel saturates and green rises
 * with it, so the ratio drops; with the flash OFF (iPhone, where the browser
 * cannot control it) a fingertip in room light is dim. What a covered lens
 * reliably is, flash or not, is UNIFORM: skin pressed on glass has almost no
 * edges. So the main test is low spatial spread, with red at least matching
 * green and enough light to see anything at all.
 */
export function fingerPresent(meanR: number, meanG: number, meanB: number, spread = 0): boolean {
  if (meanR < 18) return false                       // too dark to read
  if (meanR < meanG * 0.95 || meanR < meanB) return false   // skin is red-dominant
  return spread < 28 || (meanR > 90 && meanR > meanG * 1.6)
}

/** Pick the camera channel with the most pulse in it. */
export function bestChannelEstimate(red: Sample[], green: Sample[]): RateEstimate & { confirmed: boolean; channel: 'red' | 'green' } {
  const r = confirmHeartRate(red), g = confirmHeartRate(green)
  const pick = (g.confirmed && !r.confirmed) || (g.confirmed === r.confirmed && g.quality > r.quality)
  return pick ? { ...g, channel: 'green' } : { ...r, channel: 'red' }
}

/** Plain-language coaching from what the camera sees. */
export function fingerCoach(meanR: number, meanG: number, spread: number): string | null {
  if (meanR < 18) return 'Too dark. Turn on a light or hold the phone near a lamp'
  if (meanR > 250 && meanG > 235) return 'Too bright. Press a little more firmly over the flash'
  if (spread >= 28) return 'Cover the whole camera lens with your fingertip'
  return null
}

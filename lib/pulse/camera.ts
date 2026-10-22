// Browser side of the camera pulse reader. Pure signal maths lives in ./index.ts.
//
// Opens the rear camera at low resolution, turns the flash on where the browser
// allows it (Chrome on Android does; iOS Safari does not expose the torch to the
// web, so there the fingertip is lit by room light and the signal is weaker),
// and reports the mean colour of the centre of every frame.
import { fingerPresent } from './index'

export interface FrameStat { t: number; r: number; g: number; b: number; finger: boolean }

export interface PulseCamera {
  stop: () => void
  torch: boolean
}

export async function startPulseCamera(onFrame: (f: FrameStat) => void): Promise<PulseCamera> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 30 } },
  })
  const track = stream.getVideoTracks()[0]
  let torch = false
  try {
    const caps = (track.getCapabilities?.() || {}) as any
    if (caps.torch) {
      await track.applyConstraints({ advanced: [{ torch: true } as any] })
      torch = true
    }
  } catch { /* torch is optional */ }

  const video = document.createElement('video')
  video.muted = true
  video.setAttribute('playsinline', '')
  video.srcObject = stream
  await video.play()

  const canvas = document.createElement('canvas')
  canvas.width = 40; canvas.height = 30
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const t0 = performance.now()
  let running = true

  const tick = () => {
    if (!running) return
    if (video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      // centre 50% of the frame: the edges of a fingertip leak room light
      const d = ctx.getImageData(10, 7, 20, 16).data
      let r = 0, g = 0, b = 0
      const n = d.length / 4
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2] }
      r /= n; g /= n; b /= n
      onFrame({ t: (performance.now() - t0) / 1000, r, g, b, finger: fingerPresent(r, g, b) })
    }
    const v = video as any
    if (typeof v.requestVideoFrameCallback === 'function') v.requestVideoFrameCallback(tick)
    else requestAnimationFrame(tick)
  }
  tick()

  return {
    torch,
    stop: () => {
      running = false
      try { if (torch) track.applyConstraints({ advanced: [{ torch: false } as any] }) } catch {}
      stream.getTracks().forEach(t => t.stop())
      video.srcObject = null
    },
  }
}

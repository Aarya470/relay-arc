// Browser side of the camera pulse reader.
import { fingerPresent } from './index'

export interface FrameStat {
  t: number
  r: number
  g: number
  b: number
  spread: number
  finger: boolean
}

export interface PulseCamera {
  stop: () => void
  torch: boolean
}

export async function startPulseCamera(onFrame: (f: FrameStat) => void): Promise<PulseCamera> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 320 },
      height: { ideal: 240 },
      frameRate: { ideal: 30 },
    },
  })
  const track = stream.getVideoTracks()[0]
  let torch = false
  try {
    const caps = (track.getCapabilities?.() || {}) as any
    if (caps.torch) {
      await track.applyConstraints({ advanced: [{ torch: true } as any] })
      torch = true
    }
  } catch {
    /* torch is optional */
  }

  const video = document.createElement('video')
  video.muted = true
  video.setAttribute('playsinline', '')
  video.srcObject = stream
  await video.play()

  const canvas = document.createElement('canvas')
  canvas.width = 40
  canvas.height = 30
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const t0 = performance.now()
  let running = true

  const tick = () => {
    if (!running) return
    if (video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      // centre 50% of the frame: the edges of a fingertip leak room light
      const d = ctx.getImageData(10, 7, 20, 16).data
      let r = 0,
        g = 0,
        b = 0,
        rr = 0
      const n = d.length / 4
      for (let i = 0; i < d.length; i += 4) {
        r += d[i]
        g += d[i + 1]
        b += d[i + 2]
        rr += d[i] * d[i]
      }
      r /= n
      g /= n
      b /= n
      // spatial spread of the red channel: low when a fingertip covers the lens
      const spread = Math.sqrt(Math.max(0, rr / n - r * r))
      onFrame({
        t: (performance.now() - t0) / 1000,
        r,
        g,
        b,
        spread,
        finger: fingerPresent(r, g, b, spread),
      })
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
      try {
        if (torch) track.applyConstraints({ advanced: [{ torch: false } as any] })
      } catch {}
      stream.getTracks().forEach((t) => t.stop())
      video.srcObject = null
    },
  }
}

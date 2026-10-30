// Apple Health import, entirely on the device.

export type HealthKind =
  'heart_rate' | 'resting_hr' | 'spo2' | 'resp_rate' | 'systolic' | 'diastolic' | 'temp_c'

const TYPES: Record<string, HealthKind> = {
  HKQuantityTypeIdentifierHeartRate: 'heart_rate',
  HKQuantityTypeIdentifierRestingHeartRate: 'resting_hr',
  HKQuantityTypeIdentifierOxygenSaturation: 'spo2',
  HKQuantityTypeIdentifierRespiratoryRate: 'resp_rate',
  HKQuantityTypeIdentifierBloodPressureSystolic: 'systolic',
  HKQuantityTypeIdentifierBloodPressureDiastolic: 'diastolic',
  HKQuantityTypeIdentifierBodyTemperature: 'temp_c',
}

export interface Reading {
  value: number
  at: Date
}
export interface HealthSummary {
  latest: Partial<Record<HealthKind, Reading>>
  /** Daily mean pulse for the last 30 days of data, oldest first. */
  dailyHr: { day: string; mean: number }[]
  /** Daily resting pulse for the last 30 days of data, oldest first. */
  dailyResting: { day: string; value: number }[]
  recordsScanned: number
  matched: number
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`))
  return m ? m[1] : null
}

/** "2026-10-01 08:00:00 -0400" → Date. */
export function parseHealthDate(s: string): Date | null {
  const m = s.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/)
  const d = m ? new Date(`${m[1]}T${m[2]}${m[3]}:${m[4]}`) : new Date(s)
  return isNaN(d.getTime()) ? null : d
}

/** Normalise units to what NEWS2 uses: %, °C, per-minute, mmHg. */
function normalise(kind: HealthKind, value: number, unit: string | null): number {
  if (kind === 'spo2' && value <= 1) return Math.round(value * 1000) / 10 // 0.97 → 97
  if (kind === 'temp_c' && unit && /degF/i.test(unit))
    return Math.round((((value - 32) * 5) / 9) * 10) / 10
  return value
}

/** Scan export.xml text, delivered in arbitrary chunks. */
export async function scanRecords(
  chunks: AsyncIterable<string> | Iterable<string>,
): Promise<HealthSummary> {
  const latest: Partial<Record<HealthKind, Reading>> = {}
  const hrByDay = new Map<string, { sum: number; n: number }>()
  const restByDay = new Map<string, number>()
  let carry = '',
    scanned = 0,
    matched = 0

  const take = (tag: string) => {
    scanned++
    const type = attr(tag, 'type')
    if (!type) return
    const kind = TYPES[type]
    if (!kind) return
    const v = parseFloat(attr(tag, 'value') || '')
    const at = parseHealthDate(attr(tag, 'startDate') || '')
    if (!isFinite(v) || !at) return
    matched++
    const value = normalise(kind, v, attr(tag, 'unit'))
    const prev = latest[kind]
    if (!prev || at > prev.at) latest[kind] = { value, at }
    const day = at.toISOString().slice(0, 10)
    if (kind === 'heart_rate') {
      const d = hrByDay.get(day) || { sum: 0, n: 0 }
      d.sum += value
      d.n++
      hrByDay.set(day, d)
    } else if (kind === 'resting_hr') restByDay.set(day, value)
  }

  for await (const chunk of chunks as any) {
    const text = carry + chunk
    let last = 0
    const re = /<Record\b[^>]*>/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      take(m[0])
      last = re.lastIndex
    }
    // keep a possibly-truncated tag for the next chunk
    // The chunk can end part-way through a tag, even part-way through the word
    // "<Record". Carry everything from the last unclosed '<' into the next chunk.
    const lt = text.lastIndexOf('<')
    carry = lt >= last && text.indexOf('>', lt) === -1 ? text.slice(lt) : ''
    if (carry.length > 4000) carry = '' // a real Record tag is never this long
  }

  const days = [...hrByDay.keys()].sort().slice(-30)
  const rdays = [...restByDay.keys()].sort().slice(-30)
  return {
    latest,
    dailyHr: days.map((day) => {
      const d = hrByDay.get(day)!
      return { day, mean: Math.round(d.sum / d.n) }
    }),
    dailyResting: rdays.map((day) => ({ day, value: Math.round(restByDay.get(day)!) })),
    recordsScanned: scanned,
    matched,
  }
}

// ── Reading the file ─────────────────────────────────────────────────────────

async function* textChunks(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = stream
    .pipeThrough(new TextDecoderStream() as unknown as ReadableWritablePair<string, Uint8Array>)
    .getReader()
  while (true) {
    const { value, done } = await reader.read()
    if (done) return
    yield value
  }
}

function u16(b: DataView, o: number) {
  return b.getUint16(o, true)
}
function u32(b: DataView, o: number) {
  return b.getUint32(o, true)
}
function u64(b: DataView, o: number) {
  return Number(b.getBigUint64(o, true))
}

/**
 * Find apple_health_export/export.xml inside export.zip and return its
 * decompressed byte stream. Handles ZIP64, which large Health exports use.
 */
async function zipEntryStream(
  file: Blob,
  wanted: (name: string) => boolean,
): Promise<ReadableStream<Uint8Array>> {
  const tailLen = Math.min(file.size, 65557 + 20)
  const tail = new DataView(await file.slice(file.size - tailLen).arrayBuffer())
  let eocd = -1
  for (let i = tail.byteLength - 22; i >= 0; i--)
    if (u32(tail, i) === 0x06054b50) {
      eocd = i
      break
    }
  if (eocd < 0) throw new Error('This does not look like a zip file')
  let cdSize = u32(tail, eocd + 12),
    cdOff = u32(tail, eocd + 16)
  if (cdOff === 0xffffffff || cdSize === 0xffffffff) {
    const loc = eocd - 20
    if (loc >= 0 && u32(tail, loc) === 0x07064b50) {
      const z64Off = u64(tail, loc + 8)
      const z = new DataView(await file.slice(z64Off, z64Off + 56).arrayBuffer())
      cdSize = u64(z, 40)
      cdOff = u64(z, 48)
    }
  }
  const cd = new DataView(await file.slice(cdOff, cdOff + cdSize).arrayBuffer())
  let p = 0
  while (p + 46 <= cd.byteLength && u32(cd, p) === 0x02014b50) {
    const method = u16(cd, p + 10)
    let comp = u32(cd, p + 20),
      uncomp = u32(cd, p + 24)
    const nameLen = u16(cd, p + 28),
      extraLen = u16(cd, p + 30),
      commentLen = u16(cd, p + 32)
    let local = u32(cd, p + 42)
    const name = new TextDecoder().decode(
      new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen),
    )
    // ZIP64 extra field: only the fields that overflowed are present, in order.
    let e = p + 46 + nameLen
    const eEnd = e + extraLen
    while (e + 4 <= eEnd) {
      const id = u16(cd, e),
        len = u16(cd, e + 2)
      if (id === 0x0001) {
        let q = e + 4
        if (uncomp === 0xffffffff) {
          uncomp = u64(cd, q)
          q += 8
        }
        if (comp === 0xffffffff) {
          comp = u64(cd, q)
          q += 8
        }
        if (local === 0xffffffff) {
          local = u64(cd, q)
          q += 8
        }
      }
      e += 4 + len
    }
    if (wanted(name)) {
      const lh = new DataView(await file.slice(local, local + 30).arrayBuffer())
      const start = local + 30 + u16(lh, 26) + u16(lh, 28)
      const raw = file.slice(start, start + comp).stream() as ReadableStream<Uint8Array>
      if (method === 0) return raw
      if (method === 8)
        return raw.pipeThrough(new (globalThis as any).DecompressionStream('deflate-raw'))
      throw new Error('Unsupported compression in this zip')
    }
    p += 46 + nameLen + extraLen + commentLen
  }
  throw new Error('No export.xml found. Is this the file from Health → Export All Health Data?')
}

/** Accepts export.zip, or export.xml if the person already unzipped it. */
export async function importAppleHealth(file: File): Promise<HealthSummary> {
  if (/\.xml$/i.test(file.name))
    return scanRecords(textChunks(file.stream() as ReadableStream<Uint8Array>))
  const stream = await zipEntryStream(file, (n) => /(^|\/)export\.xml$/.test(n))
  return scanRecords(textChunks(stream))
}

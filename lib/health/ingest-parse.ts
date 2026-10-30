// ─────────────────────────────────────────────────────────────────────────────
// Turn whatever an iPhone sends to /api/health/ingest into vitals_logs rows.

export interface IngestRow {
  logged_at: string
  heart_rate?: number
  resp_rate?: number
  oxygen_sat?: number
  systolic?: number
  diastolic?: number
  steps?: number
  hrv_ms?: number
}

/** "2026-10-23 14:30:00 -0400" → ISO. Falls back to Date parsing. */
export function parseHaeDate(s: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)\s*([+-]\d{2}):?(\d{2})$/.exec(
    s?.trim() ?? '',
  )
  const d = m
    ? new Date(`${m[1]}T${m[2].length === 5 ? m[2] + ':00' : m[2]}${m[3]}:${m[4]}`)
    : new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN
  return isFinite(n) ? n : undefined
}

/** Keep only the newest points per metric so a week of watch data stays small. */
const MAX_PER_METRIC = 48

export function parseIngestBody(body: any, now = new Date()): IngestRow[] {
  const rows = new Map<string, IngestRow>()
  const at = (ts: string | null | undefined) => {
    const key = ts || now.toISOString()
    if (!rows.has(key)) rows.set(key, { logged_at: key })
    return rows.get(key)!
  }

  // A. Health Auto Export
  const metrics = body?.data?.metrics
  if (Array.isArray(metrics)) {
    for (const m of metrics) {
      const name = String(m?.name || '').toLowerCase()
      const pts = (Array.isArray(m?.data) ? m.data : [])
        .map((p: any) => ({ p, ts: parseHaeDate(p?.date ?? p?.startDate ?? '') }))
        .filter((x: any) => x.ts)
        .sort((a: any, b: any) => (a.ts < b.ts ? 1 : -1))
        .slice(0, MAX_PER_METRIC)
      for (const { p, ts } of pts) {
        const r = at(ts)
        if (name === 'heart_rate') {
          const v = num(p.Avg ?? p.avg ?? p.qty)
          if (v) r.heart_rate = Math.round(v)
        } else if (name === 'respiratory_rate') {
          const v = num(p.qty)
          if (v) r.resp_rate = Math.round(v * 10) / 10
        } else if (name === 'blood_oxygen_saturation' || name === 'oxygen_saturation') {
          const v = num(p.qty)
          if (v) r.oxygen_sat = Math.round((v <= 1 ? v * 100 : v) * 10) / 10
        } else if (name === 'blood_pressure') {
          const s = num(p.systolic),
            d = num(p.diastolic)
          if (s) r.systolic = s
          if (d) r.diastolic = d
        } else if (name === 'heart_rate_variability' || name === 'heart_rate_variability_sdnn') {
          const v = num(p.qty)
          if (v) r.hrv_ms = v
        } else if (name === 'step_count') {
          const v = num(p.qty)
          if (v != null) r.steps = Math.round(v)
        }
      }
    }
  }

  // B. readings array
  if (Array.isArray(body?.readings)) {
    for (const x of body.readings) {
      const r = at(x?.timestamp ? parseHaeDate(String(x.timestamp)) : null)
      switch (x?.type) {
        case 'heart_rate':
          r.heart_rate = num(x.value)
          break
        case 'blood_pressure':
          r.systolic = num(x.systolic)
          r.diastolic = num(x.diastolic)
          break
        case 'oxygen_saturation': {
          const v = num(x.value)
          if (v != null) r.oxygen_sat = v <= 1 ? v * 100 : v
          break
        }
        case 'respiratory_rate':
          r.resp_rate = num(x.value)
          break
        case 'steps':
          r.steps = num(x.value)
          break
        case 'hrv':
          r.hrv_ms = num(x.value)
          break
      }
    }
  }

  // C. flat dictionary
  const flat = {
    heart_rate: num(body?.heart_rate),
    resp_rate: num(body?.resp_rate ?? body?.respiratory_rate),
    oxygen_sat: num(body?.oxygen_sat ?? body?.oxygen_saturation),
    systolic: num(body?.systolic),
    diastolic: num(body?.diastolic),
  }
  if (Object.values(flat).some((v) => v != null)) {
    const r = at(body?.timestamp ? parseHaeDate(String(body.timestamp)) : null)
    for (const [k, v] of Object.entries(flat))
      if (v != null) (r as any)[k] = k === 'oxygen_sat' && v <= 1 ? v * 100 : v
  }

  // drop rows with nothing in them, and clean undefined keys
  return Array.from(rows.values())
    .map(
      (r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)) as IngestRow,
    )
    .filter((r) => Object.keys(r).length > 1)
}

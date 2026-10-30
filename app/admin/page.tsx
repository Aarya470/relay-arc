'use client'
import { useState, useRef, useCallback } from 'react'
import { Loader2, Plus, Trash2, RefreshCw, Copy, Check, Search } from 'lucide-react'

const T1 = '#141413'
const T2 = '#5C5A52'
const T3 = '#5C5A52'
const BORDER = '#E4E4E7'
const ACCENT = '#42623C'
const RED = '#A33417'
const GREEN = '#42623C'
const MONO = 'var(--font-mono, monospace)'

interface Partner {
  id: string
  access_code: string
  name: string
  lat: number
  lng: number
  accepting: boolean
  cath_lab: boolean | null
  stroke_unit: boolean | null
  trauma_unit: boolean | null
  beds_free: number | null
  status_updated_at: string
}
interface Audit {
  partner_id: string | null
  actor: string
  action: string
  detail: string
  created_at: string
}
interface GeoHit {
  display_name: string
  lat: string
  lon: string
}

export default function AdminPartners() {
  const [key, setKey] = useState('')
  const [connected, setConnected] = useState(false)
  const [partners, setPartners] = useState<Partner[]>([])
  const [audit, setAudit] = useState<Audit[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<GeoHit[]>([])
  const [searching, setSearching] = useState(false)
  const [picked, setPicked] = useState<{ name: string; lat: number; lng: number } | null>(null)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState('')
  const keyRef = useRef('')

  const call = useCallback(async (body: any) => {
    const res = await fetch('/api/admin/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': keyRef.current },
      body: JSON.stringify(body),
    })
    if (res.status === 401) throw new Error('unauthorized')
    return res.json()
  }, [])

  const connect = async () => {
    setLoading(true)
    setError('')
    keyRef.current = key.trim()
    try {
      const json = await call({ op: 'list' })
      setPartners(json.partners)
      setAudit(json.audit)
      setConnected(true)
    } catch {
      setError(
        'Key not recognized. Set ADMIN_PORTAL_KEY in Vercel env, redeploy, then use that value here.',
      )
    }
    setLoading(false)
  }

  const refresh = async () => {
    try {
      const json = await call({ op: 'list' })
      setPartners(json.partners)
      setAudit(json.audit)
    } catch {}
  }

  const searchHospital = async () => {
    if (!query.trim()) return
    setSearching(true)
    setHits([])
    setPicked(null)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query.trim())}`,
      )
      const json = await res.json()
      setHits(json || [])
    } catch {
      setHits([])
    }
    setSearching(false)
  }

  const create = async () => {
    if (!picked) return
    setCreating(true)
    try {
      const json = await call({ op: 'create', name: picked.name, lat: picked.lat, lng: picked.lng })
      if (json.partner) {
        setPicked(null)
        setQuery('')
        setHits([])
        await refresh()
      }
    } catch {}
    setCreating(false)
  }

  const regen = async (id: string) => {
    try {
      await call({ op: 'regenerate', id })
      await refresh()
    } catch {}
  }
  const remove = async (id: string) => {
    if (!window.confirm('Remove this partner facility? Its board access stops immediately.')) return
    try {
      await call({ op: 'delete', id })
      await refresh()
    } catch {}
  }
  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied(''), 1500)
    } catch {}
  }
  const ago = (iso: string) => {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    return m < 1
      ? 'just now'
      : m < 60
        ? `${m}m ago`
        : m < 1440
          ? `${Math.floor(m / 60)}h ago`
          : `${Math.floor(m / 1440)}d ago`
  }

  if (!connected)
    return (
      <div style={{ minHeight: '100dvh', background: '#FFFFFF', padding: '0 24px' }}>
        <div style={{ maxWidth: '380px', margin: '0 auto', paddingTop: '96px' }}>
          <p
            style={{
              color: T3,
              fontFamily: MONO,
              fontSize: '10.5px',
              fontWeight: 700,
              letterSpacing: '1.6px',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            Relay · operations
          </p>
          <h1
            style={{
              color: T1,
              fontSize: '30px',
              fontWeight: 800,
              letterSpacing: '-1.1px',
              lineHeight: 1.1,
              marginBottom: '8px',
            }}
          >
            Partner network<span style={{ color: RED }}>.</span>
          </h1>
          <p style={{ color: T2, fontSize: '14px', lineHeight: 1.6, marginBottom: '30px' }}>
            Onboard hospitals, rotate access codes, and review the audit trail.
          </p>
          <p
            style={{
              color: T3,
              fontSize: '10.5px',
              fontWeight: 700,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              fontFamily: MONO,
              marginBottom: '8px',
            }}
          >
            Admin key
          </p>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && connect()}
            style={{
              width: '100%',
              background: '#FFFFFF',
              border: `1.5px solid ${BORDER}`,
              borderRadius: '14px',
              padding: '13px 16px',
              color: T1,
              fontSize: '15px',
              outline: 'none',
              fontFamily: MONO,
              marginBottom: '12px',
            }}
          />
          {error && (
            <p style={{ color: RED, fontSize: '13px', marginBottom: '10px', lineHeight: 1.5 }}>
              {error}
            </p>
          )}
          <button
            onClick={connect}
            disabled={loading || !key.trim()}
            style={{
              width: '100%',
              background: T1,
              color: 'white',
              fontWeight: 600,
              fontSize: '15px',
              padding: '15px',
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              minHeight: '52px',
              opacity: loading || !key.trim() ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Open operations'}
          </button>
        </div>
      </div>
    )

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#FFFFFF',
        maxWidth: '760px',
        margin: '0 auto',
        width: '100%',
        padding: '0 20px 60px',
      }}
    >
      <div style={{ paddingTop: '48px', marginBottom: '30px' }}>
        <div
          style={{
            borderTop: `3px solid ${T1}`,
            paddingTop: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <span
            style={{
              color: T1,
              fontFamily: MONO,
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '1.6px',
              textTransform: 'uppercase',
            }}
          >
            Partner network operations
          </span>
          <button
            onClick={refresh}
            style={{
              background: 'none',
              border: 'none',
              color: ACCENT,
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: 0,
            }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Onboard a facility ── */}
      <p
        style={{
          color: T3,
          fontFamily: MONO,
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '1.6px',
          textTransform: 'uppercase',
          marginBottom: '10px',
        }}
      >
        Onboard a facility
      </p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchHospital()}
          placeholder="Search the hospital. 'Lilavati Hospital Mumbai'"
          style={{
            flex: 1,
            background: '#FFFFFF',
            border: `1.5px solid ${BORDER}`,
            borderRadius: '14px',
            padding: '12px 14px',
            color: T1,
            fontSize: '14px',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={searchHospital}
          disabled={searching}
          aria-label="Search"
          style={{
            width: '46px',
            borderRadius: '14px',
            background: T1,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {searching ? (
            <Loader2 size={16} color="white" className="animate-spin" />
          ) : (
            <Search size={16} color="white" />
          )}
        </button>
      </div>
      {hits.length > 0 && !picked && (
        <div
          style={{
            border: `1px solid ${BORDER}`,
            borderRadius: '14px',
            overflow: 'hidden',
            marginBottom: '10px',
          }}
        >
          {hits.map((h, i) => (
            <button
              key={i}
              onClick={() =>
                setPicked({
                  name: h.display_name.split(',')[0],
                  lat: parseFloat(h.lat),
                  lng: parseFloat(h.lon),
                })
              }
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                borderBottom: i < hits.length - 1 ? `1px solid ${BORDER}` : 'none',
                padding: '11px 14px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <p style={{ color: T1, fontSize: '13.5px', fontWeight: 600 }}>
                {h.display_name.split(',')[0]}
              </p>
              <p
                style={{
                  color: T3,
                  fontSize: '11.5px',
                  marginTop: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {h.display_name}
              </p>
            </button>
          ))}
        </div>
      )}
      {picked && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            border: `1.5px solid ${ACCENT}`,
            borderRadius: '14px',
            padding: '12px 14px',
            marginBottom: '10px',
          }}
        >
          <div>
            <p style={{ color: T1, fontSize: '14px', fontWeight: 700 }}>{picked.name}</p>
            <p style={{ color: T3, fontSize: '11.5px', fontFamily: MONO, marginTop: '2px' }}>
              {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
            </p>
          </div>
          <button
            onClick={create}
            disabled={creating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              background: T1,
              color: 'white',
              fontWeight: 700,
              fontSize: '13.5px',
              padding: '11px 16px',
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Onboard
            + generate code
          </button>
        </div>
      )}
      <p style={{ color: T3, fontSize: '11.5px', lineHeight: 1.6, marginBottom: '34px' }}>
        Coordinates come from OpenStreetMap so dispatch matching (&lt;400m) works automatically.
        Share the generated code with the facility. They sign in at /hospital.
      </p>

      {/* ── Partners ── */}
      <p
        style={{
          color: T3,
          fontFamily: MONO,
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '1.6px',
          textTransform: 'uppercase',
          marginBottom: '4px',
        }}
      >
        Facilities · {partners.length}
      </p>
      <div style={{ borderTop: `1px solid ${T1}`, marginBottom: '34px' }}>
        {partners.length === 0 && (
          <p
            style={{
              color: T3,
              fontSize: '13.5px',
              padding: '14px 0',
              borderBottom: `1px solid ${BORDER}`,
            }}
          >
            No partner facilities yet.
          </p>
        )}
        {partners.map((p) => (
          <div key={p.id} style={{ padding: '14px 0', borderBottom: `1px solid ${BORDER}` }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ color: T1, fontSize: '15.5px', fontWeight: 800 }}>
                  {p.name}
                  <span
                    style={{
                      color: p.accepting ? GREEN : RED,
                      fontFamily: MONO,
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      marginLeft: '10px',
                    }}
                  >
                    {p.accepting ? 'accepting' : 'diverting'}
                  </span>
                </p>
                <p style={{ color: T3, fontSize: '11.5px', fontFamily: MONO, marginTop: '3px' }}>
                  {p.lat.toFixed(4)}, {p.lng.toFixed(4)} · status {ago(p.status_updated_at)}
                  {p.beds_free != null ? ` · ${p.beds_free} beds` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                <button
                  onClick={() => copy(p.access_code)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#FFFFFF',
                    border: `1px solid ${BORDER}`,
                    borderRadius: '14px',
                    padding: '7px 11px',
                    cursor: 'pointer',
                    fontFamily: MONO,
                    fontSize: '12px',
                    fontWeight: 700,
                    color: T1,
                  }}
                >
                  {copied === p.access_code ? (
                    <Check size={12} color={GREEN} />
                  ) : (
                    <Copy size={12} color={T3} />
                  )}
                  {p.access_code}
                </button>
                <button
                  onClick={() => regen(p.id)}
                  aria-label="Rotate code"
                  title="Rotate access code"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '14px',
                    border: `1px solid ${BORDER}`,
                    background: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RefreshCw size={13} color={T2} />
                </button>
                <button
                  onClick={() => remove(p.id)}
                  aria-label="Remove facility"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '14px',
                    border: `1px solid rgba(163,52,23,0.3)`,
                    background: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 size={13} color={RED} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Audit trail ── */}
      <p
        style={{
          color: T3,
          fontFamily: MONO,
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '1.6px',
          textTransform: 'uppercase',
          marginBottom: '4px',
        }}
      >
        Audit trail
      </p>
      <div style={{ borderTop: `1px solid ${T1}` }}>
        {audit.length === 0 && (
          <p
            style={{
              color: T3,
              fontSize: '13.5px',
              padding: '14px 0',
              borderBottom: `1px solid ${BORDER}`,
            }}
          >
            Nothing logged yet.
          </p>
        )}
        {audit.map((a, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '14px',
              padding: '10px 0',
              borderBottom: `1px solid ${BORDER}`,
              alignItems: 'baseline',
            }}
          >
            <span
              style={{
                color: T3,
                fontFamily: MONO,
                fontSize: '11px',
                flexShrink: 0,
                width: '64px',
              }}
            >
              {ago(a.created_at)}
            </span>
            <span
              style={{
                color: a.actor === 'admin' ? ACCENT : a.actor === 'facility' ? GREEN : RED,
                fontFamily: MONO,
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                flexShrink: 0,
                width: '58px',
              }}
            >
              {a.actor}
            </span>
            <span style={{ color: T2, fontSize: '13px', lineHeight: 1.5 }}>
              <strong style={{ color: T1, fontWeight: 700 }}>{a.action.replace(/_/g, ' ')}</strong>
              {a.detail ? `. ${a.detail}` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

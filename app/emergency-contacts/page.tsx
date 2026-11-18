'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Plus, X, Phone, User, Heart, Edit2 } from '@/lib/plain-icons'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from '@/components/BottomNav'
import Accordion from '@/components/Accordion'
import { AppHeader, Hero } from '@/components/AppKit'

const spring = { type: 'spring', stiffness: 380, damping: 24 } as const

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.75)',
  border: '1.5px solid rgba(20,20,19,0.14)',
  borderRadius: 10,
  padding: '14px 16px',
  color: '#141413',
  // 16px, not 15 or 14, and it is not a taste decision.
  fontSize: '16px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const RELATIONSHIPS = [
  'Spouse',
  'Partner',
  'Parent',
  'Child',
  'Sibling',
  'Friend',
  'Caregiver',
  'Other',
]

const AVATAR_COLORS = [
  { bg: 'rgba(86,128,78,0.15)', border: 'rgba(86,128,78,0.3)', text: '#42623C' },
  { bg: 'rgba(86,128,78,0.12)', border: 'rgba(86,128,78,0.25)', text: '#42623C' },
  { bg: 'rgba(240,120,0,0.12)', border: 'rgba(240,120,0,0.25)', text: '#8F4A00' },
  { bg: 'rgba(168,114,0,0.12)', border: 'rgba(168,114,0,0.25)', text: '#7C5200' },
  { bg: 'rgba(20,20,19,0.08)', border: 'rgba(20,20,19,0.18)', text: '#141413' },
]

export default function EmergencyContacts() {
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: 'Other' })
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('emergency_contacts')
        .eq('id', user.id)
        .single()
      setContacts(data?.emergency_contacts || [])
      setLoading(false)
    }
    load()
  }, [])

  const saveContacts = async (updated: any[]) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update({ emergency_contacts: updated })
      .eq('id', user.id)
    if (error) {
      toast.error('Could not save contacts. Try again')
      return false
    }
    return true
  }

  const addContact = async () => {
    if (!newContact.name.trim()) {
      toast.error('Please enter a name')
      return
    }
    if (!newContact.phone.trim()) {
      toast.error('Please enter a phone number')
      return
    }
    setSaving(true)
    const updated = [...contacts, { ...newContact, id: Date.now().toString() }]
    const ok = await saveContacts(updated)
    if (ok) {
      setContacts(updated)
      setNewContact({ name: '', phone: '', relationship: 'Other' })
      setShowAdd(false)
      toast.success('Contact added')
    }
    setSaving(false)
  }

  const removeContact = async (id: string) => {
    const name = contacts.find((c) => c.id === id)?.name || 'this contact'
    if (!window.confirm(`Remove ${name}? They won't be notified in emergencies.`)) return
    const updated = contacts.filter((c) => c.id !== id)
    const ok = await saveContacts(updated)
    if (ok) {
      setContacts(updated)
      toast.success('Contact removed')
    }
  }

  if (loading)
    return (
      <div style={{ minHeight: '100dvh', background: 'transparent', padding: '80px 16px 100px' }}>
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            style={{
              height: '72px',
              borderRadius: 0,
              background: '#F2F0E8',
              marginBottom: '10px',
            }}
          />
        ))}
      </div>
    )

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: '112px', maxWidth: '640px', margin: '0 auto', padding: '0 16px 112px' }}>
      <AppHeader
        title="Emergency contacts"
        back="/settings"
        backLabel="Settings"
        right={
          contacts.length > 0 ? (
            <button onClick={() => setShowAdd(true)} className="ds-btn ds-btn-sos" style={{ height: '42px', padding: '0 14px', borderRadius: 8, border: 0, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} color="#141413" /> Add
            </button>
          ) : null
        }
      />

      <Hero>
        <span className="ak-kicker">When you press SOS</span>
        <p style={{ fontSize: '21px', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2, marginTop: '6px' }}>
          {contacts.length === 0
            ? 'Add one person you trust so you can reach them in one tap.'
            : `One tap texts ${contacts.length === 1 ? 'this person' : `all ${contacts.length} of them`} at once.`}
        </p>
      </Hero>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <AnimatePresence>
          {contacts.map((contact, idx) => {
            const color = AVATAR_COLORS[idx % AVATAR_COLORS.length]
            const initial = contact.name?.[0]?.toUpperCase() || '?'
            return (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass"
                style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}
              >
                <div style={{ width: '46px', height: '46px', borderRadius: 10, background: color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: color.text, fontWeight: 900, fontSize: '19px' }}>{initial}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#141413', fontWeight: 800, fontSize: '17px', letterSpacing: '-0.02em' }}>{contact.name}</p>
                  <p style={{ color: '#3F3D36', fontSize: '13.5px', marginTop: '2px' }}>
                    {contact.relationship} · {contact.phone}
                  </p>
                </div>
                <a href={`tel:${contact.phone}`} aria-label={`Call ${contact.name}`} style={{ height: '42px', padding: '0 14px', borderRadius: 8, background: '#2F5233', color: '#fff', fontWeight: 750, fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  Call
                </a>
                <button onClick={() => removeContact(contact.id)} aria-label={`Remove ${contact.name}`} style={{ width: '42px', height: '42px', borderRadius: 8, background: 'rgba(20,20,19,0.06)', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X size={16} color="#3F3D36" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {contacts.length === 0 && !showAdd && (
          <button className="ds-btn ds-btn-sos" onClick={() => setShowAdd(true)} style={{ minHeight: '56px', borderRadius: 10, border: 0, fontWeight: 800, fontSize: '16px', cursor: 'pointer' }}>
            Add your first contact
          </button>
        )}

        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="glass glass-strong"
              style={{ padding: '18px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <p style={{ color: '#141413', fontWeight: 800, fontSize: '19px', letterSpacing: '-0.02em' }}>New contact</p>
                <button onClick={() => setShowAdd(false)} aria-label="Close" style={{ width: '38px', height: '38px', borderRadius: 8, background: 'rgba(20,20,19,0.06)', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} color="#141413" />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input style={inputStyle} placeholder="Their name" value={newContact.name} onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))} autoFocus />
                <input type="tel" inputMode="tel" style={inputStyle} placeholder="Phone number" value={newContact.phone} onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value }))} />
                <p style={{ fontSize: '13.5px', fontWeight: 700, color: '#3F3D36', marginTop: '4px' }}>Who are they to you?</p>
                <div className="med-chips" style={{ marginTop: 0 }}>
                  {RELATIONSHIPS.map((r) => (
                    <button key={r} className="ak-chip" data-on={newContact.relationship === r} onClick={() => setNewContact((p) => ({ ...p, relationship: r }))}>
                      {r}
                    </button>
                  ))}
                </div>
                <button
                  onClick={addContact}
                  disabled={saving}
                  className="ds-btn ds-btn-sos"
                  style={{ minHeight: '54px', borderRadius: 10, border: 0, fontWeight: 800, fontSize: '16px', cursor: saving ? 'not-allowed' : 'pointer', marginTop: '6px', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Saving…' : 'Save contact'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="glass" style={{ padding: '4px', marginTop: '4px' }}>
          <Accordion title="What they get" hint="A text that is already written for you">
            <p style={{ fontSize: '14px', color: '#3F3D36', lineHeight: 1.55, padding: '0 10px' }}>
              During SOS, one button opens a text to everyone on this list, already written. It says what is happening
              and which hospital you are heading to, with directions. You press send. Keep this list up to date.
            </p>
          </Accordion>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

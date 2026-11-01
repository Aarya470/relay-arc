'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Plus, X, Phone, User, Heart, Edit2 } from '@/lib/plain-icons'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from '@/components/BottomNav'

const spring = { type: 'spring', stiffness: 380, damping: 24 } as const

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#FFFFFF',
  border: '1px solid #D8D4C8',
  borderRadius: 0,
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
  { bg: 'rgba(163,52,23,0.12)', border: 'rgba(163,52,23,0.25)', text: '#A33417' },
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
      <div style={{ minHeight: '100dvh', background: '#B3DDAC', padding: '80px 16px 100px' }}>
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
    <div style={{ minHeight: '100dvh', background: '#B3DDAC', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 20px', borderBottom: '1px solid #98C890' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            transition={spring}
            onClick={() => router.back()}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 0,
              background: '#F2F0E8',
              border: '1px solid #D8D4C8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={15} color="#5C5A52" />
          </motion.button>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                color: '#141413',
                fontWeight: 900,
                fontSize: '20px',
                letterSpacing: '-0.7px',
              }}
            >
              Emergency Contacts
            </h1>
            <p style={{ color: '#5C5A52', fontSize: '12px' }}>
              Notified automatically in an emergency
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAdd(true)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 0,
              background: 'rgba(86,128,78,0.15)',
              border: '1px solid rgba(86,128,78,0.3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={17} color="#42623C" />
          </motion.button>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Info banner */}
        <div
          style={{
            background: 'rgba(163,52,23,0.06)',
            border: '1px solid rgba(163,52,23,0.18)',
            borderRadius: 0,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            marginBottom: '4px',
          }}
        >
          <Heart size={14} color="#A33417" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ color: '#5C5A52', fontSize: '12px', lineHeight: 1.6 }}>
            These contacts will receive an automatic notification when you trigger an SOS. Keep this
            list up to date.
          </p>
        </div>

        {/* Contacts list */}
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
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #98C890',
                  borderRadius: 0,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                {/* Avatar initial */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: color.bg,
                    border: `1.5px solid ${color.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ color: color.text, fontWeight: 700, fontSize: '16px' }}>
                    {initial}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#141413', fontWeight: 600, fontSize: '14px' }}>
                    {contact.name}
                  </p>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}
                  >
                    <span style={{ color: '#5C5A52', fontSize: '12px' }}>
                      {contact.relationship}
                    </span>
                    <span style={{ color: '#5C5A52', fontSize: '12px' }}>·</span>
                    <motion.a
                      href={`tel:${contact.phone}`}
                      whileTap={{ scale: 0.96 }}
                      style={{
                        color: '#42623C',
                        fontSize: '12px',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Phone size={10} color="#42623C" />
                      {contact.phone}
                    </motion.a>
                  </div>
                </div>
                {/* Ghost icon buttons */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={() => removeContact(contact.id)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 0,
                      background: '#F2F0E8',
                      border: '1px solid #D8D4C8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <X size={13} color="#5C5A52" />
                  </motion.button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {contacts.length === 0 && !showAdd && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ color: '#5C5A52', fontSize: '14px', marginBottom: '16px' }}>
              No emergency contacts yet
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowAdd(true)}
              style={{
                background: '#42623C',
                color: 'white',
                fontWeight: 700,
                fontSize: '13px',
                padding: '12px 22px',
                borderRadius: 0,
                border: 'none',
                cursor: 'pointer',
                height: '44px',
              }}
            >
              Add your first contact
            </motion.button>
          </div>
        )}

        {/* Add contact — full-width dark card with dashed border */}
        {!showAdd && contacts.length > 0 && (
          <motion.button
            whileTap={{ scale: 0.99 }}
            onClick={() => setShowAdd(true)}
            style={{
              width: '100%',
              background: 'transparent',
              border: '1.5px dashed #C9CED6',
              borderRadius: 0,
              padding: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              color: '#5C5A52',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            <Plus size={15} color="#5C5A52" />
            Add emergency contact
          </motion.button>
        )}

        {/* Add contact form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(86,128,78,0.2)',
                borderRadius: 0,
                padding: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                }}
              >
                <p style={{ color: '#141413', fontWeight: 700, fontSize: '15px' }}>New contact</p>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setShowAdd(false)}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: 0,
                    background: '#F2F0E8',
                    border: '1px solid #D8D4C8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={13} color="#5C5A52" />
                </motion.button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  style={inputStyle}
                  placeholder="Full name"
                  value={newContact.name}
                  onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))}
                  autoFocus
                />
                <input
                  type="tel"
                  style={inputStyle}
                  placeholder="Phone number"
                  value={newContact.phone}
                  onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value }))}
                />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {RELATIONSHIPS.map((r) => (
                    <motion.button
                      key={r}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setNewContact((p) => ({ ...p, relationship: r }))}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 0,
                        border: '1px solid',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background:
                          newContact.relationship === r ? 'rgba(86,128,78,0.15)' : '#F2F0E8',
                        borderColor:
                          newContact.relationship === r ? 'rgba(86,128,78,0.4)' : '#98C890',
                        color: newContact.relationship === r ? '#42623C' : '#5C5A52',
                      }}
                    >
                      {r}
                    </motion.button>
                  ))}
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={addContact}
                  disabled={saving}
                  className="sh-slant" style={{
                    background: '#42623C',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '14px',
                    padding: '0 20px',
                    borderRadius: 0,
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    marginTop: '4px',
                    height: '52px',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Saving…' : 'Add contact'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  )
}

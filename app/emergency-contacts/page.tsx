'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Plus, X, Phone, User, Heart, Edit2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from '@/components/BottomNav'

const spring = { type: 'spring', stiffness: 380, damping: 24 } as const

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#FFFFFF',
  border: '1px solid #D5D9E0',
  borderRadius: '12px',
  padding: '14px 16px',
  color: '#0E1218',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const RELATIONSHIPS = ['Spouse', 'Partner', 'Parent', 'Child', 'Sibling', 'Friend', 'Caregiver', 'Other']

const AVATAR_COLORS = [
  { bg: 'rgba(0,85,255,0.15)', border: 'rgba(0,85,255,0.3)', text: '#0055FF' },
  { bg: 'rgba(0,122,68,0.12)', border: 'rgba(0,122,68,0.25)', text: '#007A44' },
  { bg: 'rgba(217,20,20,0.12)', border: 'rgba(217,20,20,0.25)', text: '#D91414' },
  { bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.25)', text: '#A855F7' },
  { bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.25)', text: '#FB923C' },
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('emergency_contacts').eq('id', user.id).single()
      setContacts(data?.emergency_contacts || [])
      setLoading(false)
    }
    load()
  }, [])

  const saveContacts = async (updated: any[]) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update({ emergency_contacts: updated }).eq('id', user.id)
    if (error) {
      toast.error('Could not save contacts — try again')
      return false
    }
    return true
  }

  const addContact = async () => {
    if (!newContact.name.trim()) { toast.error('Please enter a name'); return }
    if (!newContact.phone.trim()) { toast.error('Please enter a phone number'); return }
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
    const name = contacts.find(c => c.id === id)?.name || 'this contact'
    if (!window.confirm(`Remove ${name}? They won't be notified in emergencies.`)) return
    const updated = contacts.filter(c => c.id !== id)
    const ok = await saveContacts(updated)
    if (ok) {
      setContacts(updated)
      toast.success('Contact removed')
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#F4F5F7', padding: '80px 16px 100px' }}>
      {[1,2,3].map(i => <Skeleton key={i} style={{ height: '72px', borderRadius: '16px', background: '#ECEEF2', marginBottom: '10px' }}/>)}
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: '#F4F5F7', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 20px', borderBottom: '1px solid #E3E6EC' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            transition={spring}
            onClick={() => router.back()}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ECEEF2', border: '1px solid #D5D9E0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={15} color="#5B6371"/>
          </motion.button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: '#0E1218', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.7px' }}>Emergency Contacts</h1>
            <p style={{ color: '#5B6371', fontSize: '12px' }}>Notified automatically in an emergency</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAdd(true)}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,85,255,0.15)', border: '1px solid rgba(0,85,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={17} color="#0055FF"/>
          </motion.button>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {/* Info banner */}
        <div style={{ background: 'rgba(217,20,20,0.06)', border: '1px solid rgba(217,20,20,0.18)', borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '4px' }}>
          <Heart size={14} color="#D91414" style={{ flexShrink: 0, marginTop: '2px' }}/>
          <p style={{ color: '#5B6371', fontSize: '12px', lineHeight: 1.6 }}>
            These contacts will receive an automatic notification when you trigger an SOS. Keep this list up to date.
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
                style={{ background: '#FFFFFF', border: '1px solid #E3E6EC', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                {/* Avatar initial */}
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: color.bg, border: `1.5px solid ${color.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: color.text, fontWeight: 700, fontSize: '16px' }}>{initial}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#0E1218', fontWeight: 600, fontSize: '14px' }}>{contact.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <span style={{ color: '#9AA2AD', fontSize: '12px' }}>{contact.relationship}</span>
                    <span style={{ color: '#9AA2AD', fontSize: '12px' }}>·</span>
                    <motion.a
                      href={`tel:${contact.phone}`}
                      whileTap={{ scale: 0.96 }}
                      style={{ color: '#0055FF', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <Phone size={10} color="#0055FF"/>
                      {contact.phone}
                    </motion.a>
                  </div>
                </div>
                {/* Ghost icon buttons */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={() => removeContact(contact.id)}
                    style={{ width: '32px', height: '32px', borderRadius: '9px', background: '#ECEEF2', border: '1px solid #D5D9E0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    <X size={13} color="#5B6371"/>
                  </motion.button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {contacts.length === 0 && !showAdd && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(217,20,20,0.08)', border: '1px solid rgba(217,20,20,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <User size={22} color="rgba(217,20,20,0.5)"/>
            </div>
            <p style={{ color: '#5B6371', fontSize: '14px', marginBottom: '16px' }}>No emergency contacts yet</p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowAdd(true)}
              style={{ background: '#0055FF', color: 'white', fontWeight: 700, fontSize: '13px', padding: '12px 22px', borderRadius: '14px', border: 'none', cursor: 'pointer', height: '44px' }}
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
            style={{ width: '100%', background: 'transparent', border: '1.5px dashed #C9CED6', borderRadius: '16px', padding: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', color: '#9AA2AD', fontSize: '14px', fontWeight: 500 }}
          >
            <Plus size={15} color="#9AA2AD"/>
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
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,85,255,0.2)', borderRadius: '20px', padding: '20px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <p style={{ color: '#0E1218', fontWeight: 700, fontSize: '15px' }}>New contact</p>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setShowAdd(false)}
                  style={{ width: '30px', height: '30px', borderRadius: '9px', background: '#ECEEF2', border: '1px solid #D5D9E0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={13} color="#5B6371"/>
                </motion.button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  style={inputStyle}
                  placeholder="Full name"
                  value={newContact.name}
                  onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))}
                  autoFocus
                />
                <input
                  type="tel"
                  style={inputStyle}
                  placeholder="Phone number"
                  value={newContact.phone}
                  onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))}
                />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {RELATIONSHIPS.map(r => (
                    <motion.button
                      key={r}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setNewContact(p => ({ ...p, relationship: r }))}
                      style={{
                        padding: '6px 12px', borderRadius: '99px', border: '1px solid',
                        fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        background: newContact.relationship === r ? 'rgba(0,85,255,0.15)' : '#ECEEF2',
                        borderColor: newContact.relationship === r ? 'rgba(0,85,255,0.4)' : '#E3E6EC',
                        color: newContact.relationship === r ? '#0055FF' : '#9AA2AD',
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
                  style={{ background: '#0055FF', color: 'white', fontWeight: 700, fontSize: '14px', padding: '0 20px', borderRadius: '14px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', marginTop: '4px', height: '52px', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Saving…' : 'Add contact'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <BottomNav/>
    </div>
  )
}

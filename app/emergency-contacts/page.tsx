'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Plus, X, Phone, User, Heart } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from '@/components/BottomNav'

const spring = { type: 'spring', stiffness: 380, damping: 24 } as const

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#F8F6F2', border: '1.5px solid rgba(26,40,32,0.1)',
  borderRadius: '12px', padding: '12px 14px', color: '#1A2820', fontSize: '14px',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

const RELATIONSHIPS = ['Spouse', 'Partner', 'Parent', 'Child', 'Sibling', 'Friend', 'Caregiver', 'Other']

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
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', padding: '80px 16px 100px' }}>
      {[1,2,3].map(i => <Skeleton key={i} style={{ height: '72px', borderRadius: '16px', background: 'rgba(26,40,32,0.06)', marginBottom: '10px' }}/>)}
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', paddingBottom: '100px' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 20px', borderBottom: '1px solid rgba(26,40,32,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            transition={spring}
            onClick={() => router.push('/settings')}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.09)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(26,40,32,0.06)' }}
          >
            <ArrowLeft size={15} color="rgba(26,40,32,0.5)"/>
          </motion.button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: '#1A2820', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.7px' }}>Emergency Contacts</h1>
            <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '12px' }}>Notified automatically in an emergency</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAdd(true)}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #5C8B74, #3D6B58)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(92,139,116,0.25)' }}
          >
            <Plus size={17} color="white"/>
          </motion.button>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {/* Info banner */}
        <div style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '4px' }}>
          <Heart size={14} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }}/>
          <p style={{ color: 'rgba(26,40,32,0.58)', fontSize: '12px', lineHeight: 1.6 }}>
            These contacts will receive an automatic notification when you trigger an SOS. Keep this list up to date.
          </p>
        </div>

        {/* Contacts list */}
        <AnimatePresence>
          {contacts.map(contact => (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{ background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.07)', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 8px rgba(26,40,32,0.04)' }}
            >
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={16} color="#DC2626"/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#1A2820', fontWeight: 600, fontSize: '14px' }}>{contact.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <span style={{ color: 'rgba(26,40,32,0.35)', fontSize: '12px' }}>{contact.relationship}</span>
                  <span style={{ color: 'rgba(26,40,32,0.2)', fontSize: '12px' }}>·</span>
                  <motion.a
                    href={`tel:${contact.phone}`}
                    whileTap={{ scale: 0.96 }}
                    style={{ color: '#5C8B74', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Phone size={10} color="#5C8B74"/>
                    {contact.phone}
                  </motion.a>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => removeContact(contact.id)}
                style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(26,40,32,0.04)', border: '1px solid rgba(26,40,32,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <X size={12} color="rgba(26,40,32,0.4)"/>
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>

        {contacts.length === 0 && !showAdd && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <User size={20} color="rgba(220,38,38,0.5)"/>
            </div>
            <p style={{ color: 'rgba(26,40,32,0.3)', fontSize: '14px', marginBottom: '12px' }}>No emergency contacts yet</p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowAdd(true)}
              style={{ background: 'linear-gradient(135deg, #5C8B74, #3D6B58)', color: 'white', fontWeight: 700, fontSize: '13px', padding: '12px 22px', borderRadius: '12px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(92,139,116,0.22)' }}
            >
              Add your first contact
            </motion.button>
          </div>
        )}

        {/* Add contact form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{ background: '#FFFFFF', border: '1.5px solid rgba(92,139,116,0.25)', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 20px rgba(26,40,32,0.08)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <p style={{ color: '#1A2820', fontWeight: 700, fontSize: '15px' }}>New contact</p>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setShowAdd(false)}
                  style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(26,40,32,0.05)', border: '1px solid rgba(26,40,32,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={12} color="rgba(26,40,32,0.4)"/>
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
                        background: newContact.relationship === r ? 'rgba(92,139,116,0.12)' : 'transparent',
                        borderColor: newContact.relationship === r ? 'rgba(92,139,116,0.4)' : 'rgba(26,40,32,0.12)',
                        color: newContact.relationship === r ? '#3D6B58' : 'rgba(26,40,32,0.45)',
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
                  style={{ background: 'linear-gradient(135deg, #5C8B74, #3D6B58)', color: 'white', fontWeight: 700, fontSize: '14px', padding: '13px', borderRadius: '14px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', marginTop: '4px', boxShadow: '0 4px 14px rgba(92,139,116,0.22)' }}
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

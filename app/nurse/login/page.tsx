'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Mail, Lock } from 'lucide-react'

const NURSE_CODE = 'relay-nurse-2026'

export default function NurseLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    if (code !== NURSE_CODE) {
      toast.error('Invalid care team access code')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) toast.error(error.message)
    else {
      toast.success('Welcome to the care team dashboard')
      router.push('/nurse')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] px-6 py-12 flex flex-col">

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => router.push('/login')}
        className="w-9 h-9 rounded-xl bg-[#ECEEF2] flex items-center justify-center mb-10 self-start"
      >
        <ArrowLeft size={16} className="text-[#5B6371]"/>
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1"
      >
        <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center mb-6">
          
        </div>

        <h1 className="text-[#0E1218] text-3xl font-bold mb-1">Care team login</h1>
        <p className="text-[#9AA2AD] text-sm mb-8">Access requires a valid care team code</p>

        <div className="space-y-3">
          <div className="relative">
            <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA2AD]"/>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white border border-[#E3E6EC] rounded-2xl pl-11 pr-4 py-4 text-[#0E1218] placeholder-[#9AA2AD] outline-none focus:border-blue-500/40 transition text-sm"
            />
          </div>

          <div className="relative">
            <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA2AD]"/>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white border border-[#E3E6EC] rounded-2xl pl-11 pr-4 py-4 text-[#0E1218] placeholder-[#9AA2AD] outline-none focus:border-blue-500/40 transition text-sm"
            />
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA2AD] text-sm">🔑</span>
            <input
              type="password"
              placeholder="Care team access code"
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full bg-white border border-[#E3E6EC] rounded-2xl pl-11 pr-4 py-4 text-[#0E1218] placeholder-[#9AA2AD] outline-none focus:border-blue-500/40 transition text-sm"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-500 transition mt-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin"/> : 'Access care dashboard'}
          </motion.button>
        </div>

        <p className="text-[#C2C7D0] text-xs text-center mt-6">
          Access code: <span className="font-mono">relay-nurse-2026</span>
        </p>
      </motion.div>
    </div>
  )
}

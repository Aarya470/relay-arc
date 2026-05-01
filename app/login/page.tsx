'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAuth = async () => {
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }
    setLoading(true)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) toast.error(error.message)
      else {
        toast.success('Account created!')
        router.push('/onboarding')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) toast.error(error.message)
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#09090C] flex flex-col px-6 py-12">

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="flex items-center gap-2.5 mb-1">
          <div className="flex gap-1">
            <div className="w-4 h-4 rotate-45 rounded-sm bg-[#fcb546]"/>
            <div className="w-4 h-4 rotate-45 rounded-sm border-2 border-[#80EF80] bg-transparent -ml-2"/>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Relay Arc</span>
        </div>
        <p className="text-white/40 text-xs tracking-widest uppercase font-mono ml-10">Cardiac Emergency Platform</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1"
      >
        <h1 className="text-3xl font-bold text-white mb-1">
          {isSignUp ? 'Create account' : 'Welcome back'}
        </h1>
        <p className="text-white/40 text-sm mb-8">
          {isSignUp ? 'Join Relay Arc today' : 'Sign in to continue'}
        </p>

        <div className="space-y-3">
          {/* Email */}
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"/>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              className="w-full bg-[#18181F] border border-white/8 rounded-2xl pl-11 pr-4 py-4 text-white placeholder-white/25 outline-none focus:border-[#fcb546]/50 focus:bg-[#1C1C24] transition text-sm"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"/>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              className="w-full bg-[#18181F] border border-white/8 rounded-2xl pl-11 pr-4 py-4 text-white placeholder-white/25 outline-none focus:border-[#fcb546]/50 focus:bg-[#1C1C24] transition text-sm"
            />
          </div>

          {/* Submit */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleAuth}
            disabled={loading}
            className="w-full bg-[#fcb546] text-black font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#f5a832] transition mt-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin"/>
            ) : (
              <>
                {isSignUp ? 'Create account' : 'Sign in'}
                <ArrowRight size={16}/>
              </>
            )}
          </motion.button>
        </div>

        {/* Toggle */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-white/40 text-sm hover:text-white/70 transition"
          >
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <span className="text-[#fcb546]">{isSignUp ? 'Sign in' : 'Sign up'}</span>
          </button>
        </div>

        {/* Nurse login */}
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/nurse/login')}
            className="text-white/25 text-xs hover:text-white/50 transition"
          >
            Care team login →
          </button>
        </div>
      </motion.div>

      {/* Bottom tagline */}
      <p className="text-white/20 text-xs text-center font-mono tracking-wider">
        WHEN EVERY MINUTE IS THE MARGIN
      </p>
    </div>
  )
}

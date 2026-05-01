'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single()
        router.push(data ? '/dashboard' : '/onboarding')
      }
    }
    check()
  }, [])

  return (
    <div className="min-h-screen bg-[#09090C] flex flex-col px-6 py-16">

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-2.5 mb-2"
      >
        <div className="flex gap-1 items-center">
          <div className="w-4 h-4 rotate-45 rounded-sm bg-[#fcb546]"/>
          <div className="w-4 h-4 rotate-45 rounded-sm border-2 border-[#80EF80] -ml-2"/>
        </div>
        <span className="text-white font-bold text-xl tracking-tight">Relay Arc</span>
      </motion.div>

      <div className="flex-1 flex flex-col justify-center">

        {/* Hero text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-10"
        >
          <h1 className="text-white text-4xl font-bold leading-tight tracking-tight mb-4">
            When every<br/>
            <span className="text-[#fcb546]">minute</span> is<br/>
            the margin.
          </h1>
          <p className="text-white/40 text-sm leading-relaxed max-w-xs">
            Cardiac emergency routing that finds the right hospital, alerts the ER before you arrive, and navigates you there — free.
          </p>
        </motion.div>

        {/* RE·ACT RE·ROUTE RE·COVER */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex gap-4 mb-10"
        >
          {[
            { pre: 'RE·', word: 'ACT', color: 'text-[#fcb546]' },
            { pre: 'RE·', word: 'ROUTE', color: 'text-white' },
            { pre: 'RE·', word: 'COVER', color: 'text-[#80EF80]' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <p className="font-mono text-xs font-bold">
                <span className="text-white/20">{item.pre}</span>
                <span className={item.color}>{item.word}</span>
              </p>
            </div>
          ))}
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/login?signup=true')}
            className="w-full bg-[#fcb546] text-black font-semibold py-4 rounded-2xl text-base"
            style={{ boxShadow: '0 8px 24px rgba(252,181,70,0.25)' }}
          >
            Get started
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/login')}
            className="w-full bg-white/6 border border-white/8 text-white font-semibold py-4 rounded-2xl text-base"
          >
            Sign in
          </motion.button>
        </motion.div>

      </div>

      {/* Bottom */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-white/15 text-xs text-center font-mono tracking-widest"
      >
        relay-arc.org
      </motion.p>

    </div>
  )
}

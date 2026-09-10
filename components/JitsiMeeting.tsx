'use client'
import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

declare global {
  interface Window { JitsiMeetExternalAPI: any }
}

interface Props {
  roomId: string
  displayName: string
  onEnd: () => void
}

export default function JitsiMeeting({ roomId, displayName, onEnd }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<any>(null)
  const firedRef = useRef(false)

  const handleEnd = () => {
    if (firedRef.current) return
    firedRef.current = true
    try { apiRef.current?.dispose() } catch {}
    onEnd()
  }

  useEffect(() => {
    const init = () => {
      if (!containerRef.current || !window.JitsiMeetExternalAPI) return
      apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName: `relayarc-${roomId}`,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
        },
      })
      apiRef.current.addEventListener('videoConferenceLeft', handleEnd)
      apiRef.current.addEventListener('readyToClose', handleEnd)
    }

    if (window.JitsiMeetExternalAPI) {
      init()
    } else {
      const script = document.createElement('script')
      script.src = 'https://meet.jit.si/external_api.js'
      script.onload = init
      document.head.appendChild(script)
    }

    return () => {
      try { apiRef.current?.dispose() } catch {}
    }
  }, [roomId])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#000', display: 'flex', flexDirection: 'column' }}
    >
      <div ref={containerRef} style={{ flex: 1 }} />
      <button
        onClick={handleEnd}
        // The only way out of a fullscreen video call, and it was announced as
        // "button" with no name.
        aria-label="Leave this call"
        style={{
          position: 'absolute', top: 16, left: 16, zIndex: 201,
          background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '50%', width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <X size={18} color="white" />
      </button>
    </motion.div>
  )
}

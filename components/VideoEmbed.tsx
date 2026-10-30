'use client'
// The App Challenge demo video. Shows YouTube's thumbnail with a play button and
// only loads the player when someone taps it, so the homepage stays fast and no
// YouTube cookies are set for visitors who never press play (youtube-nocookie).
import { useState } from 'react'

export default function VideoEmbed({ id, title }: { id: string; title: string }) {
  const [play, setPlay] = useState(false)
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        background: '#141413',
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1px solid rgba(20,20,19,0.18)',
      }}
    >
      {play ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      ) : (
        <button
          onClick={() => setPlay(true)}
          aria-label={`Play video: ${title}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 0,
            padding: 0,
            cursor: 'pointer',
            background: '#141413',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`}
            alt=""
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              opacity: 0.92,
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%,-50%)',
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              background: '#A33417',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
            }}
          >
            <svg width="30" height="34" viewBox="0 0 30 34" aria-hidden="true">
              <path d="M2 2 L28 17 L2 32 Z" fill="#FFFFFF" />
            </svg>
          </span>
        </button>
      )}
    </div>
  )
}

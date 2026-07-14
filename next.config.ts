import type { NextConfig } from 'next'

const securityHeaders = [
  // Force HTTPS for 2 years, including subdomains
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Minimal referrer info sent to third parties
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Lock down browser features
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
  // Legacy XSS protection for older browsers
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // unsafe-inline + unsafe-eval required by Next.js hydration and some map/video libraries
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.jit.si https://8x8.vc",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co https://*.openstreetmap.org https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://*.jit.si",
      // api.groq.com removed — all Groq calls are now server-side (API routes), not from the browser
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.jit.si wss://*.jit.si https://8x8.vc https://nominatim.openstreetmap.org https://router.project-osrm.org https://routing.openstreetmap.de https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://tiles.openfreemap.org",
      "frame-src 'self' https://*.jit.si https://8x8.vc",
      "media-src 'self' blob: https://*.jit.si",
      "worker-src 'self' blob:",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig

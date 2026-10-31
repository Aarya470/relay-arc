'use client'
// Plain-text stand-ins for the lucide-react icons. next.config.ts points the
// 'lucide-react' import here, so the whole site shows no pictogram icons. Where an
// icon carried meaning on its own (close, show password, send) it becomes a short
// word or character; purely decorative icons render nothing.
import type { CSSProperties } from 'react'

type P = { className?: string; style?: CSSProperties; color?: string; [k: string]: unknown }

const text = (t: string) =>
  function TextIcon({ className, style, color }: P) {
    return (
      <span
        className={className}
        style={{ color, fontWeight: 600, lineHeight: 1, ...style }}
        aria-hidden
      >
        {t}
      </span>
    )
  }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const none = (_p: P) => null

export const Activity = none
export const AlertCircle = none
export const AlertTriangle = none
export const ArrowLeft = text('←')
export const ArrowRight = text('→')
export const Battery = none
export const Brain = none
export const Calendar = none
export const Car = none
export const Check = text('✓')
export const CheckCheck = none
export const CheckCircle = none
export const CheckCircle2 = none
export const ChevronDown = none
export const ChevronLeft = text('←')
export const ChevronRight = none
export const Circle = none
export const Clock = none
export const Copy = none
export const Crosshair = none
export const Download = none
export const Droplets = none
export const Edit2 = none
export const ExternalLink = none
export const Eye = text('Show')
export const EyeOff = text('Hide')
export const Hand = none
export const Heart = none
export const HeartPulse = none
export const History = none
export const Home = none
export const Info = none
export const KeyRound = none
export const LayoutList = text('Steps')
export const List = text('Steps')
export function Loader2({ style, color }: P) {
  // No spinning: just a quiet ellipsis while something loads.
  return (
    <span style={{ color, ...style }} aria-label="Loading">
      …
    </span>
  )
}
export const Lock = none
export const Mail = none
export const MailCheck = none
export const MapPin = none
export const MessageCircle = none
export const MessageSquare = none
export const Minus = text('−')
export const Navigation = none
export const Phone = none
export const Pill = none
export const Play = none
export const Plus = text('+')
export const Printer = none
export const QrCode = none
export const RefreshCw = none
export const Save = none
export const Scale = none
export const Search = text('Go')
export const Send = text('Send')
export const Sparkles = none
export const Square = none
export const Trash2 = none
export const User = none
export const Video = none
export const Volume2 = text('Sound')
export const VolumeX = text('Muted')
export const Watch = none
export const Wind = none
export const X = text('×')
export const XIcon = text('×')
export const Zap = none
export const Bell = none
export const CalendarCheck = none
export const CircleCheckIcon = none
export const FileText = none
export const Flame = none
export const InfoIcon = none
export const Loader2Icon = none
export const LogOut = none
export const Mic = none
export const OctagonXIcon = none
export const Settings = text('Settings')
export const Share2 = none
export const Shield = none
export const Star = none
export const Stethoscope = none
export const TrendingDown = none
export const TrendingUp = none
export const TriangleAlertIcon = none
export const Users = none
export const Navigation2 = none

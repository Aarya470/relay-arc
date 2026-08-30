// The Relay Arc mark.
//
// WHY THIS REPLACED A HEART ICON
// Every screen was drawing `<Heart>` from lucide-react inside an orange square.
// A generic heart glyph is the single most used icon in consumer health, so it
// identified the app as "a health app" and nothing more — and it appeared beside
// the words "Relay Arc" everywhere, which meant the brand was a stock icon plus
// a label. The monogram is the actual mark and it is already on the social
// accounts, so the app was the only surface not using it.
//
// WHY IT IS INLINE SVG AND NOT THE PNG
// It renders at 22-26px in a header. A raster asset at that size is either
// blurry or an oversized download, it cannot inherit colour, and it flashes in
// after the rest of the header paints. Inline SVG has none of those problems and
// costs no request.
//
// WHY THE LETTERS ARE INK ON ORANGE
// #D97757 measures 2.96:1 on cream, which fails even the 3:1 large-text bar, so
// Claude orange is a fill colour only and always carries dark ink on top, where
// it reaches 5.90:1. The rule is stated in globals.css; this is one of the places
// it applies.
type Props = {
  /** Rendered size in px. The mark is square. */
  size?: number
  /** Corner rounding as a fraction of size. 0 gives a hard square. */
  radius?: number
  className?: string
}

const ORANGE = '#D97757'
const INK = '#141413'

export default function Mark({ size = 26, radius = 0.28, className }: Props) {
  const r = 100 * radius
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Relay Arc"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <rect width="100" height="100" rx={r} ry={r} fill={ORANGE} />
      {/* textLength pins the glyph width so the mark is identical whether or not
          the brand font has loaded. Without it the letters reflow to a fallback
          face on first paint and the header visibly jumps. */}
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fill={INK}
        fontFamily="var(--font-sans), system-ui, sans-serif"
        fontWeight="800"
        fontSize="46"
        letterSpacing="-1"
        textLength="62"
        lengthAdjust="spacingAndGlyphs"
      >
        RA
      </text>
    </svg>
  )
}

/** Mark plus wordmark, for headers that currently pair the icon with the name. */
export function Wordmark({ size = 26, gap = 9 }: { size?: number; gap?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap }}>
      <Mark size={size} />
      <span style={{ color: INK, fontWeight: 800, fontSize: size * 0.6, letterSpacing: '-0.4px' }}>
        Relay Arc
      </span>
    </span>
  )
}

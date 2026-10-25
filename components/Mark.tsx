// The Relay Arc mark: a lowercase r sending a signal.
// A transparent PNG at public/logo-mark.png, cut from the master logo. The full
// wordmark (mark + "relay arc") is public/logo-wordmark.png.
type Props = {
  /** Rendered size in px. The mark is square. */
  size?: number
  /** Kept for older call sites; the new mark has no background. */
  radius?: number
  className?: string
}

export default function Mark({ size = 26, className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-mark.png" width={size} height={size} alt="Relay Arc" className={className}
      style={{ display: 'block', width: size, height: size }}/>
  )
}

// The shape language, in one place.
export const SHAPE = {
  square: '20px',
  edge: '14px',
  dot: '50%',
  bar: '99px',
} as const

/**
 * A chamfered rectangle: top-left and bottom-right corners cut at 45 degrees.
 *
 * Reserved for emergency and critical surfaces. Two corners rather than four,
 * because cutting all four makes a lozenge and loses the reference to a plate
 * or a badge. Asymmetry is the point.
 */
export function notch(size = 14): string {
  return `polygon(${size}px 0, 100% 0, 100% calc(100% - ${size}px), calc(100% - ${size}px) 100%, 0 100%, 0 ${size}px)`
}

/**
 * A regular octagon, for the SOS control only.
 *
 * THIS IS NOT DECORATION. An octagon is the stop sign, in every country that
 * has road signs, and it is the one shape a person reads as "emergency"
 * without reading anything. It also means the control can be found by its
 * outline alone, which matters for the specific situation this app is for:
 * someone whose vision is greying out at the edges during a presyncope
 * episode, or whose hands are shaking too much to read a label.
 *
 * Do not use it for anything else. A shape that means emergency stops meaning
 * emergency the moment a second thing wears it.
 *
 * `inset` is the corner cut as a percentage of the side. 29.3% is the true
 * regular octagon; values below that read as a rounded square with flat
 * corners rather than as a stop sign.
 */
export function octagon(inset = 29.3): string {
  const a = inset
  const b = 100 - inset
  return `polygon(${a}% 0%, ${b}% 0%, 100% ${a}%, 100% ${b}%, ${b}% 100%, ${a}% 100%, 0% ${b}%, 0% ${a}%)`
}

/**
 * A single cut corner, bottom-right. Lighter than notch(), for cards that
 * should sit slightly apart from a plain panel without shouting.
 */
export function cut(size = 12): string {
  return `polygon(0 0, 100% 0, 100% calc(100% - ${size}px), calc(100% - ${size}px) 100%, 0 100%)`
}

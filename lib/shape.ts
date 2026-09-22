// The shape language, in one place.
//
// WHY THIS FILE EXISTS
// A sweep of the codebase found 478 borderRadius declarations using 22
// different values: 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24,
// 28, 50%, 99px and three multi-corner strings. Nobody decided that. It is what
// happens when every one of 45 files picks a number that looked right on the
// day, and the result is that nothing on screen is shaped like anything else
// for any reason.
//
// The visible effect was the opposite of variety. Almost every value sat in the
// 8 to 16 band, so everything read as the same softly rounded rectangle, which
// is the house style of every template on the internet and a large part of why
// people say a site looks generated.
//
// So: four radii, and two shapes that are not rectangles at all. Each one means
// something, and the meaning is the rule for when to use it.
//
//   SQUARE   buttons and panels. The default. 20px — a real, visible curve
//            rather than a hint of one. Went from 0px to a subtle 8px first;
//            that read as barely-there on a phone screen, so it went further.
//   EDGE     inputs and inner surfaces. 14px, a step lighter than SQUARE so
//            the nesting still reads: an input inside a card is visibly a
//            different surface, not just a smaller version of the same one.
//   DOT      50%, and only for things that are actually round: status dots,
//            avatars, the record light. Never a button.
//   BAR      99px, and only for the end caps of a progress bar, where the
//            round cap is showing you where the fill stopped.
//
//   notch()  a chamfered corner, cut at 45 degrees. This is the emergency
//            surface. It reads as an ID badge, a warning plate, a machined
//            part, and it is instantly distinguishable from a rounded card
//            without anyone having to read it. Rounding SQUARE and EDGE does
//            not touch this — notch() is a clip-path, not a radius, so the
//            emergency screens keep their sharp identity while everything
//            else softened.
//   octagon() the SOS control, and nothing else. See the note on it below.
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

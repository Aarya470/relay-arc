# Relay Arc design system (2026)

Flat, modern, calm. Colour fields instead of boxes. Space and tone steps instead of borders and shadows.

## Colour
| Role | Value | Text on it |
| --- | --- | --- |
| Leaf (main ground) | #B3DDAC | ink #141413 |
| Paper | #FFFFFF | ink |
| Mint (tone step) | #DDEFD9 | ink |
| Forest | #1E3A23 | white |
| Ink | #141413 | white |
| SOS red (action, emergency only) | #A33417 | white |
Body text is full ink or full white. Grey only for small notes (#3F3D36 on light).

## Type
One face, Plus Jakarta Sans. Five sizes.
- Display: clamp(44px, 7.2vw, 104px), weight 800, tracking -0.045em, leading 0.95
- Title: clamp(32px, 4.6vw, 64px), weight 800, tracking -0.035em, leading 1
- Lead: 20px, leading 1.5
- Body: 17px, leading 1.55
- Small: 14px
No eyebrows, no uppercase labels, no monospace outside code.

## Shapes (mixed on purpose)
- Slant: main action buttons and the SOS. Parallelogram, leans forward.
- Cut corner: media frames, the emergency card, app fragments. Top right corner clipped.
- Pill: small secondary actions, toggles, chips.
- Square: sections, rows, inputs, everything else.
No soft 8 to 16px rounded boxes.

## Layout
Each homepage section is a full width colour chapter. One heading, one short paragraph, one real piece of the app. Equal outer margins (24px phone, 48px desktop). Max content width 1240px.

## Motion
Transform and opacity only. Section parts rise 24px and fade in, staggered 80ms, once. Buttons press to scale 0.97. Tab marker slides. Everything turns off under prefers-reduced-motion.

## Copy
Plain words. Short sentences. No hyphens, no colons, no "not X but Y". One heading per section.

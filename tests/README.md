# Navigation logic tests

Runs the **real shipped geometry/instruction functions** from
`components/Navigation.tsx` (auto-extracted into `navlogic.extracted.ts`)
against a live route from the same routing servers the app uses.

    cd tests && node --experimental-strip-types navigation.test.ts

Covers: cumulative distance vs the router's own total, snap-to-route accuracy,
drifted-GPS correction, a full simulated drive (monotonic remaining distance,
route trimming, maneuver advance, arrival), off-route threshold, instruction
composition on real maneuvers, the dispatch matrix call, and formatters.

Re-extract after editing Navigation.tsx:

    python3 tests/extract.py

#!/usr/bin/env python3
"""
Relay Arc icon set.

WHY THIS EXISTS
The favicon was still the Next.js starter triangle. That is what Google renders
beside the search result, so every search listing for relay-arc.org was showing
Vercel's logo rather than ours — the one place a brand mark gets seen by people
who have never heard of the project, and it was advertising the host.

WHY IT IS JUST "RA" AND NOT THE FULL LOCKUP
The brand mark has RELAY ARC set underneath the letters with a rule. At 16px,
which is the size a favicon is actually rendered at in a browser tab and in a
search result, that wordmark is three grey smudges. So the icon drops to the
monogram alone. The lockup stays for avatars and social, where there is room.

WHY THE LETTERS ARE INK ON ORANGE AND NOT THE REVERSE
Claude orange is #D97757, which measures 2.96:1 on cream — it fails even the
3:1 large-text bar. It is a fill colour only, always with dark ink on top, where
it reaches 5.90:1. That rule is written down in globals.css and it applies here
too.

Usage:
    python3 scripts/render-icons.py
"""
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ORANGE = (217, 119, 87)
INK = (20, 20, 19)

GF = "/usr/share/fonts/truetype/google-fonts"
DJ = "/usr/share/fonts/truetype/dejavu"


def font(size):
    for p in (f"{GF}/Poppins-Bold.ttf", f"{DJ}/DejaVuSans-Bold.ttf"):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    raise SystemExit("no bold font found")


def mark(size, radius_ratio=0.22, pad_ratio=0.14):
    """Rounded orange square with RA centred on it.

    Rendered at 4x and downsampled. Drawing rounded corners and type directly at
    32px produces stair-stepping that is very visible in a browser tab, and
    supersampling is the cheapest fix.
    """
    s = size * 4
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * radius_ratio), fill=ORANGE)

    # Fit "RA" to the box by measurement rather than by a guessed point size, so
    # the glyphs land identically at every output size instead of drifting.
    target = s * (1 - pad_ratio * 2)
    lo, hi = 8, s
    f = font(16)
    while lo < hi:
        mid = (lo + hi + 1) // 2
        f = font(mid)
        box = d.textbbox((0, 0), "RA", font=f)
        if (box[2] - box[0]) <= target and (box[3] - box[1]) <= target:
            lo = mid
        else:
            hi = mid - 1
    f = font(lo)

    box = d.textbbox((0, 0), "RA", font=f)
    w, h = box[2] - box[0], box[3] - box[1]
    d.text(((s - w) / 2 - box[0], (s - h) / 2 - box[1]), "RA", font=f, fill=INK)

    return img.resize((size, size), Image.LANCZOS)


def main():
    app = os.path.join(ROOT, "app")
    public = os.path.join(ROOT, "public")

    # Next.js App Router picks these up from app/ by filename, no <link> needed.
    # A multi-size .ico because Windows and some crawlers still ask for 16 and 32
    # specifically, and a single 256 scaled down by the browser looks muddy.
    ico_sizes = [16, 32, 48, 64, 128, 256]
    frames = [mark(n) for n in ico_sizes]
    frames[-1].save(
        os.path.join(app, "favicon.ico"),
        format="ICO",
        sizes=[(n, n) for n in ico_sizes],
    )

    # Apple touch icons are composited onto white if they have transparency, and
    # iOS applies its own corner mask, so this one is square and opaque.
    apple = Image.new("RGB", (180, 180), ORANGE)
    apple.paste(mark(180, radius_ratio=0.0), (0, 0), mark(180, radius_ratio=0.0))
    apple.save(os.path.join(app, "apple-icon.png"))

    for n in (192, 512):
        m = mark(n, radius_ratio=0.0)
        flat = Image.new("RGB", (n, n), ORANGE)
        flat.paste(m, (0, 0), m)
        flat.save(os.path.join(public, f"icon-{n}.png"))

    print("favicon.ico       ", ico_sizes)
    print("apple-icon.png     180")
    print("public/icon-192.png, public/icon-512.png")


if __name__ == "__main__":
    main()

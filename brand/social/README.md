# Social cards

Every post image lives here, named `YYYY-MM-DD-slug.png`, 1200x627 at 2x.

Made with `scripts/social-card.mjs`, which pulls a real screen from the live
site and drops it into a branded frame, so the picture is the actual product
rather than a sentence on a coloured rectangle. The colour tokens in that script
mirror `app/globals.css`. If the palette changes there, change it there too.

    node scripts/social-card.mjs \
      --slug reduce-motion \
      --headline "If you asked your phone to stop moving things, the app stops moving" \
      --sub "Dizziness and visual motion sensitivity are common in POTS." \
      --chip "Shipped this week" \
      --screen /flare

`--screen` is any public route. It loads at 390x844 with reduced motion so the
page is settled rather than caught mid fade, and the cookie notice is dismissed
before the shot, since it belongs on the site and not in a product photo.

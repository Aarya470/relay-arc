// Build a branded social card, with a real screen from the live app inside it.
//
// WHY THIS IS A SCRIPT AND NOT A ONE-OFF
// Every post needs an image, every image has to look like Relay Arc, and the
// useful ones have the actual product in them rather than a slab of text on a
// coloured rectangle. Doing that by hand each time means the brand drifts: a
// slightly different green, a slightly different weight, a phone frame with a
// different corner radius. The tokens below are the same ones app/globals.css
// ships, so a card made in six months still matches the site.
//
// Output goes to brand/social/YYYY-MM-DD-slug.png at 1200x627, which is the
// size LinkedIn renders without recompressing, at 2x for retina.
//
// USAGE
//   node scripts/social-card.mjs \
//     --slug reduce-motion \
//     --headline "If you asked your phone to stop moving things, the app stops moving" \
//     --sub "Dizziness and visual motion sensitivity are common in POTS." \
//     --chip "Shipped this week" \
//     --screen /flare
//
// --screen takes any public route. It is loaded at 390x844 with reduced motion,
// so entrance animations are settled rather than caught halfway through a fade.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const args = {}
for (let i = 2; i < process.argv.length; i += 2) {
  args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1]
}

const BASE     = process.env.BASE || 'https://www.relay-arc.org'
const slug     = args.slug     || 'card'
const headline = args.headline || 'The closest hospital is not always the right one'
const sub      = args.sub      || ''
const chip     = args.chip     || 'Relay Arc'
const route    = args.screen   || '/flare'

// Brand tokens. Mirror of app/globals.css. Do not drift from it.
const PAGE = '#B3DDAC', BAND = '#42623C', INK = '#141413'
const INK2 = '#5C5A52', ORANGE = '#D97757', CRIT = '#A33417'

const outDir = path.join(process.cwd(), 'brand', 'social')
fs.mkdirSync(outDir, { recursive: true })
const stamp = new Date().toISOString().slice(0, 10)
const outFile = path.join(outDir, `${stamp}-${slug}.png`)

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })

// 1. A real screen from the live app.
const phoneCtx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 3,
  isMobile: true, hasTouch: true, reducedMotion: 'reduce',
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
})
const sp = await phoneCtx.newPage()
await sp.goto(BASE + route, { waitUntil: 'networkidle', timeout: 60000 })
await sp.waitForTimeout(2000)
// The cookie notice is correct on the site and wrong in a product shot.
const dismiss = sp.locator('button', { hasText: /That is fine|Do not count/ })
if (await dismiss.count()) { await dismiss.first().click(); await sp.waitForTimeout(500) }
const shot = (await sp.screenshot()).toString('base64')
await phoneCtx.close()

// 2. Compose.
const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&family=IBM+Plex+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
 *{margin:0;padding:0;box-sizing:border-box}
 body{width:1200px;height:627px;background:${PAGE};font-family:'Plus Jakarta Sans',sans-serif;overflow:hidden;position:relative}
 .rule{position:absolute;top:0;left:0;right:0;height:9px;background:${ORANGE};z-index:6}
 .band{position:absolute;right:0;top:0;bottom:0;width:452px;background:${BAND};z-index:1}
 .left{position:absolute;left:62px;top:0;bottom:0;width:660px;z-index:3;display:flex;flex-direction:column;justify-content:center}
 .brandrow{display:flex;align-items:center;gap:11px;margin-bottom:38px}
 .mark{width:36px;height:36px;background:${ORANGE};display:flex;align-items:center;justify-content:center;
       font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:14px;color:${INK}}
 .brand{font-weight:800;font-size:20px;color:${INK};letter-spacing:-.4px}
 h1{font-size:${headline.length > 74 ? 47 : 53}px;font-weight:800;color:${INK};line-height:1.03;letter-spacing:-.037em;max-width:610px}
 .dot{color:${CRIT}}
 .sub{font-size:18.5px;color:${INK2};line-height:1.6;max-width:545px;margin-top:20px}
 .meta{display:flex;align-items:center;gap:16px;margin-top:36px}
 .chip{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:700;letter-spacing:1.5px;
       text-transform:uppercase;color:${INK};background:#fff;padding:9px 14px}
 .url{font-family:'IBM Plex Mono',monospace;font-size:14px;font-weight:700;color:${INK2}}
 .phonewrap{position:absolute;right:98px;top:50%;transform:translateY(-50%) rotate(-2.5deg);z-index:4}
 .phone{width:246px;height:518px;background:${INK};border-radius:32px;padding:9px;box-shadow:0 24px 54px rgba(20,20,19,.38)}
 .screen{width:100%;height:100%;border-radius:24px;overflow:hidden;background:${PAGE}}
 .screen img{width:100%;display:block}
</style></head><body>
 <div class="band"></div><div class="rule"></div>
 <div class="left">
   <div class="brandrow"><div class="mark">RA</div><div class="brand">Relay Arc</div></div>
   <h1>${headline}<span class="dot">.</span></h1>
   ${sub ? `<p class="sub">${sub}</p>` : ''}
   <div class="meta"><span class="chip">${chip}</span><span class="url">relay-arc.org</span></div>
 </div>
 <div class="phonewrap"><div class="phone"><div class="screen"><img src="data:image/png;base64,${shot}"></div></div></div>
</body></html>`

const tmp = path.join(process.cwd(), '.social-card.tmp.html')
fs.writeFileSync(tmp, html)
const page = await browser.newPage({ viewport: { width: 1200, height: 627 }, deviceScaleFactor: 2 })
await page.goto('file://' + tmp, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: outFile })
await browser.close()
fs.unlinkSync(tmp)

console.log('wrote ' + path.relative(process.cwd(), outFile))

# Herron & Co. Legacy Agency — working notes

Static marketing site (plain HTML/CSS/vanilla JS, no build step) for an independent
life-insurance agency. Deployed on Netlify; `netlify.toml` publishes the repo root and
serves serverless functions from `netlify/functions`.

## Who / what
- **Agent:** Connor Herron · NPN **21556594** · Lehigh Valley, PA · licensed in **12 states**
  (PA, NJ, VA, WI, IA, IN, FL, TX, MA, NC, OH, MN).
- **Products:** mortgage protection with living benefits, IUL, hybrid long-term care,
  final expense, fixed annuities, disability income. 20+ carriers, $0 to work with them.
- **Brand:** deep navy (`#081226`, `#0E1F3E`) + brass/gold (`#C9973B`, `#E2B45C`, `#F6E0AC`).
  Fonts: Sora (display), Inter (body), IBM Plex Mono (HUD/labels).

## Ground rules (important)
1. **Work on branch `claude/viral-social-content-creation-af6vpq`.** Never push to `main`.
2. **Do not touch production** (`herronlegacyinsurance.com`) until the user explicitly says
   **"ship it"**. Everything is reviewed on the PR #6 Deploy Preview first:
   `https://deploy-preview-6--herron-legacy-insurance.netlify.app/`
3. **Don't open new PRs** unless asked — PR #6 already tracks this branch.
4. **Compliance text must stay intact and visible** wherever it appears: the 12-state list,
   the NPN, IUL/annuity disclaimers ("not guarantees of future performance", caps/participation
   rates, living-benefit riders may reduce the death benefit), "illustrative, not offers of
   coverage or quoted rates", "not individualized financial, legal, or tax advice", and the
   honest Legacy Concierge automation disclosure in the FAQ.
5. Customer-facing copy says **"Legacy Concierge"**, never "AI" / "AI-powered".
6. Never commit model identifiers or session URLs into code comments or page content.

## Key files
| File | What it is |
| --- | --- |
| `index.html` | The live homepage (~2600 lines, all CSS/JS inline). |
| `images/cover/` | Saved renders of the retired cover page (user's keepsake — `experience.html` itself was deleted at the user's request; recover from git history if ever wanted). |
| `wealth-shield-matrix.html`, `protection-blueprint.html` | Interactive tool pages. |
| `liquid-glass.js`, `legacy-ai.js` | Shared glass effect + concierge chat. |
| `social/` | Standalone social content kit — **not** part of the website. |

## Where the design landed

Both heroes render a real-time WebGL **"threshold gateway"** scene, translated from a
reference design reel (dark monoliths forming a canyon, a sun burst in the gap, volumetric
god-rays, backlit cloud banks) into navy/gold. Composited in depth order in one fragment
shader: sky → sun halo/core → god-rays (held to a vertical cone) → distant spire tiers →
mid cloud bank → near monoliths (broken tops, striations, low haze, gold rim-light) →
foreground cloud sea → vignette → **cinematic grade** (ACES-ish tonemap, navy-shadow /
gold-highlight split tone, S-curve, anamorphic streak, ordered dither).

- **`index.html` (homepage):** **no shield** — emblem alone. The light gap is anchored to
  the emblem's **measured** position via the `uSun` uniform (`sun()` re-measures `.crest`
  on resize/load/fonts-ready), so the burst sits behind the logo on desktop and re-centres
  when the hero stacks. The left monolith shades the copy column, helping headline contrast.

Tunables (same names in both files): `twr(nx, lo, hi, h0, h1, seed)` tower bands, `nx`
(gateway width, normalised to viewport width), `lit`/`lw`/`gl2` warm falloffs, cloud
`dens`/`fd` thresholds and their `smoothstep` ceilings.

## The logo — read this before touching it
The brand mark is a fine-line heron: **crest tuft, long beak, small white eye, S-neck,
OPEN body curve, two legs, one foot bar, and a curved BLUE (`#4C7EE8`) line beneath it.**
Two wrong versions were shipped before the real one:
1. a hand-coded glyph with a closed round body and no underline;
2. the Wealth Shield Matrix header version — also a different drawing.
The truth is the supplied artwork, now keyed to transparency in `logos/mark/mark-full.png`.
- **Nav/favicons** use raster derivatives (`logos/mark/nav{,@2x,@3x}`) generated at *exact*
  device sizes so the browser never resamples and shrinks the detail away. Strokes are
  dilated before downscaling; **the eye is the artist's own white pixels grown slightly**,
  not a synthetic dot (drawing one produced a huge blob over the head).
- **The liquid-metal emblem** SDF is generated from the same artwork: skeletonised, chains
  merged end-to-end, simplified to ~53 segments, swept as a 2D polyline set into a 3D tube
  (radius 0.031, underline 0.023) with a bounding-box early-out (radius must match the
  tube). The underline keeps its blue; the eye is pearl-bright.
- **The emblem never becomes a blob.** The user called the old heron→blob morph cycle
  trash — rightly; it parked the brand as a shapeless lump ~30% of the time. Liquid metal
  pours into the mark once during the intro (`morphAt` returns 0 after 2.3s) and the
  "liquid" life lives in the material: dark navy chrome body (dark line against the burst,
  same backlit language as the monoliths), flowing normal perturbation so reflections
  crawl, one-sided gold fresnel rim, two Blinn speculars, analytic studio env with a
  vertical softbox strip. Material classification (blue line / eye) must happen in the
  same rotated frame `map()` marched against — rotate `p` by the identical sway before
  calling `dBird/dLine/dEye`.
- At nav size the literal 3px strokes fall under one device pixel, so some optical
  thickening is unavoidable. **Verify by rendering at real 1x/2x and magnifying the actual
  pixels — never by screenshotting at high DPR, which hides sub-pixel loss.**

## Premium pass (docs/premium-audit.md)
Priorities 1-4 of that audit are **done**: single close (the double CTA is gone), one CTA
vocabulary ("Get my numbers — 15 min"), design tokens + one band rhythm, and the image
pipeline (all images sized, AVIF/WebP, 4K logos rebuilt). **Not done:** §3.1's restructure
(collapsing the five front doors / tabbing IUL+annuities+tools) — needs sign-off since it
reorders sections and anchors.

## Mobile performance
Profiling showed cost was **cumulative compositing**, not one hot spot — hiding both WebGL
canvases barely moved frame time. Fixes: heron SDF no longer evaluates both shapes per
step; phones get fewer march steps, half the fbm octaves, no foreground cloud layer, 0.75x
render scale and throttled loops (30/24fps); `liquid-glass.js` is gated off on touch (it was
a third live renderer); and a `@media (pointer:coarse)` block drops `backdrop-filter`
(45 declarations, up to blur(34px)) using the existing `@supports not` fallback colours.
Measured 482ms → 84ms per frame on a throttled phone profile.

## Hard-won gotchas
- **Screenshots lie about advanced CSS/WebGL.** Headless Chromium uses swiftshader, which
  differs on `backdrop-filter` and stacked `drop-shadow`s. **Trust the user's real-GPU
  reports over local renders.**
- Serve with `python3 -m http.server 8099 --directory <repo>`; Playwright with
  `executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome"` and
  `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`. Never run
  `playwright install`.
- `wait_until="networkidle"` hangs on these pages — use `"load"` + a timeout. Google Fonts
  is blocked in the sandbox (`ERR_CONNECTION_RESET` is harmless), and it can make
  `page.screenshot` time out waiting on fonts — wrap shots in try/except.
- `index.html` sets `scroll-behavior:smooth`, which silently defeats scripted scrolling —
  force `auto` first or every shot comes back as the hero. Note `scrollTo({behavior:'auto'})`
  does **not** opt out: `auto` means "use the CSS value", so it still smooth-scrolls. A probe
  that skipped this reported the annuity disclaimer and the states fallback line as stuck at
  `opacity:0` — it had simply never reached the bottom of the page. Both are fine.
- **Contrast cannot be computed from CSS on this site.** The hero sits on a WebGL canvas and
  the tool panes are liquid-glass, so walking up `backgroundColor` finds nothing opaque and
  falls back to the wrong answer — it read the why-cards as 1.28:1 (really 16.35:1) and the
  quote-band note as white-on-white (really 7.18:1). Screenshot the element's box and measure
  the actual pixels instead.
- ScrollTrigger's `onUpdate` fires the moment the scrollbar moves, **before** a `scrub`
  tween has caught up, and no further `onUpdate` arrives once scrolling stops. Anything that
  must agree with what is on screen has to hang off the *tween's* own `onUpdate`.
- Scroll-reveal sections start at `opacity:0`; force `.reveal/.rise` visible and add `.in`
  or white sections shoot blank. `full_page=True` mangles the `100svh` hero — tile instead.
- Full-viewport WebGL at high DPR (e.g. 3200x2000) times out under swiftshader — keep the
  cover at DPR 1.
- The fetch proxy 403s the Netlify preview domain, so the live URL can't be verified from
  the sandbox. That is the proxy, not the site.
- `#ignite` is a `z-index:9000` full-viewport curtain, and **every inline script block on the
  page shares one IIFE** — so a single throw anywhere in it used to leave that curtain up
  forever and the whole site was a blank navy screen. It now also retires via a CSS animation
  at 3.4s (after the scripted 1.5s fade / 2.7s DOM removal, so the normal path is untouched),
  and a `<noscript>` block hides it outright. Verify with Playwright's
  `java_script_enabled=False` — the page must render nav, headline, CTAs and disclosures.

## Where things stand
Everything is on branch `claude/viral-social-content-creation-af6vpq` / PR #6, reviewed on
the Deploy Preview. **Nothing is on production** — merging is gated on an explicit
**"ship it"**. Numbered homepage screenshots (01 hero … 15 mobile) are the agreed way the
user points at sections.

**The "13 states" claim is now gone everywhere** (it was the last known outstanding item).
`images/og.png` is rebuilt in the brand system with real Sora/Inter, the canonical heron,
the current voice, 12 states, and the NPN — regenerate with the script pattern in the
audit commit; Sora/Inter TTFs are fetchable from Google Fonts through the **tool** proxy
even though the browser sandbox blocks them. The serious one was
`netlify/functions/legacy-ai.js`: the concierge's system prompt said 13 states and listed
**Georgia**, which Connor is not licensed in — so the live concierge was making a false
licensing representation. Corrected to the canonical 12 with an explicit instruction never
to imply any other state. `social/link-in-bio.html` and `social/content-kit.html` were
corrected too. **If the state list ever changes, it lives in four places:** the
`index.html` chips, the footer legal block, the concierge prompt, and the social kit.

Still open, deliberately not changed without sign-off: the retired tagline *"Life insurance
shouldn't be complicated."* survives as the `#about` h2 (`index.html`) and in the homepage
meta description. `docs/premium-audit.md` proposes **"You'll be talking to me. Connor."**

The premium-upgrade layer (docs/premium-upgrade-spec.md) is implemented: hx-hero-card
glass, the GSAP 3D product wheel (self-hosted vendor/gsap — desktop fine-pointer only,
guards return the plain grid everywhere else; anchor shim keeps the five card nav links
working; js/hx-wheel.js), the #why grid, and the hx-cta-note micro-copy. Cascade rule
learned the hard way: never rely on !important tie-breaking against GSAP inline styles —
drive states with explicit classes (.hx-dim/.hx-front) and plain specificity.

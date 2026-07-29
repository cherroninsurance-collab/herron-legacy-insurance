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

## Where the design landed — BRIGHT THEME (2026-07-27)

**The whole site is now the bright frosted-white luxury theme** (user: "make the whole
home page super bright frosted white … instead of the dark blue kinda theme"; approved
via concept boards, then built for real). Ivory/porcelain surfaces, navy ink, dark-gold
accents, white-frost glass. Palette: paper `#FDFCF9`/`#F4F6FA`, headline `var(--navy)`,
body ink `#3A4A6B`, soft ink `#5A6A8C`, small gold text `#96660F` (5:1 on white), large
gold `#B07E22`, grads `#B07E22→#8A5F10`.

- **The hero WebGL scene is GONE** (canvas + veil + grain divs deleted; its init block
  self-skips). The hero is a CSS light-field: gold bloom upper-right, cool bloom left,
  warm floor, ivory→porcelain vertical — with the **liquid-chrome heron emblem kept**
  (dark chrome reads beautifully on light; its canvas is `#heroHeron`).
- All five `.lg-container` panes run `data-lg-theme="light"`.
- **Deliberate dark accents kept** (do not "fix"): the wide "classics" coverage card,
  faux browser bars (`.wt-bar/.t-bar/.iul-frame-bar/.bp-bar`), `.wt-table thead`,
  the coverage deep-dive modal (`.cov-sheet`, incl. scoped white ghost buttons),
  `.about-photo .npn` chip.
- The lg-blobs on fitcheck/blueprint/quotes/tools stay: soft pastel aurora on white.
- Coarse-pointer fallbacks are all white-frost now (nav/sheet/mobilebar/chat/panes).
- The floating concierge panel fallback is white frost — it matches desktop's blur over
  the now-light page (the old slate matched the dark page).
- **Diamond layer** (user: "more 3d animations frosted glass … diamond aesthetic"):
  `#heroCrystals` renders 6 faceted octahedra (L1-norm SDFs, no fbm — cheap) in clear
  glass with gold/ice/violet facet dispersion and twinkling glints; wrapped in try/catch
  so a throw can never kill the shared IIFE; phones get 4 shapes at 24fps/0.8 DPR.
  Why-cards carry pointer-tracked 3D tilt (`data-hx-tilt`, fine-pointer only — NEVER
  tilt backdrop-filter glass, Chrome glitches). Prismatic hairline gradient borders on
  why-cards, ann carousel cards and the hero card. Hero sparks are white diamond dust
  with gold/blue glow.

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

**Phone brightness** (user: "very dark on my phone"): those coarse fallbacks originally
went near-opaque dark navy, several stops darker than the desktop glass — they've been
lifted (hero card `rgba(22,42,80,.46)→.30` gradient, tool panes `#16294E→#0C1B38`, stat
chips 9% white, glows opacity .5) and the hero scene runs `aces(col*1.32)` on its reduced
path vs 1.10 on desktop. If a phone surface looks like a black pit, check this block first.

## The executive backdrop (dark bands)
The blue `.hero-grid-lines` overlay and the purple/indigo/cyan `.lg-blob` wash are
**deleted** from `.iul-band`/`.ann-band` (user: "instead of the dark blue grid …
something more professional but sleek"; approved via before/after boards). Those two
bands share one layered background: warm key light `radial(… 22% -6%, rgba(226,180,92,.14))`
behind the headings, cool counter-light right, deep floor, `linear(180deg,#10213F→#0A1730→
#080F22)` base, and an inset brass hairline on the top edge. Band glows are dimmed to .4
in those two bands only. (Historical: the concierge band kept its original dark backdrop for a while at the
user's request; the sitewide bright theme now supersedes that — the ai band is bright
frost like the rest, with the chat as white glass.)

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
**SHIPPED 2026-07-27**: the user said "double check everything works on desktop and mobile
then ship it"; a 26-point suite passed (carousels drag/arrows/dots/side-click/CTA on both
devices, touch scroll preserved, reveals, compliance strings, forms byte-intact, overflow
320–1920, no-JS disclosures, zero console errors) and PR #6 was merged to `main` →
production (herronlegacyinsurance.com). Any future work: new changes still go through a
branch + preview first; production only moves on an explicit "ship it". Numbered homepage
screenshots (01 hero … 15 mobile) are the agreed way the user points at sections.

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
glass, the #why grid, the hx-cta-note micro-copy, and — since the user's "interactive 3d
carousal" request — **two interactive 3D card carousels** (js/hx-wheel.js): coverage
(7 cards) and annuities (4 cards). Key facts:
- **No scroll pinning.** ScrollTrigger is no longer loaded at all; the earlier pin/scrub
  wheel was replaced wholesale. Controls: drag (>6px threshold), arrow buttons, dot
  buttons, click-a-side-card-to-front, focusin rotates a tabbed card forward.
- **Coverflow geometry, not a rotating ring**: each card is placed from its signed
  circular offset (x=o·spread, z=−|o|·depth, rotY=−o·tilt). A true ring + backface
  culling makes 3–4-card sets invisible at the sides; offsets work for any n.
- **FLOW PROTECTION invariant:** the front card's links/buttons fire untouched. Clicks
  are intercepted only when (a) the pointer actually dragged, or (b) the click hit a
  non-front card (which rotates it forward instead). Nav links into card ids
  (#mortgage, #ltc, …) are owned by the carousel: scrollIntoView(section) + rotate.
- **Every control computes from the logical target (`current`), never `Math.round(pos)`
  mid-tween** — that race lands off-by-one. `hxRings.<name>.target()` is the logical
  index; `idx()` is what the lagging render currently shows.
- The ann compliance note + CTAs live OUTSIDE .ann-grid, so they stay static below the
  carousel — never rotated, never hidden.
- Phones/tablets/reduced-motion keep the flat snap carousel (coverage) / plain grid
  (annuities); `window.hxRings` is undefined there.
- Under swiftshader, GSAP lag-smoothing makes snap tweens crawl (frames >500ms are
  clamped to 33ms of progress) — tests must assert on `target()` or wait generously;
  real GPUs never hit this.
Cascade rule learned the hard way: never rely on !important tie-breaking against GSAP
inline styles — drive states with explicit classes (.hx-dim/.hx-front) and plain
specificity, and never put a CSS opacity transition on elements whose opacity GSAP
sets per-frame (it smears drags).

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
| `experience.html` | Standalone cinematic "cover"/concept page, `noindex`. |
| `wealth-shield-matrix.html`, `protection-blueprint.html` | Interactive tool pages. |
| `liquid-glass.js`, `legacy-ai.js` | Shared glass effect + concierge chat. |
| `social/` | Standalone social content kit — **not** part of the website. |

## Where the design landed

Both heroes render a real-time WebGL **"threshold gateway"** scene, translated from a
reference design reel (dark monoliths forming a canyon, a sun burst in the gap, volumetric
god-rays, backlit cloud banks) into navy/gold. Composited in depth order inside one
fragment shader: sky gradient → sun halo + core → god-rays (held to a vertical cone) →
distant spire tiers → mid cloud bank → near monoliths (broken-rock tops, striations,
low-settling haze, gold rim-light on lit faces) → foreground cloud sea → vignette.

- **`experience.html` (cover):** gateway centred; the liquid-chrome heron sits inside the
  **gold heraldic shield** in the light gap, backlit — "stepping through the threshold".
- **`index.html` (homepage):** **no shield** — the chrome heron stands alone (camera
  `ro.z 4.85`, sway `0.40`). The light gap is anchored to the emblem's **measured**
  position via a `uSun` uniform (`sun()` re-measures `.crest` on resize/load/fonts-ready),
  so the burst sits behind the logo in the right column on desktop and re-centres when the
  hero stacks on mobile. The left monolith shades the copy column, which helps headline
  contrast. Rays/clouds are dialled back vs. the cover so the scene never fights the copy.

Main tunables (same names in both files): `twr(nx, lo, hi, h0, h1, seed)` tower bands,
`nx` (gateway width, normalised to viewport width so proportions hold on any aspect),
`lit`/`lw`/`gl2` warm falloffs, cloud `dens`/`fd` thresholds and their `smoothstep` ceilings.

Also live: ALCHE-style 3D flip-open reveals on the coverage/annuity cards, a 12-state chip
cascade (keyframe-based so chips can never stick invisible), and off-screen WebGL pausing
via IntersectionObserver with reduced DPR on coarse-pointer devices.

## Hard-won gotchas
- **Screenshots lie about advanced CSS/WebGL.** Headless Chromium falls back to
  swiftshader, which ignores/differs on `backdrop-filter: url(#svg-filter)` and stacked
  `drop-shadow`s. Several real bugs looked fine in screenshots. **Trust the user's
  real-GPU reports over local renders.**
- Screenshot recipe: serve with `python3 -m http.server 8099 --directory <repo>`, then
  Playwright with `executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome"`
  and args `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`.
  Do **not** run `playwright install`.
- `wait_until="networkidle"` hangs on these animated pages — use `"load"` + a timeout.
- Google Fonts is blocked in the sandbox; the resulting `ERR_CONNECTION_RESET` console
  error is harmless and expected.
- `index.html` sets `scroll-behavior:smooth`, which silently defeats scripted
  `scrollTo`/`scrollIntoView` — override to `auto` before scripted scrolling, or every
  screenshot comes back as the hero.
- Scroll-reveal sections start at `opacity:0`; for full-page captures force
  `.reveal/.rise{opacity:1!important;transform:none!important}` and add `.in`, otherwise
  white sections shoot blank.
- `full_page=True` screenshots mangle this layout (the `100svh` hero balloons and repeats).
  Capture fixed-viewport tiles instead.
- The heron is a raymarched SDF of the logo strokes; framing is resolution-independent, so
  size/position problems are real code issues, not GPU differences.

## Open thread
Awaiting the user's verdict on the threshold heroes as seen on their own GPU. Offered
tuning dials: canyon slot width, cloud density, warm/cool colour grade. Nothing is on
production yet — merging PR #6 is gated on an explicit **"ship it"**.

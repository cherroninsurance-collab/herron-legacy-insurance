# Omma export #2 — "Herron Legacy Protection Plan" explainer

Verbatim Omma output, kept unmodified so the generator's own choices stay
readable. ~1,025 lines. Companion to `docs/omma-source/` (import #1, the one the
shipping `js/omma-3d.js` came out of).

**Nothing here is wired into the site.** Read this file before copying anything.

## What it is

A scroll-driven four-stop explainer. A fixed full-viewport canvas holds four
devices laid out along +X at 0 / 6.2 / 11.4 / 17.2; a separate scrolling track
element drives a camera that flies between four authored stops while HTML
panels fade in beside each one.

| Stop | Device | Geometry |
| --- | --- | --- |
| Care | shield triptych | extruded shield shape, bevelled, gold border ring with a hole path, three bars |
| Paycheck | income bar bank | six boxes, one struck in `risk` red, gold slash over the gap |
| Home | house + shield overlay | box walls, 4-sided cone roof, glass windows, translucent gold shield, box check-mark |
| Legacy | monument | pedestal, tapered column, capital, 4-sided apex, torus ring, orbiting orb |

## Why this export is worth more than the last one

No models, no Draco, no CDN. Every device is hand-built from three.js
primitives — `ExtrudeGeometry` with a bevel, `Shape` + `Path` holes,
`CylinderGeometry(0, r, h, 4)` for pyramids. That is code we can read, retheme
and reuse, which is exactly what the 4.7 MB GLB export was not.

Genuinely reusable, and the reason this is archived:

- **`camera-stops.js`** — the authored-stop model: per-stop position, target,
  FOV, easing name and a **dwell** fraction that holds the camera still for the
  first N% of a segment before the ease begins. `applyDwell()` + `easeSegment()`
  are the whole idea in about ten lines, and dwell is what stops a scroll-driven
  camera feeling like it never settles.
- **`palette.js`** — `mixHex` / `withAlpha` / `hexToLinearArray`, plus per-section
  accent + support tints keyed by section. A clean pattern for driving one scene
  from a brand palette.
- **`lights.js`** — a four-light bright-scene rig (ivory ambient, warm key with
  a sized shadow camera, cool rim, warm ground bounce). Worth keeping as a
  reference for lighting a light-themed scene, which is harder than lighting a
  dark one.
- **`ui.js`** — count-up on section entry, run once per section via a Set.

## What would break the site if copied as-is

1. **It constructs its own `THREE.WebGLRenderer`** (`main.js`). This site runs
   exactly one, in the `Painter` in `js/omma-3d.js`. Anything ported goes
   through `painter.add()`.
2. **It's a page takeover.** A fixed full-viewport canvas plus a separate
   `#scroll-track` element owning the scroll. The homepage cannot give up its
   scroll, so the four stops would have to become a bounded stage.
3. **Shadow maps are on** (`PCFSoftShadowMap`, 1024²,  `castShadow` on most
   meshes). The shared Painter has no shadow pass, and adding one costs every
   other scene that renders through it.
4. **`three` from npm via Vite.** The site vendors a single three.js build and
   has no build step.
5. **`M.navyMid` does not exist** in `devices.js`'s material table — the door
   falls through to `M.slate`. Small, but a sign the export wasn't run.
6. **The Legacy device has an orbiting orb** circling the monument. Contained
   inside a stage rather than floating over the page, so not the same thing as
   the cut hero rings — but the orbit itself is the look that got rejected. Keep
   the static ring, drop the orbiting orb.

## The copy cannot ship as written — read this before reusing the HTML

`index.html` is a stats-heavy sales page and most of the numbers are
unsourced, decorative, or make claims this site deliberately does not make.
The geometry is the asset here; the words are not.

**Claims that would have to be removed or rewritten by the licensed agent:**

- *"100% guaranteed — coverage that never expires regardless of health changes"*
  — a coverage representation. Permanent policies are not uniformly guaranteed;
  it depends on the policy and on premiums being paid.
- *"4x estate leverage — death benefit vs. total premiums paid on average"* — an
  unsourced performance claim, the exact class the site's IUL/annuity
  disclaimers exist to prevent.
- *"no medical exam required for most applicants"* / the "0 exam" stat —
  underwriting varies by carrier, product, age and face amount.
- *"Guaranteed cash value growth. Premiums locked for life."* — true of whole
  life, not of the permanent products generally, and the panel is headed
  "Permanent Life Insurance".
- *"$0 income tax on death benefit"* — generally true, with exceptions, and the
  site's standing line is that it does not give tax advice.
- *"$0 Medicare pays toward custodial care"* — the custodial qualifier is right,
  but Medicare does pay for limited skilled care, and a flat $0 with a bar
  beside it overstates.

**Unsourced statistics** — 70% needing care after 65, $6,200 median monthly
assisted living, 1 in 4 disabled before retirement, 34-month average claim, 60%
income replacement, $1,800 average mortgage, 3 in 5 critical-illness survivors
in hardship. Several have real published sources; at least one ($6,200) does not
match a figure worth standing behind, and one (3 in 5) has no obvious origin.
Any that stay need a citation and a date on the page.

**The bars lie.** Each stat has a `data-fill` that is picked for looks, not
computed: $6,200 → 88%, "$0 Medicare" → 4%, "0 exam" → 95%. A bar drawn beside
a number reads as measuring that number. This is the same failure the site
already guards against — the `omma-bars` in `js/omma-design.js` carry no numbers
at all, on purpose.

**Four "Get a Quote" CTAs.** The site has one CTA vocabulary — "Get my
numbers — 15 min" — and does not quote.

## If this gets built

Port `devices.js`, `lights.js`, `palette.js` and `camera-stops.js` into a
Painter target as a bounded four-stop stage, and write the copy from the
language already approved on the homepage. Treat `index.html` as a layout
reference only.

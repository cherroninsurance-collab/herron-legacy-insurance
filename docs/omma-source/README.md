# Omma source — reference copy

The generated project from your Omma export, kept verbatim so the original is
always here to read. **Nothing in this folder is loaded by the site.** It is
reference only; the live code is in `js/omma-3d.js`, `js/omma-design.js` and
`js/omma-3d.css`.

Omma is Spline's natural-language builder, so this is Spline-family output: the
3D is hand-written Three.js in the page, not a Spline `.splinecode` scene. That
matters — it means every technique in here is plain code you can read, lift and
retheme, with no runtime dependency on a third-party player.

## What each file does

| File | What's in it |
| --- | --- |
| `index.html` | The whole page markup — hero, cards, quoter, quiz, process, contact, concierge |
| `styles.css` | The entire look: nav, buttons, tilt cards, pills, sliders, quiz, cubes, floating-label form, footer, concierge |
| `scroll.js` | The spine. Shared scroll/pointer state plus `viewportProgress`, `centerOffset`, `damp`, `lerp`, `clamp` |
| `bg.js` | Full-page particle field + wire grid, parallaxed by pointer, dollied by scroll |
| `hero.js` | The hero rig — crystal core, concentric rings, orbiting nodes, fresnel halo, floor plate, drag-to-rotate |
| `cards.js` | One fragment shader with six product variants, per-card, plus pointer tilt and a scroll flip-in |
| `quoter.js` | A tower that builds as the sliders move, with a premium readout and breakdown bars |
| `quiz.js` | A compass dial whose needle seeks the leading answer as you answer questions |
| `misc.js` | Floating shapes behind the contact form that converge on focus; spinning brand marks |
| `main.js` | One master rAF loop driving every system, plus nav, reveal, counters, form validation |
| `concierge.js` | The chat panel |

## The one idea worth stealing above all others

`scroll.js` is the reason the template feels coherent rather than busy. Every
scene reads the same two numbers — how far an element has travelled through the
viewport, and how far it is from centre — and drives its camera from them. That
is why the whole page moves as one instrument instead of as six unrelated
widgets. It is about forty lines. Our `js/omma-3d.js` reimplements it verbatim
in spirit.

## What we shipped, changed, and deliberately dropped

| Template | Status here |
| --- | --- |
| `scroll.js` spine | **Shipped** — same functions, same role |
| `cards.js` shaders | **Shipped, retoned.** Six variants became seven keyed to real products; the ramp is navy-and-brass at low alpha instead of gold-on-black |
| `quoter.js` tower | **Shipped as a seven-column bank.** One centred tower left two thirds of a letterbox stage empty |
| `quiz.js` compass | **Shipped**, with a brass bezel and 60 ticks added — a bare disc reads as a pancake |
| Cube step markers, lettered answer keys, floating labels, breakdown bars, product ticker, slider thumbs, error shake | **Shipped** — see `js/omma-design.js` |
| `hero.js` rig | **Dropped.** Rings orbiting the emblem read as clutter on a real display |
| `bg.js` particle field | **Dropped.** Came out as dark fuzz over the copy |
| `misc.js` contact lattice | **Dropped.** Same species as the two above |
| `misc.js` brand marks | **Never ported.** It spins a generic octahedron; our nav carries the real heron, and the logo rules in `CLAUDE.md` govern |
| One renderer per scene | **Rejected.** See below |

### Two things in here that will break this site if copied literally

1. **A `WebGLRenderer` per scene.** The template makes one per card plus one
   each for hero, tower, compass, contact and background. This page already
   spends contexts on the heron SDF, the diamond field and the liquid-glass
   panes, and browsers evict past roughly sixteen — the emblem dies silently.
   Ours uses exactly one renderer drawing into an offscreen buffer, with each
   target receiving its frame by `drawImage`.

2. **Three.js from `esm.sh` at runtime.** Every file here imports from a CDN.
   The repo convention is self-hosted `vendor/three.module.min.js`; a CDN in the
   critical path is a third-party dependency on a page that sells insurance.

### The rule the template does not know

**Nothing floats free.** The three dropped items are all ambient layers drifting
loose over the page. They photograph beautifully and look like clutter in use.
Every effect that survived is clipped inside a card or a bounded stage and
answers something the visitor did. Keep that line when lifting anything else
from here.

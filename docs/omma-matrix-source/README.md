# Omma export #3 — "Wealth Shield Matrix Insurance"

Verbatim Omma output, unmodified. 622 lines of JS plus a 340-line `index.html`.
Third of three; see also `docs/omma-source/` (homepage import) and
`docs/omma-explainer-source/` (the four-stop explainer).

**Nothing here is wired into the site, and the copy in it must not be.**
Read the second half of this file before reusing any of the markup.

## The techniques are the best of the three exports

Four things came back that we had nothing for. All four are now in
`docs/effects-library.html` as copy-paste entries.

| What | Where | Why it matters |
| --- | --- | --- |
| `buildEnvCube()` | `main.js` | Six canvas gradients become a `CubeTexture`. **This solves a bug that has shaped the whole 3D layer**: metal and glass with no environment to reflect render black, so `js/omma-3d.js` has been dropping metalness to avoid it. Zero assets, zero network. |
| `DispersionShader` | `main.js` | Refraction sampled three times at three IORs, one per channel, recombined — real prismatic fringing, which a single `refract()` cannot produce. Fresnel mixes refraction into reflection. |
| `EdgeCAShader` + post chain | `main.js` | Bloom → bokeh → chromatic aberration → output. The aberration is weighted by squared distance from centre, so only the corners fringe. |
| `chart.js` bar field | `chart.js` | Inline data → one shared extruded profile → filter rebuild with a staggered grow. Spacing computed from row count, negatives hanging below zero. |

Also worth noting: the boot block wraps each subsystem in its own `try/catch`
and reveals a real fallback element when the hero fails. That is the right
shape and it is the first export to do it unprompted.

## What blocks using it as-is

1. **Three renderers.** The hero and the chart each construct a
   `WebGLRenderer`, both with `OrbitControls`. This site runs exactly one
   renderer, in the `Painter` in `js/omma-3d.js`.
2. **`EffectComposer` cannot go through that Painter unchanged.** The Painter
   renders N scenes into one shared buffer and blits each to a 2D canvas; a
   composer wants to own its own render targets. Post-processing would have to
   be scoped to a single dedicated scene, which is the right call anyway — each
   pass is a full-screen draw and the chain is four of them.
3. **Six `three/examples/jsm/` imports.** `EffectComposer`, `RenderPass`,
   `ShaderPass`, `UnrealBloomPass`, `BokehPass`, `OutputPass`, plus
   `OrbitControls`. The site vendors one `three.module.min.js` and nothing else,
   so each of these is a file to vendor.
4. **Shadow maps on the chart** at 1024², plus `castShadow` on every bar.
5. **`homepill` links to `#`.**

## The copy is invented — it did not import the page

The prompt said to keep the existing layout, copy and structure and not to
rewrite the text. It did not. This is a **new page that reuses the title**: the
real Wealth Shield Matrix tool — its vault dial, its brake gauge, its coin flow,
its bucket simulation — is not in here. Treat `index.html` as a layout study.

Claims in it that cannot ship, and that are the licensed agent's call rather
than a generator's:

- **"the Herron Method"** (appears as the strapline). An invented proprietary
  methodology name attached to a real agency. The single most important thing
  to strip.
- **"The Accumulation Anchor" / "The Income Anchor" / "The Legacy Anchor"** —
  invented product names presented like real products.
- **"Income you cannot outlive"** — an absolute guarantee.
- **"100% — Principal protected"** as a headline statistic.
- **"Worst year? You earn 0%. Never negative."** and **"Market storms cannot
  drain it."** — floor claims with no carrier, product or cap qualification.
- **"Policy loans access cash without a taxable event"** — true only while the
  policy is not a MEC and does not lapse; stated flatly it is misleading.

The footer disclaimer it generated is, in fairness, decent and close to the
site's own language. It does not rescue the body copy.

## The chart data is the subtler problem

`chart.js` ships a 20-year `SERIES` of year-by-year index returns labelled
"Raw index return" against a "Shielded credit". Spot-checking, the index column
tracks real S&P 500 annual returns (2008 −38.5, 2022 −19.4, 2019 28.9), but:

- **no index is named and no source is given**, while the numbers are specific
  enough to read as historical fact;
- **the credit column applies a flat 10% cap across all twenty years.** No real
  product works that way — caps and participation rates are reset by the carrier,
  usually annually. A constant cap makes the shielded line look far more
  dependable than any contract can promise.

The page does say "illustrative", which is necessary and not sufficient. If any
version of this chart is ever built, the index has to be named and sourced, and
the cap has to either move or be labelled as a single assumed rate.

## Recommendation

Take `buildEnvCube()` first — it is small, it is safe, and it unblocks metal and
glass across scenes that have been avoiding both. The dispersion shader is worth
one hero object. The post chain is worth it only on a page that renders one
scene. The bar field should not be built until the data question above is
settled.

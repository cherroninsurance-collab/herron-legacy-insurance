# Glassmorphic Dashboard Engine — Master Template

`glass-dashboard-engine.master.html` is the verified, self-contained baseline for the
premium glassmorphic/fluid dashboard engine. It has zero dependencies — copy the single
file into any new build and open it in a browser.

This is the canonical "save point." `dashboard-engine.html` at the repo root is the
live working copy; keep this template untouched so any future build can start clean.

## Module map

| Module | Responsibility |
|---|---|
| 0 | Master core engine canvas, global layout, responsive grid math |
| 1 | Prismatic expanding glass cards — absolute-coordinate fullscreen morph/takeover |
| 2 | 360° 3D hardware-accelerated flip card engine |
| 3 | Liquid-glass toggle — snapping cubic-beziers + lagging pullback physics |
| 4 | Embedded SVG color-matrix liquid goo filter (`#master-liquid-goo`) |
| 5, 9 | Vanilla WebGL point buffers — particle field with gravitational cursor lerp |
| 6, 8 | Interaction listeners + mock decoupled API populating the dashboard grid |
| 7, 10 | Fixed left glide-out glass sidebar with multi-level accordion sub-drawer |
| 11 | Shader extension — chromatic emissive shockwave burst on module expansion |
| 12 | Real-time telemetry vector chart with neon gradient area fill |
| 13 | Mobile responsive engine — sidebar refolds into a top banner, cards stack single-column, 3D tilt/glare neutralized on touch viewports |

## Customization entry points

- **Data**: edit `mockApiResponse` (MODULE 8) — card types are `morph`, `chart`, `flip`.
- **Themes**: `.theme-*` blob classes (MODULE 1) pair with `themeClass`/`altThemeClass`.
- **Particles**: `particleCount`, attraction radius/force, and spark tint live in the
  MODULE 5/9/11 shader block.
- **Chart cadence**: `setTimeout(updateChart, 1200)` in MODULE 12.

## Known scaling note

The flip card uses fixed ids (`#triggerFlipFront`, `#triggerFlipBack`,
`#coreOverdriveToggle`). If the API ever returns more than one `flip` node,
convert those lookups to per-tile class queries.

# LIVING WORD — An Offline ESV Discipleship App
### Architecture & Design Document (v1.0)
*"Go therefore and make disciples of all nations…" — Matthew 28:19*

---

## MODULE 1 — MISSIONARY ECCLESIOLOGY & REVERENT VISUALS

### 1.1 The Ultimate Goal Core
The application is not a "Bible product." It is a **deployment tool for the Great Commission**, engineered around three concentric mandates:

1. **Proclamation (Evangelism).** A one-tap "Share the Gospel" pathway (The Bridge: Creation → Fall → Redemption → Restoration) that a missionary can walk through with a seeker in under ten minutes, fully offline, with visuals that carry meaning even across language barriers.
2. **Formation (Discipleship).** Structured, sequential curriculum (Module 2) built on the Discovery Bible Study and 3/3rds group patterns used by global church-planting movements — every lesson ends with *obedience* ("What will I do?") and *multiplication* ("Who will I tell?").
3. **Ecclesial Foundation (Church Planting).** A "Gather" track that teaches the marks of a local church (Word, ordinances, leadership, discipline, sending — Acts 2:42–47; Titus 1:5) so that a house group matures into a self-governing, self-supporting, self-propagating congregation. The app is designed to make itself unnecessary: it trains local leaders to teach from the Word itself.

**Theological guardrails:** Sola Scriptura in presentation (the ESV text is always visually primary; commentary is subordinate, visually recessed). No gamification of salvation — games teach *content and chronology*, never "points for grace." Every screen must pass the test: *does this magnify Christ or the interface?*

### 1.2 The Heavenly Portal Aesthetic
- **Light as theology.** "God is light" (1 John 1:5). All illumination in the UI emanates from a single upper light source — light descends *onto* the reader and the page, never radiates from UI chrome. Beams are volumetric, warm-white to gold (never rainbow-spectral, avoiding a "sci-fi" register).
- **Palette:** Sanctuary Deep (#070B14 night-sky navy) → Gate Gold (#F5D når… see token sheet in Module 3) with dawn gradients. Dark theme is default (candlelight reverence; also battery-saving on OLED field devices).
- **Materiality:** frosted "liquid glass" panels float *above* the Scripture layer like clerestory windows — the Word is the architecture, the UI is the glazing.
- **Motion doctrine:** slow, weighted, liturgical. Nothing bounces frivolously. Spring physics are critically-damped or slightly under-damped (one gentle settle, never oscillating).

### 1.3 The Splash & Opening Experience (visual script)
| Time | Beat |
|------|------|
| 0.0–0.8s | Black-navy void; a single vertical shaft of volumetric light fades in from the top edge, dust motes drifting through it (God-rays shader). |
| 0.8–1.6s | A closed Bible — rendered as a glowing 3D holographic form with gold-edged pages — rises from beneath into the shaft of light, slowly rotating 8° toward the viewer. |
| 1.6–2.8s | The cover opens (3D page-flip rig, 39-frame curve); pages fan with translucent, light-transmitting "digital vellum"; each passing page emits a soft bloom as the beam passes through it. |
| 2.8–3.6s | Pages settle open; from the open book a second, brighter beam blooms upward (light returns to its source); title fades in: **LIVING WORD**, subtitle *English Standard Version — "The grass withers, the flower fades, but the word of our God will stand forever." (Isaiah 40:8, ESV)* |
| 3.6–4.2s | Radial light-gate transition (concentric luminous arcs, evoking gates — Rev 21:25 "its gates will never be shut") dissolves into the Home screen. Total ≤ 4.2s, skippable after 1.5s. |

Implementation: full-screen WebGL fragment shader (god rays + dust + bloom) composited under a CSS-3D book rig. Zero network calls; all shader code inline.

---

## MODULE 2 — FULL ESV CURRICULUM ARCHITECTURE & MISSIONARY INSIGHTS

### 2.1 The Complete Word — and the Crossway licensing reality
The engine is built to hold **all 66 books, 1,189 chapters, 31,102 verses** locally (schema in Module 5). The ESV text itself is **© Crossway** and may not be redistributed in an app without a license. Therefore:

- The repo ships an **ingestion pipeline** (`tools/import-esv.mjs`): a licensee obtains the ESV dataset from Crossway (crossway.org/permissions — bulk/app licensing) and the tool compiles it into the app's offline bundle (`data/bible.json` → IndexedDB/SQLite).
- For development and public demo, the bundle seeds with the **World English Bible (public domain)** clearly labeled, plus brief ESV quotations within Crossway's standard quotation policy (with copyright notice).
- The schema is translation-aware (`translation_id`) so a licensed ESV bundle drops in with zero code changes.

### 2.2 Dual-Age Framework
**Track A — "Lambs" (early readers–12):** 4 units × 8 lessons: *God Makes* (Creation/Fall), *God Promises* (Abraham→David), *God Comes* (Life of Jesus), *God Sends* (Resurrection→Acts). Pattern per lesson: Hear the Story (narrated text) → See it (illustrated scene) → Play it (one game, Module 4) → Say it (memory verse) → Live it (one concrete obedience step). Language is controlled to a ~grade-2 vocabulary with the actual ESV verse always shown beside the retelling.

**Track B — "Disciples" (13–adult):** 4 courses: *The Gospel of the Kingdom* (Mark), *The Righteousness of God* (Romans), *Defending the Hope* (apologetics: reliability of Scripture, resurrection evidence, problem of suffering), *Sent Ones* (Acts + missiology + church planting). Pattern: Context (historical/literary) → Text (inductive observation) → Christ (redemptive-historical connection) → Life (application) → Multiply (teach-it-forward assignment).

### 2.3 Missionary Methodology (field-proven strategies baked in)
- **Orality / Bible storying:** every Track A lesson has an audio-first "tell the story" mode — most of the unreached world learns orally.
- **Discovery Bible Study (DBS):** Track B lessons use the reproducible question set: *What does this say about God? About people? What will I obey? Who will I share it with?*
- **3/3rds format:** Look Back (accountability) / Look Up (new passage) / Look Forward (goal + prayer) — the structure of every group session plan.
- **Cultural adaptation without doctrinal drift:** illustrations use universal imagery (light, water, bread, shepherd, seed); idioms are avoided; honor/shame and fear/power gospel framings are included alongside guilt/innocence — same gospel, contextual doorways.
- **Reproducibility test:** nothing in a lesson requires the app itself to re-teach; a disciple with a paper Bible can reproduce every lesson.

### 2.4 Christocentric Focus
Every lesson terminates at Christ by design: the lesson data model **requires** a `christ_connection` field (Luke 24:27 — "beginning with Moses and all the Prophets, he interpreted to them in all the Scriptures the things concerning himself"). Old Testament lessons trace promise→fulfillment; New Testament lessons trace person→work→response (repentance and faith, Rom 10:9). The curriculum compiler rejects any lesson missing it.

---

## MODULE 3 — LIQUID GLASS UI/UX SPECIFICATIONS

### 3.1 Design token sheet (canonical: `css/liquid-glass.css`)
- **Glass:** `--glass-blur: 24px`, `--glass-bg: rgba(255,255,255,0.07)`, `--glass-border: 1px solid rgba(255,235,190,0.22)`, inner top highlight `inset 0 1px 0 rgba(255,255,255,0.25)`.
- **Light:** `--ray-gold: #f6d78a`, `--ray-white: #fff7e6`, `--halo: radial-gradient(closest-side, rgba(246,215,138,.35), transparent)`.
- **Chromatic aberration:** ±1px red/blue text-shadow split at 8% opacity on display headings only — subtle, never on Scripture text.
- **Neumorphic depth:** dual shadow `0 18px 48px rgba(0,0,0,.55)` + `0 2px 8px rgba(0,0,0,.35)`; pressed state inverts to inset.
- **Type:** Scripture in a high-legibility serif stack; UI in a humanist sans; Scripture body 17–19px, 1.68 line-height, max 34em measure.
- **Springs:** standard interaction spring ζ=0.92, ω=14 rad/s; page-flip spring below.

### 3.2 3D Interactive Page Flip — physics spec
- Model: page as a cylinder-bend around a moving fold axis; drag maps to fold progress *p* ∈ [0,1].
- Release: semi-implicit Euler spring `a = -k(p - target) - c·v`, **k = 170, c = 24** (slightly under-damped: one soft settle), 60 Hz fixed step.
- **39-frame interpolation LUT** (for reduced-motion / low-GPU devices) generated from that exact spring at 1/60s steps — table shipped in `js/pageflip.js` (`FLIP_LUT_39`).
- Light-through-paper: backface luminance = `mix(0.0, 0.85, sin(p·π))` — the page glows brightest mid-turn as it crosses the beam; a moving specular band follows the fold crease; soft shadow is cast on the underlying page proportional to `sin(p·π)`.
- Gestures: horizontal drag (grab anywhere in outer 38% of page), velocity ≥ 0.9 screen-widths/s commits the turn; edge-tap turns with full spring animation; interruption-safe (a new gesture captures the live spring state).

---

## MODULE 4 — INTERACTIVE LEARNING & GAMIFICATION SYSTEM

### 4.1 Track A game mechanics (solemnity preserved: no timers, no failure buzzers, no loot)
1. **Verse Builder** — the memory verse appears as luminous glass word-tiles scattered in a beam of light; the child drags them into order; each correct placement makes the tile "set" into the page with a soft chime; completion triggers the whole verse glowing as one piece. Teaches word-order memory of actual ESV text.
2. **The Great Timeline** — cards depicting redemptive-history events (Creation, Flood, Exodus, David, Exile, Bethlehem, Cross, Empty Tomb, Pentecost) are placed onto an illuminated river of light flowing left→right; correct placement lights that segment of the river, visually building the one story that leads to Christ.
3. **Shepherd's Path** — a guided quest through Psalm 23 / Luke 15: the child leads a lamb through scenes (green pastures, still waters, dark valley) by answering comprehension choices drawn from the text; wrong answers gently re-read the verse rather than penalize. Ends at the Shepherd who leaves the ninety-nine.

Progress model: "Lamps lit" (Ps 119:105) per lesson — collection, not competition. No leaderboards for children.

### 4.2 Track B engagement system
- **Deep-dive reflection prompts:** DBS question engine with private journaling (stored locally, exportable), plus weekly obedience check-ins (Look Back).
- **Cross-reference constellation:** an interactive canvas map where the current verse is a star and its cross-references are connected stars; tapping traverses; themes (covenant, lamb, kingdom, temple) render as constellations across both testaments — making redemptive threads *visible*.
- **Vocabulary breakdowns:** tap-to-open cards for load-bearing words (Greek/Hebrew lemma, gloss, usage count, key texts) — e.g., *hesed*, *dikaiosynē*, *logos* — written for teach-it-forward use.
- **Multiplication ledger:** each course completion asks for the names of people the disciple is teaching; the ledger renders as generations (you → your disciples → theirs), the app's only "score."

---

## MODULE 5 — DATA LOGISTICS & STRICT OFFLINE ARCHITECTURE

### 5.1 Local storage engine
Canonical relational schema in `data/schema.sql` (SQLite dialect — maps 1:1 to Room entities on Android and Core Data on iOS; the PWA mirrors it in IndexedDB via `js/db.js`):
`translations`, `books`, `verses` (composite key translation/book/chapter/verse; FTS index for offline search), `cross_references`, `lessons`, `lesson_steps`, `memory_verses`, `game_progress`, `highlights`, `notes`, `bookmarks`, `reading_plan`, `disciples` (multiplication ledger). Full DDL in the file.

### 5.2 Zero-connectivity asset management
- **Everything in the build:** shaders inline in JS; fonts, curriculum JSON, art, and audio under `/bible-app/` and enumerated in the service-worker precache manifest (`sw.js`). First load caches all; thereafter the app never touches the network (SW serves cache-first with no runtime network fallback).
- **Install paths for the field:** (a) PWA install from a single visit; (b) Capacitor-wrapped APK side-loaded via SD card/USB-OTG; (c) offline hotspot distribution — a missionary's phone runs a $0 local Wi-Fi hotspot serving the static bundle to nearby devices (the bundle is plain static files, so any pocket web server works).
- **No telemetry, no accounts, no CDN, no analytics.** All user data stays on device.

---

## DEVELOPMENT ROADMAP
1. **P0 (this commit):** design system, splash, page-flip engine, schema, seed curriculum, three Track A games, Track B engine, service worker — working offline PWA.
2. **P1:** Crossway ESV license execution; full-text ingestion + FTS search; audio narration recording pipeline.
3. **P2:** Capacitor Android build, side-load kit, field pilot with two mission teams; localization framework (UI strings externalized).
4. **P3:** iOS build, additional language modules, leader tools (group session mode, projector mode).
5. **P4:** Multiplication analytics (on-device only), content expansion to full 4-course catalog.

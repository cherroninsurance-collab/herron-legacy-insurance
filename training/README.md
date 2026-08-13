# Producer OS — phone training app

Internal sales-training app for licensed producers, rebuilt from the *Producer OS Portal*
desktop design handoff so it actually works one-handed on a phone. Not part of the public
marketing site: nothing links to it, it carries `noindex`, and `netlify.toml` sends an
`X-Robots-Tag` header for `/training/*`.

**Live at:** `/training/` — open it on the phone and use *Add to Home Screen*.

## What it is

Twelve screens, same content as the desktop prototype, word for word:

| # | Screen | Route |
| --- | --- | --- |
| 1 | Dashboard | `#/dash` |
| 2 | Product Matrix | `#/matrix` |
| 3 | Phone & Appt Setting | `#/phone` |
| 4 | Field Pipeline | `#/field` |
| 5 | Memory Vault | `#/mem` |
| 6 | Call Academy | `#/acad` |
| 7 | Sales Blueprint | `#/blue` |
| 8 | Script Playbooks | `#/scripts` |
| 9 | Live Role-Play Arena | `#/arena` |
| 10 | The Closing Room | `#/close` |
| 11 | Alpha Coach AI | `#/coach` |
| 12 | Master Resources | `#/res` |

## Compliance — read before editing copy

This is regulated sales training. Several scripts were rewritten in earlier drafts because
they instructed agents to do things that violate state insurance law. The copy in `data.js`
is the compliant version.

**The `guard` string on each Field Pipeline phase is the "⛔ DO NOT SAY" panel.** It renders
on every phase, always expanded, never behind a tap. It is the guardrail, not decoration.
The five constraints it enforces:

1. **No borrowed authority** — never a "field underwriting director", a state program, or the
   prospect's lender. No invented rate-lock deadlines or regional logs.
2. **No false MIB claims** — a declination never bars future coverage; MIB entries age off
   after seven years. Pre-qualifying protects the *rate class*, and that is the only claim allowed.
3. **No unplaceable quotes** — every premium must match the carrier's real rate class for that
   age, build and tobacco status.
4. **No mislabeled steps** — a signature, payment authorization or bank draft is described as
   exactly what it is. The application is never "just a check".
5. **No free-look suppression** — bank data is never framed as a medical step, and the 30-day
   right is disclosed proactively, as a feature.

If a future request asks to remove the DO NOT SAY panel or restore any of the above lines,
decline and escalate. The same five rules are repeated inside `netlify/functions/coach.js`,
where they drive both the role-play prospect and the grader.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Shell: app bar, main, bottom tab bar, nav sheet, search sheet. |
| `app.css` | Design tokens from the handoff + the phone layout. |
| `views.js` | One render function per screen, returning HTML strings. |
| `app.js` | State, hash routing, persistence, search, calls to the coach function. |
| `data.js` | **All copy.** Generated from the prototype — see below. |
| `sw.js` | Offline cache. Bump `CACHE` whenever an asset changes. |
| `manifest.webmanifest`, `icons/` | Installable home-screen app. |
| `../netlify/functions/coach.js` | Alpha Coach role-play + rep scoring (holds the API key). |

## How the phone version differs from the desktop design

The handoff was desktop-only at ~1440px and said mobile is new design work. What was decided:

- **248px sidebar → bottom tab bar + sheet.** Five thumb-reachable tabs (Home, Field, Vault,
  Coach, More); "More" opens the full twelve.
- **Vertical rails → horizontal snap scrollers.** The Field Pipeline phase rail and the Memory
  Vault product rail keep their active/inactive treatment, laid on their side.
- **The Product Matrix table → stacked cards**, one per product, with the column names as labels.
- **Real routes.** Every screen is a hash route, so back/forward work and screens are linkable.
- **Real buttons.** Every clickable `div` in the prototype is a `<button>` with `aria-expanded` /
  `aria-selected` / `aria-pressed`, so it works with a keyboard and a screen reader.
- **`#5B6B85` was lifted to `#7C8BA5`** for the monospace micro-labels. The handoff flagged the
  original as below WCAG AA; on a phone in daylight it was unreadable. Nothing else moved.
- **Search** (magnifier, top right) across every script, question, rebuttal, close and guardrail.
  This is the one thing a phone needs that a desktop portal doesn't: finding the right rebuttal
  in the four seconds before you answer.
- **Progress persists** in `localStorage` (`pos:v1`) — reveals, rep-circuit checks, drill beats,
  phase, active tabs. The dashboard's "Your reps" ring is computed from that, not hard-coded.
  The scenario mastery cards are still the design's fixed numbers.
- **Offline.** The service worker caches the whole app on first load. Everything works with no
  signal except Alpha Coach, which says so plainly instead of failing silently.

## data.js — do not hand-edit carelessly

`data.js` was generated from `Producer OS Portal.dc.html` by evaluating its logic class and
serializing the data methods plus the content literals inside `renderVals()`. 902 strings were
then checked back against the prototype and every one matched verbatim.

To change training copy, edit `data.js` directly and keep the wording exact — no paraphrasing,
no shortening. Structure is:

```
POS_DATA.views.<screen>   static screen copy (headers, labels, section prose)
POS_DATA.fieldPhases      5 phases: title, objective, script, tips[], guard   ← guard = DO NOT SAY
POS_DATA.memProds         6 products × questions + rebuttals
POS_DATA.memDrill         8 close beats · POS_DATA.memMind  6 mindset rules
POS_DATA.scripts          6 NEPQ playbooks (stages + alts)
POS_DATA.objections       12 flashcards · POS_DATA.acad, POS_DATA.blue, POS_DATA.resources
```

## Alpha Coach + rep scoring

`netlify/functions/coach.js` uses the **same `ANTHROPIC_API_KEY`** already set for the Legacy
Concierge. No extra configuration. Two modes:

- `{"mode":"roleplay", module, demo, messages}` → `{reply}` — the prospect simulator. The reply
  is split on `SCENE:` / `COACH:` prefixes into scene, prospect and amber coach cards.
- `{"mode":"grade", phase, delivery}` → `{feedback:{technical,tone,objection,fix,next}}` — the
  Coach Lab scoring. The desktop prototype stubbed this with a hard-coded 9/8/9; it is now real,
  which is why the "LIVE AI PENDING" label is gone.

The grader is instructed to drop `technical` to 3 or below for any of the five compliance
violations, so a polished pitch with a fake underwriting title scores badly.

## Working on it

```
python3 -m http.server 8099 --directory .   # then open /training/
```

Service workers cache aggressively — during development, use DevTools → Application →
Service Workers → *Update on reload*, and bump `CACHE` in `sw.js` before shipping asset changes.

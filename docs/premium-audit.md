# Herron & Co. — Premium Build Blueprint

Critical audit of `index.html` (206 KB, 16 sections, ~16,700 px tall) with exact fixes.
Ordered by revenue impact, not by effort.

Findings are measured from the current source, not eyeballed:

| Signal | Current state | Verdict |
| --- | --- | --- |
| Type sizes | 12 distinct `clamp()` values, incl. `28px/3.4vw/42px` **and** `29px/3.4vw/42px` | Drift, not a scale |
| Spacing tokens | **0** (`--space-*` absent); values like `34px 34px 38px`, `46px 48px 40px` | Hand-nudged |
| Shadows | 16 distinct `box-shadow` values, 1 token | No elevation system |
| CTA labels | 21 unique; **4 different labels for "book a call"** | Kills muscle memory |
| Conversion paths | **5 competing**, plus a double closing CTA | Decision paralysis |
| `<img>` sizing | **18 of 21** lack `width`/`height` | Layout shift (CLS) |
| Logo assets | 21 raster files, **0** WebP/AVIF, 732 KB | Amateur signal |
| Modern CSS | `text-wrap:balance` 0 · `tabular-nums` 0 · `content-visibility` 0 | Leaving polish on the table |

---

## 1. Premium visual aesthetic & effects

### 1.1 The single biggest tell: there is no scale

Expensive design is not prettier — it is **more consistent**. Right now a `28px` heading
sits beside a `29px` heading. Nobody consciously notices; everybody feels it. Replace all
ad-hoc values with one token block. Paste this at the top of `:root`:

```css
:root{
  /* fluid modular type scale — 1.25 ratio, viewport-interpolated */
  --step--1: clamp(0.83rem, 0.80rem + 0.15vw, 0.94rem);
  --step-0:  clamp(1.00rem, 0.95rem + 0.25vw, 1.13rem);
  --step-1:  clamp(1.25rem, 1.15rem + 0.50vw, 1.55rem);
  --step-2:  clamp(1.56rem, 1.35rem + 1.05vw, 2.15rem);
  --step-3:  clamp(1.95rem, 1.55rem + 2.00vw, 3.00rem);
  --step-4:  clamp(2.44rem, 1.70rem + 3.70vw, 4.20rem);
  --step-5:  clamp(3.05rem, 1.60rem + 7.25vw, 5.80rem);

  /* 8pt spacing scale — every gap on the page comes from here */
  --sp-1:.25rem; --sp-2:.5rem;  --sp-3:.75rem; --sp-4:1rem;
  --sp-6:1.5rem; --sp-8:2rem;   --sp-12:3rem;  --sp-16:4rem;
  --sp-24:6rem;  --sp-32:8rem;  --sp-40:10rem;

  /* layered elevation — real objects cast more than one shadow */
  --e-1:0 1px 2px rgba(8,18,38,.06), 0 2px 8px -2px rgba(8,18,38,.08);
  --e-2:0 2px 4px rgba(8,18,38,.06), 0 8px 24px -8px rgba(8,18,38,.14);
  --e-3:0 4px 8px rgba(8,18,38,.07), 0 18px 48px -12px rgba(8,18,38,.22),
        0 40px 80px -32px rgba(8,18,38,.28);

  /* motion tokens — one spring, used everywhere */
  --ease-out:cubic-bezier(.16,1,.3,1);
  --ease-spring:cubic-bezier(.34,1.56,.64,1);
  --dur-fast:.18s; --dur:.42s; --dur-slow:.9s;
}
```

Then enforce the vertical rhythm — **one** band padding, no exceptions:

```css
.iul-band,.ann-band,.tools-band,.ai-band,.fitcheck,
.bp-band,.quote-band,.states-band,.about-band,
.booking,#faq,#coverage{ padding:var(--sp-32) 0; }
@media(max-width:880px){
  .iul-band,.ann-band,.tools-band,.ai-band,.fitcheck,
  .bp-band,.quote-band,.states-band,.about-band,
  .booking,#faq,#coverage{ padding:var(--sp-24) 0; }
}
/* kill the asymmetric hand-nudges */
.wt-body{ padding:var(--sp-8); }
.fit-body{ padding:var(--sp-12) var(--sp-12) var(--sp-8); }
```

### 1.2 Typography details that read as "expensive"

```css
h1,h2,h3,.big,.hero h1{
  text-wrap:balance;                 /* no orphan words in headlines */
  letter-spacing:-.022em;            /* optical tightening at display sizes */
  font-feature-settings:"ss01","cv01";
}
p,.lede{ text-wrap:pretty; max-width:68ch; }   /* measure control */
/* stats must not wobble while counting up */
.hstat b,.stat b,[data-count]{
  font-variant-numeric:tabular-nums;
  font-feature-settings:"tnum" 1;
}
```

`tabular-nums` on the count-up stats is a two-line fix for a visible defect: the numbers
currently **shift width** as they animate 0→20.

### 1.3 Refined liquid glass (replaces the flat translucent panes)

Real glass has an *inner* highlight on the top edge and a shadow underneath. One border
colour does not sell it:

```css
.glass{
  position:relative; border-radius:16px;
  background:
    linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.03) 42%,rgba(255,255,255,0));
  -webkit-backdrop-filter:blur(18px) saturate(1.7);
          backdrop-filter:blur(18px) saturate(1.7);
  box-shadow:var(--e-2), inset 0 1px 0 rgba(255,255,255,.22);
}
/* hairline gradient border — brass at the top, fading to nothing */
.glass::before{
  content:""; position:absolute; inset:0; border-radius:inherit; padding:1px;
  background:linear-gradient(160deg,rgba(226,180,92,.55),rgba(226,180,92,.06) 40%,rgba(255,255,255,.10));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
          mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor; mask-composite:exclude; pointer-events:none;
}
```

### 1.4 Cursor-tracking spotlight on cards (high perceived value, ~15 lines)

```css
.cov-card,.ann-card,.tool-card{
  --mx:50%; --my:50%;
  position:relative; isolation:isolate;
  transition:transform var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);
}
.cov-card::after{
  content:""; position:absolute; inset:0; border-radius:inherit; z-index:-1;
  background:radial-gradient(340px circle at var(--mx) var(--my),
             rgba(226,180,92,.16), transparent 60%);
  opacity:0; transition:opacity var(--dur) var(--ease-out);
}
.cov-card:hover{ transform:translateY(-4px); box-shadow:var(--e-3); }
.cov-card:hover::after{ opacity:1; }
```

```js
/* one delegated listener for every card — no per-card handlers */
addEventListener('pointermove',e=>{
  const c=e.target.closest('.cov-card,.ann-card,.tool-card'); if(!c) return;
  const r=c.getBoundingClientRect();
  c.style.setProperty('--mx',(e.clientX-r.left)+'px');
  c.style.setProperty('--my',(e.clientY-r.top)+'px');
},{passive:true});
```

### 1.5 Retire the JS scroll-reveal for CSS scroll-driven animation

You currently run an `IntersectionObserver` to add `.in`. Modern engines do this on the
compositor, and it degrades cleanly:

```css
@supports (animation-timeline: view()){
  .reveal{
    opacity:0; transform:translateY(24px);
    animation:revealIn linear both;
    animation-timeline:view();
    animation-range:entry 8% cover 26%;
  }
  @keyframes revealIn{to{opacity:1;transform:none}}
}
@media(prefers-reduced-motion:reduce){ .reveal{animation:none;opacity:1;transform:none} }
```

Keep the JS observer inside `@supports not (animation-timeline: view())` as the fallback.

---

## 2. Elite copywriting & value proposition

### 2.1 Fix the CTA chaos first

You have **21 distinct button labels**, including four for one action:
"Book a call" · "Book a free 15-minute call" · "Book 15 minutes with me" · "Book your free call".
And "Get my carrier illustration" appears twice in two different button styles.

Collapse to **three** verbs, used site-wide with zero variation:

| Job | Use exactly this | Never |
| --- | --- | --- |
| Primary (talk to Connor) | **Get my numbers — 15 min** | "Book a call", "Book your free call" |
| Secondary (self-serve) | **Build my Blueprint** | "Draw your own plan" |
| Tertiary (ask) | **Ask the Concierge** | "Ask your first question →" |

Why "Get my numbers" beats "Book a call": it names the *outcome*, not the *obligation*.
"Book" costs the visitor something; "get" gives them something.

**Risk-reversal microcopy** directly under every primary CTA (this is what removes
hesitation, not the button label):

```html
<a class="btn btn-brass mag" href="#booking">Get my numbers — 15 min</a>
<span class="cta-sub">No email required to start · $0 to work with us · A real licensed agent, not a call center</span>
```

```css
.cta-sub{
  display:block; margin-top:var(--sp-3);
  font-size:var(--step--1); color:var(--ink-soft); letter-spacing:.01em;
}
```

### 2.2 Hero rewrite

Current: *"Protection built for your life. Delivered at the speed of it."*
It is rhythmic but says nothing falsifiable — "protection built for your life" is true of
every policy ever sold. High-ticket copy leads with a **specific, defensible claim**.

Three options, strongest first:

> **A.** *"Your family keeps the house. Even if the worst happens tomorrow."*
> Mortgage protection, IUL, long-term care and annuities — shopped across 20+ carriers by
> an independent agent who gets paid the same either way. Fifteen minutes, real numbers,
> and the honest answer even when it costs us the sale.

> **B.** *"Twenty carriers compete. You pick the winner."*
> Independent means we work for you, not a quota. Same premium as buying direct — you just
> get someone whose job is to find the cheapest "yes" instead of selling one company's "no."

> **C.** *"The honest quote, even when it costs us the sale."*

**A** is the one to ship: it opens with the reader's asset (the house), names the fear
without melodrama, and closes on the differentiator (independence + honesty).

### 2.3 Section headline upgrades

| Section | Current | Rewrite | Why |
| --- | --- | --- | --- |
| `#coverage` | "The right coverage for every stage of life." | **"Seven products. One that actually fits you."** | Specific number; implies triage, not a catalogue |
| `#ai` | "Every insurance question. Answered instantly." | **"Ask the dumb questions. No one's watching."** | Names the real barrier — embarrassment |
| `#fitcheck` | "Four questions. Your best path. No email required." | Keep — it is the best headline on the page | Concrete, low-friction, already earns its place |
| `#quotes` | "Just want a number? Move the sliders." | Keep | Reads the visitor's mind |
| `#about` | "Life insurance shouldn't be complicated." | **"You'll be talking to me. Connor."** | Generic complaint → named human |
| `.final` | "Your family's plan shouldn't be 'hope nothing happens.'" | **"Fifteen minutes now, or a phone call your family can't afford later."** | Real stakes, single door |

### 2.4 Kill the weak phrases (find-and-replace)

- "Don't take our word for it" → presupposes doubt you just created. Use **"Stress-test it yourself."**
- "explained like a human" → say **"in plain English"** (shorter, less try-hard).
- "Answered straight, the way we'd want it." → **"The questions people actually ask."**
- "Zero pressure" → telling someone there is no pressure applies pressure. Delete; the
  "$0" and "no email" proofs already carry it.

---

## 3. Cognitive flow & visual hierarchy

### 3.1 The critical structural defect: five front doors

The page offers five interactive entry points at near-identical visual weight —
Concierge chat (`#ai`), fit quiz (`#fitcheck`), Blueprint (`#blueprint`), quote sliders
(`#quotes`), and booking (`#booking`) — plus "Buy online with Ethos." Every added path
divides attention; on high-ticket pages this measurably lowers conversion.

**Restructure to one spine with optional branches:**

```
HERO            → ONE primary CTA + risk-reversal line
Carrier proof   → logos (trust, immediately after the claim)
#fitcheck       → the 4-question triage becomes THE entry point (lowest friction)
#coverage       → seven products, revealed as the answer to the quiz
#iul-strategy   → depth for the researcher  ─┐
#annuities      → depth for the retiree      ─┼─ collapse into ONE tabbed
#tools          → Matrix + Blueprint         ─┘   "Go deeper" section
#quotes         → the number
#about          → the human (Connor)
#booking        → the single close
FAQ             → objection handling
```

Demote `#ai` from a full band to a **persistent floating affordance** — the chat FAB
already exists, so this is deletion, not construction.

### 3.2 Delete the double close — this is costing you conversions

`.final` currently says *"Whichever door you pick"* and offers three buttons, and is then
**immediately followed** by `.optin` saying *"Not ready to talk yet? Then don't."*

You are talking your own visitor out of the primary action, one section after asking for
it. Merge into a single close with one primary and one text-link escape hatch:

```html
<section class="final">
  <div class="wrap">
    <div class="eyebrow">One conversation</div>
    <h2 class="big">Fifteen minutes now, or a phone call<br>your family can't afford later.</h2>
    <p class="lede">You'll leave knowing exactly where your family stands — the number,
       the carrier, and the monthly cost. Whether you buy is genuinely up to you.</p>
    <a class="btn btn-brass mag" href="#booking">Get my numbers — 15 min</a>
    <span class="cta-sub">No email required to start · $0 to work with us · Licensed in 12 states</span>
    <p class="final-alt">Not ready to talk? <a href="protection-blueprint.html">Build your Blueprint privately</a> — no email, no salesperson.</p>
  </div>
</section>
```

Removing the `.optin` band also removes ~376 px of page height and one full section of
competing visual weight.

### 3.3 Hierarchy fixes

1. **The hero has four competing focal points** — headline, chiplets, 4-stat row, and the
   WebGL heron. Cut the stat row from four to **two** (`20+ carriers`, `$0 to work with us`);
   the other two are decoration.
2. **Eyebrows are doing no work.** Every section opens with the same treatment, so it reads
   as template. Reserve the eyebrow for the three *money* sections and drop it elsewhere.
3. **Seven coverage cards in one grid** is a wall. Group as **3 + 4** with a subhead split
   ("Protect what you owe" / "Build what you keep").
4. `max-width` is inconsistent: `880px` (7×), `820px` (3×), `860px` (2×), `760px` (2×).
   Pick **two** container widths and tokenize:
   ```css
   :root{ --w-text:68ch; --w-wide:1160px; }
   ```

---

## 4. Clean, acquisition-ready code signals

These are what a technical buyer's Lighthouse run and a 10-minute code skim will surface.

### 4.1 Layout shift — 18 of 21 images lack dimensions (highest-priority fix)

Every logo in the marquee reflows on load. Add intrinsic sizing:

```html
<img src="logos/ethos.png" alt="Ethos" width="160" height="48"
     loading="lazy" decoding="async">
```

```css
.carrier img{ width:auto; height:34px; aspect-ratio:160/48; }
```

### 4.2 Convert the 21 raster logos (732 KB → ~120 KB)

```bash
# AVIF with PNG fallback, preserving transparency
for f in logos/*.png images/*.png; do
  cwebp -q 82 -alpha_q 90 "$f" -o "${f%.png}.webp"
  avifenc --min 24 --max 34 "$f" "${f%.png}.avif"
done
```

```html
<picture>
  <source srcset="logos/ethos.avif" type="image/avif">
  <source srcset="logos/ethos.webp" type="image/webp">
  <img src="logos/ethos.png" alt="Ethos" width="160" height="48" loading="lazy" decoding="async">
</picture>
```

### 4.3 Font loading is render-blocking

```html
<!-- preconnect is already present; add the preload + async pattern -->
<link rel="preload" as="style"
      href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" media="print" onload="this.media='all'"
      href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
```

Better still: self-host the four weights actually used as `woff2` and drop the third-party
round trip entirely. Note the current request asks for Sora `400;500;600;700` on the
homepage but `400;600;700;800` on the cover — two different font payloads across pages,
so nothing is shared from cache.

### 4.4 Split the 206 KB inline HTML

Everything inline means **zero caching** — a repeat visitor re-downloads all CSS and JS on
every page, and `index.html` / `experience.html` / the two tool pages each ship their own
copy of nearly identical rules. Extract:

```
css/tokens.css     ← the :root block from §1.1
css/base.css       ← reset, typography, buttons, glass
css/home.css       ← homepage-only sections
js/hero-scene.js   ← the threshold WebGL scene (shared by both heroes via a uSun param)
```

The two hero shaders are currently **duplicated** between `index.html` and
`experience.html`. One `hero-scene.js` exporting `initHeroScene(canvas,{sun,rayGain,cloudCeil})`
removes ~120 lines of copy-paste and guarantees the two pages can't drift apart again.

### 4.5 Long-page rendering

15 sections and ~16,700 px of DOM are all being styled and painted up front:

```css
.iul-band,.ann-band,.tools-band,.fitcheck,.bp-band,
.quote-band,.states-band,.about-band,.booking,#faq{
  content-visibility:auto;
  contain-intrinsic-size:auto 900px;   /* prevents scrollbar jump */
}
```

### 4.6 Two live WebGL contexts on one screen

The homepage runs the threshold scene **and** the raymarched heron simultaneously, plus
`liquid-glass.js`. The `IntersectionObserver` pause and reduced DPR on coarse pointers are
already in place — good. Two remaining guards:

```js
// 1) never start the heron if the GPU is already under pressure / battery saving
const saveData = navigator.connection?.saveData || matchMedia('(prefers-reduced-motion:reduce)').matches;
// 2) release the context on long backgrounding instead of just pausing the RAF loop
document.addEventListener('visibilitychange',()=>{ run = !document.hidden; if(run) requestAnimationFrame(loop); });
```

### 4.7 Accessibility gaps a buyer's audit will flag

- The FAQ toggles already set `aria-expanded` (13 uses) — good. What is missing is
  `aria-controls` pairing each button to its panel id (only 2 uses on the page).
- The 4-stat count-up should be wrapped in `aria-live="off"` so screen readers announce the
  final value once, not every tick.
- `cursor:none` on the cover page (`experience.html`) with a custom cursor div is a
  usability trap on hybrid touch/trackpad devices — gate it behind `(hover:hover) and (pointer:fine)`.
- Brass `#C9973B` on `--cloud #F4F6FA` measures **2.43:1 — fails WCAG AA for text at every
  size.** Keep brass for borders, icons and large display type only; for small text on light
  backgrounds use `#8A6420` (**4.95:1, passes AA**). On navy the brass is fine —
  `#C9973B` on `#081226` is 7.09:1 and `#E2B45C` is 9.71:1.

---

## Priority order

1. **§3.2** — delete the double close (`.optin`). Biggest conversion win, smallest diff.
2. **§2.1** — collapse 21 CTA labels to 3 + risk-reversal microcopy.
3. **§4.1 / §4.2** — image dimensions + AVIF/WebP. Fixes CLS and the amateur signal.
4. **§1.1** — token block, then sweep the ad-hoc type/spacing values.
5. **§2.2** — hero rewrite to the "keeps the house" claim.
6. **§3.1** — collapse the five front doors into one spine.
7. **§4.4** — extract shared CSS/JS; de-duplicate the two hero shaders.
8. **§1.3 / §1.4** — refined glass + cursor spotlight.
9. **§4.5 / §4.7** — `content-visibility`, a11y, contrast.

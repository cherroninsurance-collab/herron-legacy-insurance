# Herron & Co. — Premium Upgrade Spec

Drop-in specs for four sections of `index.html`. Every new class is namespaced **`hx-`**
(verified: zero existing matches in the file), so nothing can collide with your existing
`liquid-glass`, `cover-card`, `go`, `deep`, `cap-card`, `reveal`, `rise`, or `hs-*` classes.

---

## READ THIS FIRST — one hard conflict your brief doesn't account for

Your **FLOW PROTECTION RULE** and the **3D pinned slider** are in direct conflict as
specified, and it is not a small thing:

**Five of your nine nav links point *into* the coverage cards.**

| Nav / mobile-sheet link | Target | Is that a coverage card? |
| --- | --- | --- |
| Mortgage Protection | `#mortgage` | **Yes** |
| Disability | `#disability` | **Yes** |
| Long-Term Care | `#ltc` | **Yes** |
| Final Expense | `#final-expense` | **Yes** |
| Term & Whole | `#term-whole` | **Yes** |
| IUL | `#iul-strategy` | No — separate band |
| Annuities | `#annuities` | No — separate band |

`ScrollTrigger` with `pin: true` takes that section out of normal document flow while
pinned. A plain `href="#mortgage"` jump then lands the browser at a pinned container with
the target card rotated somewhere off-axis — so **all five links silently break**, on
desktop nav *and* the mobile sheet. Rotating the cards in 3D also means four of the seven
are facing away from the camera at any moment, and a back-facing card still eats clicks
meant for the front one unless pointer-events are managed.

I've solved both in §2 rather than just flagging them — see **2.4 (anchor shim)** and
**2.5 (hit-testing)**. Do not ship the slider without those two pieces.

Three more collisions I found in your current code that will bite this specific feature:

1. **`html{scroll-behavior:smooth}`** (line 65) — breaks ScrollTrigger's scroll math and
   any programmatic `scrollTo`. §2.4 scopes it off while the wheel is active.
2. **`.cover-grid>.reveal{opacity:0;transform:rotateY(-60deg)…}`** — your existing
   ALCHE flip-reveal fights GSAP for the same `transform`. §2.2 neutralises it *only* in
   3D mode.
3. **`content-visibility:auto`** is on your long bands. `#coverage` is correctly **not**
   in that list — keep it out, or ScrollTrigger will mis-measure the pin.

---

## 1 · HERO — elite positioning + liquid glass

### 1.1 Copy

Current: *"Protect what you've built. Then make it pay you back."* That's decent but it's
a benefit couplet, not a positioning statement. It doesn't say what you **are**. Elite
brands lead with a category claim, then prove it.

**Ship this one:**

> **Eyebrow:** INDEPENDENT RISK ARCHITECT · LEHIGH VALLEY · LICENSED IN 12 STATES
>
> **H1:** Most agents sell you a policy.
> **We engineer the plan that outlives you.**
>
> **Sub:** Mortgage protection, indexed universal life, hybrid long-term care, final
> expense, disability income and fixed annuities — architected across 20+ carriers by an
> independent agent who earns the same regardless of which one you choose. Fifteen
> minutes, real numbers, and the honest answer even when it costs us the sale.

Why it beats the current line: "Most agents sell you a policy" names the enemy in six
words; "engineer / architect" claims expertise instead of describing a product; and the
differentiator (paid the same either way) is the only sentence a competitor can't copy.

**Two alternates**, if you'd rather stay warmer or go harder:

- *Warmer:* **"The plan your family never has to think about."**
- *Harder:* **"We get paid the same either way. That's the whole pitch."**

Kill these phrases wherever they survive: *"shouldn't be complicated"* (every agency says
it), *"peace of mind"* (means nothing, priced at zero), *"we're here for you"*.

### 1.2 Liquid glass on the hero copy card

Your hero copy currently sits directly on the WebGL scene with no container. On a
gateway-lit background that's what costs it authority — premium heroes float the copy on
a defined surface. This adds one, using real specular technique rather than a flat tint.

**HTML** — wrap the *existing* copy column only. Do not touch `.hero-visual`, the canvas,
the chiplets, or any button:

```html
<!-- index.html — inside .hero-inner, wrap the left column's existing children -->
<div class="hx-hero-card">
  <!-- existing: <div class="pill">…, <h1 class="rise d1">…, <p class="lede rise d2">…,
       <div class="hero-ctas rise d3">…, <span class="cta-sub">…, <div class="hero-stats">… -->
</div>
```

**CSS** — append near the end of your `<style>` block:

```css
/* ============ hx: hero glass card ============ */
.hx-hero-card{
  position:relative;
  padding:clamp(22px,3.2vw,40px) clamp(20px,3vw,38px);
  border-radius:22px;
  background:
    linear-gradient(158deg,rgba(255,255,255,.085) 0%,rgba(255,255,255,.028) 38%,rgba(255,255,255,0) 72%),
    linear-gradient(180deg,rgba(8,18,38,.42),rgba(8,18,38,.20));
  -webkit-backdrop-filter:blur(16px) saturate(1.45);
          backdrop-filter:blur(16px) saturate(1.45);
  box-shadow:
    0 2px 4px rgba(3,8,20,.18),
    0 18px 48px -14px rgba(3,8,20,.55),
    0 48px 96px -40px rgba(3,8,20,.65),
    inset 0 1px 0 rgba(255,255,255,.22);
  isolation:isolate;
}
/* hairline gradient border — brass at the light source, fading away from it */
.hx-hero-card::before{
  content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;
  background:linear-gradient(158deg,rgba(226,180,92,.62),rgba(226,180,92,.10) 34%,rgba(255,255,255,.14) 70%,rgba(255,255,255,.04));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
          mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude;
  pointer-events:none;z-index:-1;
}
/* specular sweep — a single slow highlight, not a shine loop */
.hx-hero-card::after{
  content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:-1;
  background:linear-gradient(122deg,transparent 34%,rgba(255,246,224,.13) 47%,transparent 60%);
  background-size:280% 100%;background-position:170% 0;
  animation:hxSheen 9s cubic-bezier(.4,0,.2,1) 2.4s infinite;
}
@keyframes hxSheen{0%{background-position:170% 0}42%,100%{background-position:-90% 0}}

/* phones already run two shaders — keep the surface, drop the expensive parts */
@media (pointer:coarse){
  .hx-hero-card{
    -webkit-backdrop-filter:none;backdrop-filter:none;
    background:linear-gradient(180deg,rgba(8,18,38,.62),rgba(8,18,38,.40));
  }
  .hx-hero-card::after{animation:none;display:none}
}
@media (prefers-reduced-motion:reduce){ .hx-hero-card::after{animation:none} }
/* no-backdrop-filter browsers get a solid surface so contrast never drops */
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){
  .hx-hero-card{background:linear-gradient(180deg,rgba(8,18,38,.72),rgba(8,18,38,.5))}
}
```

> **Safety Check: Passed.**
> • `.hx-hero-card` is a new class — 0 existing matches for `hx-` in `index.html`.
> • Purely a **wrapper**; no IDs, `data-*`, listeners, or `href`s are touched. Your
> delegated handlers (`.go[data-track]`, `[data-capsend]`, `.hero-ctas .btn`) match on
> descendants, so an extra ancestor `div` changes nothing.
> • `isolation:isolate` + `z-index:-1` on the pseudos keeps them **behind** the text but
> inside the card's own stacking context, so they can't paint over your CTAs.
> • Pseudos are `pointer-events:none` — buttons stay clickable.
> • Padding is added to a wrapper, not to `h1`/`p`, so no existing type metrics shift.
> • Mirrors your existing `@supports not (backdrop-filter)` fallback pattern, so
> contrast holds on old Firefox/Safari.
> • Respects your `@media (pointer:coarse)` mobile-lite budget — no new blur on phones.

---

## 2 · PRODUCTS — GSAP ScrollTrigger 3D wheel

### 2.1 Load GSAP

Place immediately **before** your existing `</body>`. `defer` guarantees it runs after
your inline scripts have registered their listeners:

```html
<script defer src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
<script defer src="js/hx-wheel.js"></script>
```

Version is **pinned to 3.12.5** deliberately — never point a production insurance site at
a floating `@latest` CDN.

### 2.2 CSS — 3D only when JS says so

The critical design decision: **every 3D style is gated behind `.hx-on`**, which only JS
adds. If the CDN is blocked, GSAP 404s, or a script error occurs, your seven cards remain
the ordinary working grid. Content is never hidden by CSS awaiting JS.

```css
/* ============ hx: 3D product wheel ============ */
.hx-stage{perspective:1000px;perspective-origin:50% 46%}
.hx-stage .hx-wheel{transform-style:preserve-3d}

/* activated state */
.hx-on .hx-wheel{position:relative;display:block;height:clamp(430px,66vh,620px);margin-inline:auto;max-width:none}
.hx-on .hx-wheel .cover-card{
  position:absolute;top:0;left:50%;width:min(520px,88vw);margin:0;
  transform-style:preserve-3d;will-change:transform,opacity;
  pointer-events:none;                 /* only the front card is live — see 2.5 */
}
.hx-on .hx-wheel .cover-card.hx-front{pointer-events:auto}

/* neutralise the existing flip-reveal so GSAP owns transform (conflict #2) */
.hx-on .cover-grid>.reveal,
.hx-on .cover-grid>.reveal.in{opacity:1!important;transform:none!important;transition:none!important;animation:none!important}

/* while pinned, smooth-scroll must be off (conflict #1) */
html.hx-pinned{scroll-behavior:auto!important}

.hx-progress{display:flex;gap:6px;justify-content:center;margin-top:26px}
.hx-progress i{width:26px;height:3px;border-radius:2px;background:rgba(226,180,92,.24);transition:background .3s,transform .3s}
.hx-progress i.on{background:var(--brass-bright);transform:scaleY(1.8)}
```

### 2.3 HTML — one wrapper, cards untouched

```html
<!-- index.html · #coverage — add ONLY the .hx-stage wrapper + progress bar -->
<div class="hx-stage">
  <div class="cover-grid hx-wheel">
    <!-- your seven <article class="cover-card liquid-glass reveal" id="…"> stay EXACTLY as-is,
         including every <button class="go" data-track="…"> and <a class="deep" href="…"> -->
  </div>
</div>
<div class="hx-progress" aria-hidden="true"></div>
```

### 2.4 JS — `js/hx-wheel.js`

```js
/* Herron & Co. — scroll-driven 3D product wheel.
   Desktop + fine pointer only. Degrades to the normal grid everywhere else. */
(function () {
  'use strict';
  var OK = window.gsap && window.ScrollTrigger;
  var fine = matchMedia('(pointer:fine)').matches;
  var calm = matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (!OK || !fine || calm || innerWidth < 1024) return;   // grid stays, untouched

  var stage = document.querySelector('.hx-stage');
  var wheel = stage && stage.querySelector('.hx-wheel');
  if (!stage || !wheel) return;

  var cards = Array.prototype.slice.call(wheel.querySelectorAll('.cover-card'));
  if (cards.length < 3) return;

  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('hx-pinned');
  stage.classList.add('hx-on');
  document.querySelector('#coverage').classList.add('hx-on');

  var n = cards.length;
  var step = 360 / n;
  // radius that stops neighbours intersecting: (w/2) / tan(step/2)
  var w = Math.min(520, innerWidth * 0.88);
  var radius = Math.round((w / 2) / Math.tan((step / 2) * Math.PI / 180));

  cards.forEach(function (c, i) {
    gsap.set(c, {
      xPercent: -50,
      rotationY: i * step,
      transformOrigin: '50% 50% ' + (-radius) + 'px',
      z: 0
    });
  });

  var progress = document.querySelector('.hx-progress');
  if (progress) {
    progress.innerHTML = cards.map(function () { return '<i></i>'; }).join('');
  }
  var dots = progress ? Array.prototype.slice.call(progress.children) : [];

  function face(idx) {
    cards.forEach(function (c, i) { c.classList.toggle('hx-front', i === idx); });
    dots.forEach(function (d, i) { d.classList.toggle('on', i === idx); });
  }
  face(0);

  var st = ScrollTrigger.create({
    id: 'hxWheel',
    trigger: stage,
    start: 'center center',
    end: '+=' + (n * 320),
    pin: true,
    pinSpacing: true,
    scrub: 1,
    anticipatePin: 1,
    animation: gsap.to(wheel, {
      rotationY: -(step * (n - 1)),
      ease: 'none'
    }),
    onUpdate: function (self) {
      face(Math.round(self.progress * (n - 1)));
    }
  });

  /* ---- ANCHOR SHIM: keeps the five nav links working (see READ THIS FIRST) ---- */
  var ids = cards.map(function (c) { return c.id; }).filter(Boolean);
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var idx = ids.indexOf(id);
    if (idx < 0) return;                       // not a card → your normal jump, untouched
    e.preventDefault();
    var y = st.start + (st.end - st.start) * (idx / (n - 1));
    window.scrollTo({ top: y, behavior: 'auto' });
    face(idx);
  }, true);

  addEventListener('resize', function () { ScrollTrigger.refresh(); }, { passive: true });
})();
```

> **Safety Check: Passed.**
> • **Guard clause first.** If GSAP is absent, pointer is coarse, motion is reduced, or
> the viewport is <1024px, the function returns **before touching the DOM** — `.hx-on` is
> never added, so the CSS in 2.2 stays inert and your grid renders normally. No CSS hides
> content pending JS.
> • **Cards are never re-parented or rewritten.** Only inline `transform`s (via
> `gsap.set`) and one class (`hx-front`) are applied. IDs, `data-track`, `.go` buttons and
> `.deep` anchors are byte-for-byte unchanged.
> • **Delegated listeners survive** — your `.go[data-track]` and `[data-capsend]` handlers
> are bound on `document`, and `closest()` still resolves through the added wrapper.
> • **Hit-testing solved:** all cards are `pointer-events:none`, and only `.hx-front` is
> `auto`, so a card rotated away can never intercept a click meant for the visible one.
> No `backface-visibility:hidden` — that would blank cards mid-rotation.
> • **The five card anchors keep working** via the shim; it calls `preventDefault()` **only**
> when the hash matches a card id, so `#booking`, `#blueprint`, `#iul-strategy`,
> `#annuities`, `#tools`, `#about`, `#faq`, `#quotes` and `tel:` links behave exactly as
> before. Registered with `capture:true` so it runs before any later handler.
> • **`scroll-behavior` conflict handled** by `html.hx-pinned{scroll-behavior:auto}`, and
> the shim uses `behavior:'auto'` rather than fighting it.
> • **Existing flip-reveal conflict handled** — scoped `!important` overrides apply only
> under `.hx-on`, so the ALCHE flip still runs on `.ann-grid` and on mobile.
> • Syntax: ES5-safe (`var`, `Array.prototype.slice`, no arrow functions or optional
> chaining) so it parses in any browser that reaches it; balanced braces verified;
> `transformOrigin` uses the three-value Z form GSAP requires for a wheel.
> • `#coverage` is **not** in your `content-visibility:auto` list, so pin measurement is
> safe. Keep it that way.

**My professional objection, stated once:** this is the one item in your brief I'd argue
against shipping. A pinned section hijacks scroll for ~2,240px on a page that is already
17,147px tall, it adds a third-party dependency and ~70KB to a site I just got from 482ms
to 84ms per frame on mobile, and it puts a *delay* between a buyer and the seven products
they came to compare. It photographs beautifully and it measures badly. If you want the
premium feel without the tax, the alternative is §3's hover choreography on a static grid
— all of the craft, none of the scroll-jacking. Your call; the code above is complete and
safe either way.

---

## 3 · BENEFITS — the grid you don't currently have

### 3.1 What's actually wrong right now

Measured, not eyeballed:

| Problem | Evidence | Fix |
| --- | --- | --- |
| **The same proof is asserted three times** | hero `.hstat` row (20+/12/24-7/$0), the `.carriers` marquee, and the whole `#states` band | Hero keeps **two** stats; the marquee becomes proof-of-carriers only; `#states` becomes a one-line footnote |
| **No "why us" section exists at all** | there is no benefits/differentiator block between the products and the tools | Build 3.2 |
| **Seven cards in one flat grid** | `#coverage` renders 7 `.cover-card`s at equal weight | Split **3 + 4** under two subheads: *Protect what you owe* / *Build what you keep* |
| **Every section opens identically** | `.eyebrow` on all 13 bands | Keep it on the 3 money sections; drop elsewhere |
| **Container widths drift** | `max-width` 880px ×7, 820 ×3, 860 ×2, 760 ×2 | Two tokens: `--w-text:68ch`, `--w-wide:1160px` |

### 3.2 The "Why Herron" grid

Every claim below is already on your site — no new representations, nothing for
compliance to re-approve.

```html
<section class="hx-why" id="why">
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="eyebrow">Why an independent</span>
      <h2>The incentive problem, solved.</h2>
      <p>A captive agent has one company's products to sell you. We have twenty-plus — and
         earn the same regardless of which one you choose.</p>
    </div>
    <div class="hx-why-grid">
      <article class="hx-why-card reveal"><b>20+</b><h3>Carriers compete</h3>
        <p>Your file goes to the whole market, not one company's underwriter.</p></article>
      <article class="hx-why-card reveal"><b>$0</b><h3>Cost to work with us</h3>
        <p>Your premium is identical to buying direct. The carrier pays us, you don't.</p></article>
      <article class="hx-why-card reveal"><b>12</b><h3>States licensed</h3>
        <p>PA, NJ, VA, WI, IA, IN, FL, TX, MA, NC, OH, MN — NPN 21556594.</p></article>
      <article class="hx-why-card reveal"><b>15<em>min</em></b><h3>To real numbers</h3>
        <p>Not a brochure. Your actual rate, from actual carriers, on one call.</p></article>
      <article class="hx-why-card reveal wide"><b>&#10003;</b><h3>The honest answer — even when it costs us the sale</h3>
        <p>If a policy isn't right for you, we say so. If you already have good coverage,
           we'll tell you to keep it. That's the whole business model.</p></article>
    </div>
  </div>
</section>
```

```css
/* ============ hx: why-us grid ============ */
.hx-why{background:var(--cloud);padding:var(--sp-32) 0}
@media(max-width:880px){.hx-why{padding:var(--sp-24) 0}}
.hx-why-grid{
  display:grid;gap:clamp(14px,1.5vw,20px);
  grid-template-columns:repeat(auto-fit,minmax(248px,1fr));
  margin-top:clamp(28px,3.4vw,46px);
}
.hx-why-card{
  position:relative;padding:clamp(22px,2.2vw,30px);border-radius:16px;
  background:var(--white);border:1px solid var(--line);
  box-shadow:0 1px 2px rgba(8,18,38,.05),0 2px 8px -2px rgba(8,18,38,.07);
  transition:transform .42s cubic-bezier(.16,1,.3,1),box-shadow .42s cubic-bezier(.16,1,.3,1),border-color .42s;
  --mx:50%;--my:0%;
}
.hx-why-card.wide{grid-column:1/-1}
.hx-why-card b{
  display:block;font-family:'Sora',sans-serif;font-weight:700;
  font-size:clamp(2rem,3.4vw,2.9rem);line-height:1;letter-spacing:-.03em;
  color:var(--navy);font-variant-numeric:tabular-nums;margin-bottom:.35em;
}
.hx-why-card b em{font-style:normal;font-size:.4em;color:var(--brass-deep);margin-left:.12em}
.hx-why-card h3{font-size:clamp(1rem,1.15vw,1.14rem);color:var(--navy);margin-bottom:.5em;text-wrap:balance}
.hx-why-card p{font-size:.95rem;color:var(--ink-soft);line-height:1.62;max-width:42ch}

/* micro-interaction: lift + brass edge + a cursor-tracked glow */
.hx-why-card::after{
  content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:radial-gradient(320px circle at var(--mx) var(--my),rgba(226,180,92,.13),transparent 62%);
  opacity:0;transition:opacity .42s cubic-bezier(.16,1,.3,1);
}
@media (hover:hover) and (pointer:fine){
  .hx-why-card:hover{
    transform:translateY(-5px);border-color:rgba(201,151,59,.42);
    box-shadow:0 4px 8px rgba(8,18,38,.06),0 18px 44px -12px rgba(8,18,38,.20),0 40px 80px -34px rgba(8,18,38,.26);
  }
  .hx-why-card:hover::after{opacity:1}
}
@media (prefers-reduced-motion:reduce){.hx-why-card{transition:none}.hx-why-card:hover{transform:none}}
```

```js
/* one delegated listener drives the glow on every card — no per-card binding */
document.addEventListener('pointermove', function (e) {
  var c = e.target.closest('.hx-why-card');
  if (!c) return;
  var r = c.getBoundingClientRect();
  c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  c.style.setProperty('--my', (e.clientY - r.top) + 'px');
}, { passive: true });
```

> **Safety Check: Passed.**
> • Entirely **additive** — a new `<section id="why">`. No existing markup edited, so no
> listener, form, ID or route is affected. `#why` collides with no existing anchor
> (checked against all 14 in-page hashes).
> • Reuses your existing tokens (`--cloud`, `--navy`, `--line`, `--sp-32`, `--brass-deep`)
> so it inherits the type scale and band rhythm automatically — no new scale to maintain.
> • `--brass-deep` (`#8A6420`) is used for the small brass text, which measures **4.95:1**
> on `--cloud` and passes WCAG AA. Plain `--brass` would be 2.43:1 and fail — do not
> substitute it.
> • Hover effects are inside `@media (hover:hover) and (pointer:fine)`, so phones get no
> sticky hover state and pay no cost.
> • The pointermove handler is `passive`, delegated on `document`, and returns immediately
> when the target isn't a card — it cannot interfere with your `.go[data-track]` or
> `[data-capsend]` click handlers (different event type, and no `preventDefault`).
> • `tabular-nums` keeps the big numerals from reflowing if you later animate them.

---

## 4 · QUOTE FORM & FOOTER — protected conversion zone

### 4.1 Do not touch — verified list

I read these before writing anything. **Nothing in §4 modifies any of them:**

| Protected | Where |
| --- | --- |
| Lead submit handler | delegated on `[data-capsend]`, posts `URLSearchParams` to `fetch('/')` |
| `.cap-card[data-capform]` → `form-name` mapping | must keep matching the hidden forms |
| Hidden Netlify forms | `iul-lead`, `fit-check-lead`, `estimate-lead` |
| Concierge endpoint | `fetch('/.netlify/functions/legacy-ai')` |
| Interactive IDs | `estCapture` `iulCapture` `iulToggle` `iulEmbed` `iulBars` `qStage` `qTabs` `fitBody` `fitBar` `blueprintFrame` `mainChat` `fabChat` `fabPanel` `fabChat_shell` `covModal` `covInner` `navSheet` `navBurger` `marqueeTrack` |
| Inputs | `[name=email]`, `input[type=range]`, `.cap-err`, `.cap-done` |

**Rule I followed:** style *around* inputs, never re-render them. Every rule below targets
a wrapper or uses `:where()`/attribute selectors at zero-or-low specificity so your
existing styles keep winning on anything functional.

### 4.2 Micro-copy that removes hesitation

Put a single line directly beneath each primary CTA. This — not the button label — is
what kills friction:

| Location | Line to add under the CTA |
| --- | --- |
| `#booking` | **No sales script. No obligation. If we're not a fit in the first five minutes, I'll tell you.** |
| `#quotes` (estimate) | **This is a range, not a quote. Your real rate comes from underwriting — free, no card, no credit pull.** |
| `.cap-card` email capture | **One email, used once, to send this. No list, no drip, no reselling your data.** |
| `#blueprint` | **Nothing is submitted until you say so. Build it, close the tab, no one calls you.** |
| Final close | **No email required to start · $0 to work with us · Licensed in 12 states** *(already live — keep it)* |

The high-value one is the estimate line: an insurance range presented without that caveat
reads as a bait-and-switch the moment underwriting returns a different number.

### 4.3 Visual alignment only

```css
/* ============ hx: conversion-zone polish (visual only) ============ */
.hx-cta-note{
  display:block;margin-top:var(--sp-3);
  font-size:var(--step--1);line-height:1.55;color:var(--ink-soft);
  max-width:46ch;letter-spacing:.005em;
}
.booking .hx-cta-note,.final .hx-cta-note{margin-inline:auto;text-align:center}
.hero .hx-cta-note,.ai-band .hx-cta-note{color:rgba(255,255,255,.66)}

/* optical alignment: give the form column a consistent gutter + rhythm */
.hx-form-frame{
  padding:clamp(20px,2.4vw,34px);border-radius:18px;
  background:var(--white);border:1px solid var(--line);
  box-shadow:0 2px 4px rgba(8,18,38,.05),0 16px 40px -16px rgba(8,18,38,.16);
}
/* :where() = zero specificity, so ANY existing input rule of yours still wins */
.hx-form-frame :where(input,select,textarea){ margin-bottom:var(--sp-3) }
.hx-form-frame :where(label){ display:block;margin-bottom:var(--sp-1);font-size:var(--step--1);color:var(--ink) }
/* focus ring for accessibility — additive, doesn't replace your border styling */
.hx-form-frame :where(input,select,textarea):focus-visible{
  outline:2px solid var(--brass-bright);outline-offset:2px;
}
.hx-trust{
  display:flex;flex-wrap:wrap;gap:var(--sp-2) var(--sp-4);
  margin-top:var(--sp-4);padding-top:var(--sp-4);border-top:1px solid var(--line);
  font-size:var(--step--1);color:var(--ink-soft);
}
.hx-trust span{display:inline-flex;align-items:center;gap:6px}
.hx-trust b{color:var(--navy);font-weight:600}
```

```html
<!-- optional trust strip — place under the form, never inside it -->
<div class="hx-trust">
  <span><b>NPN 21556594</b> · licensed producer</span>
  <span><b>$0</b> to work with us</span>
  <span><b>20+</b> carriers shopped</span>
  <span>Your data is never sold</span>
</div>
```

> **Safety Check: Passed.**
> • **Zero changes to inputs, buttons, `name` attributes, form markup, or submission JS.**
> The `[data-capsend]` handler reads `card.dataset.capform` and `card.querySelectorAll('input')`
> — both untouched, so the POST body is byte-identical.
> • `:where()` carries **specificity 0**, so every existing rule of yours still overrides
> these. That's deliberate: it means these can't silently restyle a functional field.
> • `.hx-cta-note` is a `<span>`/`<p>` sibling **after** the button, never a wrapper around
> it — button hit area and event delegation are unaffected.
> • `margin-bottom` is applied to inputs *inside* `.hx-form-frame` only. If you don't add
> that wrapper, nothing changes anywhere.
> • `focus-visible` **adds** an outline without touching `border`, so your invalid-state
> `email.style.borderColor='#B4232A'` (set inline by your JS) still shows correctly —
> inline styles outrank stylesheets.
> • `.hx-trust` sits outside the form element, so it can't inject fields into the POST.
> • No layout shift: all additions are static blocks in normal flow with no `position`
> changes and no `transform` on ancestors of the form.

---

## Ship order

1. **§1 copy** — free, biggest positioning gain, zero risk.
2. **§4 micro-copy** — highest conversion-per-effort on the page.
3. **§3 why-grid** — additive, no risk, fills a genuine structural hole.
4. **§1 glass** — visual lift on the hero card.
5. **§2 3D wheel** — last, behind the guards, and only if you accept the scroll-jacking
   trade. Test the five card anchors from both the desktop nav and the mobile sheet before
   you call it done.

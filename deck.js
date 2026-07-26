/* ============================================================================
   DECK — three scroll/pointer-driven components that carry the rest of the page
   ----------------------------------------------------------------------------
     1. CarrierDeck   A 3D coverflow that replaces the logo marquee. Cards sit
                      on a curved rail in CSS 3D space, advance on a timer,
                      and respond to drag, wheel, arrows and swipe. A headline
                      marquee travels behind them at a different rate.
     2. RiderTracks   The living-benefits breakdown. Section scroll progress is
                      mapped per-track so each meter fills, its tile lifts and
                      its condition chips ignite in sequence.
     3. BentoReveal   Staggered entrance for mosaic tiles, plus a pointer-
                      tracked sheen that follows the cursor across each tile.

   No dependencies. Everything degrades to a static, readable layout:
     • no JS            → cards are a plain horizontal scroller, meters are
                          full, tiles are visible (see .no-js-* rules in CSS)
     • reduced motion   → autoplay off, transitions collapsed, meters snap
     • off-screen       → every rAF loop and timer is suspended
   ========================================================================== */

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ==========================================================================
   1 — CARRIER DECK
   ========================================================================== */
class CarrierDeck {
  constructor(root) {
    this.root = root;
    this.stage = root.querySelector('[data-deck-stage]');
    this.cards = [...root.querySelectorAll('[data-deck-card]')];
    this.counter = root.querySelector('[data-deck-count]');
    this.progress = root.querySelector('[data-deck-progress]');
    if (this.cards.length < 2) return;

    this.n = this.cards.length;
    this.i = 0;
    this.drag = null;
    this.timer = 0;
    this.hovering = false;
    this.visible = false;

    root.classList.add('deck-live');
    this.bind();
    this.layout();
  }

  bind() {
    /* --- pointer drag / swipe --------------------------------------------
       The stage keeps `touch-action: pan-y` so a vertical page scroll is
       never hijacked; only a decisively horizontal gesture takes over. */
    const stage = this.stage;
    stage.addEventListener('pointerdown', (e) => {
      this.drag = { x: e.clientX, y: e.clientY, dx: 0, locked: null, id: e.pointerId };
      stage.setPointerCapture?.(e.pointerId);
      this.root.classList.add('is-dragging');
    });
    stage.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      this.drag.dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      if (this.drag.locked === null && (Math.abs(this.drag.dx) > 8 || Math.abs(dy) > 8)) {
        this.drag.locked = Math.abs(this.drag.dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (this.drag.locked === 'x') this.layout(this.drag.dx / 260);
    });
    const end = () => {
      if (!this.drag) return;
      const d = this.drag; this.drag = null;
      this.root.classList.remove('is-dragging');
      if (d.locked === 'x') {
        if (Math.abs(d.dx) > 60) this.go(this.i + (d.dx < 0 ? 1 : -1));
        else this.layout();
      }
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    stage.addEventListener('lostpointercapture', end);

    /* --- keyboard: the deck is a real listbox ---------------------------- */
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { this.go(this.i + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft')  { this.go(this.i - 1); e.preventDefault(); }
    });

    /* --- clicking a shoulder card brings it to the front ----------------- */
    this.cards.forEach((c, k) => {
      c.addEventListener('click', () => { if (k !== this.i) this.go(k); });
    });

    /* --- explicit controls ------------------------------------------------ */
    this.root.querySelectorAll('[data-deck-prev]').forEach(b =>
      b.addEventListener('click', () => this.go(this.i - 1)));
    this.root.querySelectorAll('[data-deck-next]').forEach(b =>
      b.addEventListener('click', () => this.go(this.i + 1)));

    /* --- autoplay only while on screen, unhovered and unfocused ---------- */
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      this.autoplay();
    }, { threshold: 0.25 });
    this.io.observe(this.root);

    this.root.addEventListener('pointerenter', () => { this.hovering = true; this.autoplay(); });
    this.root.addEventListener('pointerleave', () => { this.hovering = false; this.autoplay(); });
    this.root.addEventListener('focusin', () => { this.hovering = true; this.autoplay(); });
    this.root.addEventListener('focusout', () => { this.hovering = false; this.autoplay(); });
    document.addEventListener('visibilitychange', () => this.autoplay());

    addEventListener('resize', () => this.layout(), { passive: true });
  }

  autoplay() {
    clearInterval(this.timer); this.timer = 0;
    if (REDUCED || !this.visible || this.hovering || document.hidden) return;
    this.timer = setInterval(() => this.go(this.i + 1), 3600);
  }

  go(i) {
    this.i = ((i % this.n) + this.n) % this.n;
    this.layout();
    this.autoplay();     // restart the dwell so a manual move gets full time
  }

  /* --- the whole look lives here ----------------------------------------
     Offset from the active card drives four channels at once: lateral
     travel, depth, Y-rotation and opacity. Because they all key off one
     number the rail reads as a single curved surface rather than four
     unrelated tweens. `bias` is the live drag amount in card-widths. */
  layout(bias = 0) {
    const narrow = innerWidth < 760;
    const STEP  = narrow ? 132 : 208;   // px of lateral travel per position
    const DEPTH = narrow ? 128 : 190;   // px pushed back per position
    const TURN  = narrow ? 26  : 34;    // deg of Y-rotation per position

    this.cards.forEach((card, k) => {
      // shortest signed distance on the ring, so the deck wraps seamlessly
      let d = k - this.i;
      if (d >  this.n / 2) d -= this.n;
      if (d < -this.n / 2) d += this.n;
      const o = d + bias;
      const a = Math.abs(o);

      // sqrt on the lateral term compresses the shoulders — the classic
      // coverflow "fan" instead of an evenly-spaced train of cards
      const x = Math.sign(o) * Math.sqrt(a) * STEP;
      const z = -a * DEPTH;
      const ry = -clamp(o, -2.4, 2.4) * TURN;
      const op = a > 3.2 ? 0 : clamp(1 - a * 0.26, 0, 1);

      card.style.transform = `translate3d(${x}px,0,${z}px) rotateY(${ry}deg)`;
      card.style.opacity = op;
      card.style.zIndex = String(100 - Math.round(a * 10));
      card.style.pointerEvents = op < 0.15 ? 'none' : 'auto';
      card.classList.toggle('is-active', Math.round(o) === 0);
      card.setAttribute('aria-hidden', op < 0.15 ? 'true' : 'false');
      card.tabIndex = Math.round(o) === 0 ? 0 : -1;
    });

    if (this.counter) {
      this.counter.textContent =
        String(this.i + 1).padStart(2, '0') + ' / ' + String(this.n).padStart(2, '0');
    }
    if (this.progress) {
      this.progress.style.setProperty('--deck-p', (this.i / (this.n - 1)).toFixed(3));
    }
  }
}

/* ==========================================================================
   2 — RIDER TRACKS (living benefits)

   Section progress → per-track progress. Track k starts filling at
   k * STAGGER and finishes STAGGER + SPAN later, so the three benefit types
   resolve one after another as the reader travels the section rather than
   all animating at once on entry.
   ========================================================================== */
class RiderTracks {
  constructor(root) {
    this.root = root;
    this.tracks = [...root.querySelectorAll('[data-rider]')];
    if (!this.tracks.length) return;
    this.ticking = false;
    this.visible = false;

    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible) this.update();
    }, { rootMargin: '20% 0px' });
    this.io.observe(root);

    this.onScroll = () => {
      if (this.ticking || !this.visible) return;
      this.ticking = true;
      requestAnimationFrame(() => { this.update(); this.ticking = false; });
    };
    addEventListener('scroll', this.onScroll, { passive: true });
    addEventListener('resize', this.onScroll, { passive: true });
    root.classList.add('riders-live');
    this.update();
  }

  update() {
    const r = this.root.getBoundingClientRect();
    // 0 when the section's top reaches 80% of the viewport, 1 when its
    // bottom passes 40% — a window that fills across a comfortable read.
    const start = innerHeight * 0.80;
    const end   = -r.height + innerHeight * 0.40;
    const p = clamp((start - r.top) / (start - end), 0, 1);

    const STAGGER = 0.16, SPAN = 0.46;
    this.tracks.forEach((el, k) => {
      const local = REDUCED ? 1 : clamp((p - k * STAGGER) / SPAN, 0, 1);
      // ease-out-cubic: fast commitment, soft landing
      const e = 1 - Math.pow(1 - local, 3);
      el.style.setProperty('--rider-p', e.toFixed(4));
      el.classList.toggle('is-lit', e > 0.06);
      el.classList.toggle('is-full', e > 0.985);

      // chips ignite left-to-right across the track's own progress
      const chips = el.querySelectorAll('[data-chip]');
      chips.forEach((c, ci) => {
        c.classList.toggle('is-on', e > (ci + 0.6) / (chips.length + 0.6));
      });
    });
  }
}

/* ==========================================================================
   3 — BENTO REVEAL — staggered entrance + a sheen that tracks the pointer.

   The sheen is two custom properties, not a moving element: the tile's
   ::after reads --mx/--my in a radial-gradient. One style write per frame,
   no layout, no extra nodes.
   ========================================================================== */
function bentoReveal(scope = document) {
  const tiles = [...scope.querySelectorAll('[data-bento]')];
  if (!tiles.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const row = [...e.target.parentElement.children].indexOf(e.target);
      e.target.style.transitionDelay = REDUCED ? '0s' : `${Math.min(row, 8) * 70}ms`;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.18 });
  tiles.forEach(t => io.observe(t));

  if (REDUCED || matchMedia('(hover: none)').matches) return;
  tiles.forEach((t) => {
    t.addEventListener('pointermove', (e) => {
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      t.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    }, { passive: true });
    t.addEventListener('pointerleave', () => {
      t.style.setProperty('--mx', '50%');
      t.style.setProperty('--my', '50%');
    });
  });
}

/* ==========================================================================
   4 — FLOATING NAV — the capsule contracts once you leave the cover.
   ========================================================================== */
function floatingNav() {
  const nav = document.querySelector('nav.liquid-glass');
  if (!nav) return;
  let ticking = false;
  const set = () => {
    nav.classList.toggle('is-condensed', scrollY > innerHeight * 0.6);
    ticking = false;
  };
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(set);
  }, { passive: true });
  set();
}

/* ==========================================================================
   BOOT
   ========================================================================== */
function boot() {
  document.querySelectorAll('[data-deck]').forEach(el => new CarrierDeck(el));
  document.querySelectorAll('[data-riders]').forEach(el => new RiderTracks(el));
  bentoReveal();
  floatingNav();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();

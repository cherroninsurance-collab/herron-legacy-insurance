/* Herron & Co. — interactive 3D card carousels (coverage + annuities).
   Direct control only: drag/swipe, arrow buttons, clickable dots, click a side
   card to bring it forward. No scroll pinning, no scroll hijack — the page
   scrolls normally at all times.

   FLOW PROTECTION: the front card is fully interactive and its links/buttons
   fire exactly as authored ("Check my fit" → #fitcheck, "Learn more" → deep
   dives, booking CTAs → #booking). Clicks are only intercepted in two cases:
   (1) the pointer actually dragged (>6px), (2) the click landed on a NON-front
   card — that click rotates the card forward instead of following a link the
   user couldn't read. Nothing else is preventDefault-ed. */
(function () {
  'use strict';

  /* ---- why-card cursor glow + 3D diamond tilt: one delegated, passive listener.
     Tilt only touches solid-surface cards (never backdrop-filter glass — Chrome
     glitches when a blurred element is 3D-transformed) and only on fine pointers. */
  var TILT_MAX = 6;
  var fineTilt = matchMedia('(pointer:fine)').matches &&
                 !matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (fineTilt) {
    document.querySelectorAll('.hx-why-card').forEach(function (el) {
      el.setAttribute('data-hx-tilt', '');
    });
  }
  document.addEventListener('pointermove', function (e) {
    var c = e.target.closest && e.target.closest('.hx-why-card');
    if (!c) return;
    var r = c.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    c.style.setProperty('--mx', x + 'px');
    c.style.setProperty('--my', y + 'px');
    if (fineTilt && c.hasAttribute('data-hx-tilt')) {
      c.classList.remove('hx-tilt-off');
      var rx = (0.5 - y / r.height) * TILT_MAX;
      var ry = (x / r.width - 0.5) * (TILT_MAX + 2);
      c.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateZ(6px)';
    }
  }, { passive: true });
  document.addEventListener('pointerout', function (e) {
    var c = e.target.closest && e.target.closest('[data-hx-tilt]');
    if (!c) return;
    if (e.relatedTarget && c.contains(e.relatedTarget)) return;
    c.classList.add('hx-tilt-off');
    c.style.transform = '';
  }, { passive: true });

  /* ---- fallback: coverage cards become a flat snap carousel with dots.
     Only used when the 3D path can't run (no GSAP, or reduced motion —
     where a native scroller respects the preference better than tweens). ---- */
  function initFlatCarousel() {
    var coarse = matchMedia('(pointer:coarse)').matches;
    if (!(coarse || innerWidth < 1180)) return;            // plain grid on desktop
    var grid = document.querySelector('.cover-grid');
    var cov = document.getElementById('coverage');
    if (!grid || !cov) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.cover-card'));
    if (cards.length < 2) return;
    cov.classList.add('hx-car');
    grid.classList.add('hx-carousel');
    var progress = cov.querySelector('.hx-progress');
    if (progress) progress.innerHTML = cards.map(function () { return '<i></i>'; }).join('');
    var dots = progress ? Array.prototype.slice.call(progress.children) : [];
    function mark(i) { dots.forEach(function (d, j) { d.classList.toggle('on', j === i); }); }
    mark(0);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) mark(cards.indexOf(en.target));
      });
    }, { root: grid, threshold: 0.6 });
    cards.forEach(function (c) { io.observe(c); });
    /* card anchors: let the native hash jump handle vertical, then centre the
       card inside the scroller. No preventDefault — nothing else is intercepted. */
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      var card = null;
      cards.some(function (c) { if (c.id === id) { card = c; return true; } });
      if (!card) return;
      setTimeout(function () {
        card.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
      }, 40);
    }, true);
  }

  /* The 3D carousels run on EVERY device — desktop, tablet, phone, any window
     width, any zoom level. (The old fine-pointer + ≥1180px gate meant a zoomed
     desktop browser silently got the flat phone version — "works on my machine"
     in reverse.) Only two things fall back to the flat carousel / plain grid:
     GSAP failing to load, and prefers-reduced-motion, where a native scroller
     respects the preference better than tweens do. */
  var OK = window.gsap;
  var calm = matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (!OK || calm) {
    initFlatCarousel();
    return;
  }

  /* ---- coverflow geometry ----
     Placement from the signed circular offset o = wrap(i − pos):
     x = o·spread, z = −|o|·DEPTH, rotY = clamp(−o·TILT). Works for any card
     count (a true rotating ring goes invisible at the sides for n=3–4 because
     of backface culling) and never shows mirrored text.
     Values are set responsively in measure(). */
  var VIS = 2.35;       // offsets beyond this are fully hidden

  function initRing(sectionId, gridSel, ariaLabel) {
    var section = document.getElementById(sectionId);
    var grid = section && section.querySelector(gridSel);
    if (!section || !grid) return null;
    var cards = Array.prototype.slice.call(grid.children).filter(function (c) {
      return c.matches('.cover-card,.ann-card');
    });
    var n = cards.length;
    if (n < 3) return null;

    /* stage wrapper: coverage ships one in the HTML; annuities gets one built
       here. The ann compliance note and CTAs live OUTSIDE the grid, so they
       stay in normal flow below the carousel — never rotated, never hidden. */
    var stage = grid.closest('.hx-stage');
    if (!stage) {
      stage = document.createElement('div');
      stage.className = 'hx-stage';
      grid.parentNode.insertBefore(stage, grid);
      stage.appendChild(grid);
    }
    stage.setAttribute('role', 'region');
    stage.setAttribute('aria-roledescription', 'carousel');
    stage.setAttribute('aria-label', ariaLabel);

    cards.forEach(function (c) { c.classList.add('hx-3dcard'); });
    grid.classList.add('hx-wheel');
    section.classList.add('hx-on');
    stage.classList.add('hx-on');

    /* dots (buttons — keyboard + click) */
    var progress = section.querySelector('.hx-progress');
    if (!progress) {
      progress = document.createElement('div');
      progress.className = 'hx-progress';
      stage.parentNode.insertBefore(progress, stage.nextSibling);
    }
    progress.innerHTML = cards.map(function (c, i) {
      var h = c.querySelector('h3');
      var t = h ? h.textContent.trim() : ('card ' + (i + 1));
      return '<button type="button" aria-label="Show: ' + t.replace(/"/g, '&quot;') + '"></button>';
    }).join('');
    var dots = Array.prototype.slice.call(progress.children);

    /* arrows */
    function mkArrow(dir) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hx-arrow ' + (dir < 0 ? 'prev' : 'next');
      b.setAttribute('aria-label', dir < 0 ? 'Previous card' : 'Next card');
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="' +
        (dir < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7') +
        '" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      b.addEventListener('click', function () { go(Math.round(current) + dir); });
      stage.appendChild(b);
      return b;
    }
    mkArrow(-1); mkArrow(1);

    var cardW = 520, pxPerStep = 286, SPREAD = 0.55, TILT = 38, DEPTH = 190;
    function measure() {
      /* tighter, shallower geometry on small screens; wider sweep on desktop */
      var small = innerWidth < 720;
      SPREAD = small ? 0.62 : 0.55;
      TILT = small ? 30 : 38;
      DEPTH = small ? 120 : 190;
      cardW = cards[0].offsetWidth || 520;
      pxPerStep = cardW * SPREAD;
      /* stage height = tallest card + breathing room — measured, not guessed,
         so phone-height cards never spill out of the stage */
      var h = 0;
      cards.forEach(function (c) { h = Math.max(h, c.offsetHeight); });
      if (h) grid.style.height = (h + 30) + 'px';
    }

    /* `pos` is the continuous render position; `current` is the logical snap
       TARGET. Every control computes from `current`, never from a mid-tween
       `pos` — Math.round(pos) during a flight is a race that lands off-by-one. */
    var pos = 0, current = 0, lastIdx = -1, snapTween = null, interacted = false;

    function wrapOffset(i, p) {
      var o = (i - p) % n;
      if (o > n / 2) o -= n;
      if (o < -n / 2) o += n;
      return o;
    }
    function curIdx() { var r = Math.round(pos); return ((r % n) + n) % n; }

    function face(idx) {
      cards.forEach(function (c, i) {
        c.classList.toggle('hx-front', i === idx);
        c.classList.toggle('hx-dim', i !== idx);
      });
      dots.forEach(function (d, i) { d.classList.toggle('on', i === idx); });
    }

    function render() {
      for (var i = 0; i < n; i++) {
        var o = wrapOffset(i, pos), ao = Math.abs(o);
        var op = ao > VIS ? 0 : (ao <= 1 ? 1 - 0.58 * ao : Math.max(0, 0.42 - 0.16 * (ao - 1)));
        gsap.set(cards[i], {
          xPercent: -50, yPercent: -50,
          x: o * pxPerStep,
          z: -ao * DEPTH,
          rotationY: Math.max(-TILT, Math.min(TILT, -o * TILT)),
          autoAlpha: op
        });
      }
      var idx = curIdx();
      if (idx !== lastIdx) { face(idx); lastIdx = idx; }
    }

    function snapTo(target, fast) {
      if (snapTween) snapTween.kill();
      var proxy = { p: pos };
      snapTween = gsap.to(proxy, {
        p: target, duration: fast ? 0.45 : 0.65, ease: 'power3.out',
        onUpdate: function () { pos = proxy.p; render(); },
        onComplete: function () {
          pos = ((target % n) + n) % n;
          current = pos;
          render();
        }
      });
    }
    /* single entry point for every control */
    function go(target, fast) {
      interacted = true;
      current = target;
      snapTo(target, fast);
    }

    /* shortest wrapped route from the logical target to card i */
    function routeTo(i) {
      var r = Math.round(current), cur = ((r % n) + n) % n, d = i - cur;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      return r + d;
    }

    /* ---- drag: mouse AND touch. The stage is touch-action:pan-y, so vertical
       page scrolling stays native; we claim a gesture only once it is clearly
       horizontal, and reject it permanently once it is clearly vertical. ---- */
    var down = null, dragged = false;
    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('.hx-arrow') || e.target.closest('.hx-progress')) return;
      down = { x: e.clientX, y: e.clientY, id: e.pointerId, start: pos, claimed: false, rejected: false };
      dragged = false;
      if (snapTween) snapTween.kill();
    });
    addEventListener('pointermove', function (e) {
      if (!down || e.pointerId !== down.id) return;
      var dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!down.claimed) {
        if (down.rejected) return;
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) * 1.2) {
          down.rejected = true;              // vertical intent → the page scroll owns it
          return;
        }
        if (Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          down.claimed = true;
          dragged = true;
          document.documentElement.classList.add('hx-grabbing');
          try { stage.setPointerCapture(down.id); } catch (_) { /* not fatal */ }
        }
      }
      if (down.claimed) {
        pos = down.start - dx / pxPerStep;
        render();
        if (e.cancelable) e.preventDefault();
      }
    }, { passive: false });
    function endDrag(e) {
      if (!down || (e.pointerId !== undefined && e.pointerId !== down.id)) return;
      if (dragged) {
        go(Math.round(pos), true);   // here pos IS the truth — the user put it there
        document.documentElement.classList.remove('hx-grabbing');
      }
      down = null;
      /* the click event fires right after pointerup — let the suppressor below
         see the flag first, then clear it */
      setTimeout(function () { dragged = false; }, 0);
    }
    addEventListener('pointerup', endDrag);
    addEventListener('pointercancel', endDrag);

    /* ---- click routing (capture phase, this grid only) ---- */
    grid.addEventListener('click', function (e) {
      if (dragged) { e.preventDefault(); e.stopPropagation(); return; }
      var card = e.target.closest('.hx-3dcard');
      if (!card) return;
      var o = wrapOffset(cards.indexOf(card), Math.round(current));
      if (Math.abs(o) > 0.4) {          // side card → bring it forward, don't navigate
        e.preventDefault(); e.stopPropagation();
        go(Math.round(current) + o);
      }                                  // front card → untouched, links/buttons fire
    }, true);

    /* keyboard users: tabbing into a side card's link rotates it forward */
    grid.addEventListener('focusin', function (e) {
      var card = e.target.closest('.hx-3dcard');
      if (!card) return;
      var o = wrapOffset(cards.indexOf(card), Math.round(current));
      if (Math.abs(o) > 0.4) go(Math.round(current) + o);
    });

    dots.forEach(function (d, i) {
      d.addEventListener('click', function () { go(routeTo(i)); });
    });

    /* nav links that point INTO these cards (desktop nav + mobile sheet):
       scroll to the section and rotate the card forward. Everything else
       behaves exactly as before. */
    var idToIdx = {};
    cards.forEach(function (c, i) { if (c.id) idToIdx[c.id] = i; });
    if (Object.keys(idToIdx).length) {
      document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a) return;
        var idx = idToIdx[a.getAttribute('href').slice(1)];
        if (idx === undefined) return;
        /* fully own this click: the target card is absolutely positioned inside
           a 3D transform, so the site's generic anchor scroll would compute a
           nonsense scroll position from its transformed rect */
        e.preventDefault();
        e.stopImmediatePropagation();
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        go(routeTo(idx));
        var sheet = document.getElementById('navSheet');
        var burger = document.getElementById('navBurger');
        if (sheet && burger && sheet.classList.contains('open')) burger.click();
      }, true);
    }

    /* entrance: settle in from half a step once the stage first scrolls into
       view — but NEVER after the user has already taken control (a nav-anchor
       click can scroll the stage into view with a rotation already in flight;
       the entrance must not stomp it) */
    if (window.IntersectionObserver) {
      var seen = false;
      new IntersectionObserver(function (es, io) {
        if (es[0].isIntersecting && !seen) {
          seen = true;
          io.disconnect();
          if (interacted) return;
          pos = -0.55; render();
          snapTo(0);
        }
      }, { threshold: 0.25 }).observe(stage);
    }

    addEventListener('resize', function () { measure(); render(); }, { passive: true });

    measure();
    render();
    face(0);
    return {
      snapTo: snapTo, routeTo: routeTo, cards: cards, stage: stage,
      pos: function () { return pos; },
      idx: curIdx,
      /* logical destination — what the carousel is heading to, regardless of
         how far the render has caught up (slow renderers lag the tween) */
      target: function () { return ((Math.round(current) % n) + n) % n; }
    };
  }

  var rings = {
    coverage: initRing('coverage', '.cover-grid', 'Coverage options'),
    annuities: initRing('annuities', '.ann-grid', 'Annuity types')
  };
  window.hxRings = rings;   // used by the audit harness; harmless in production
})();

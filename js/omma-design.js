/* ============================================================================
   OMMA DESIGN LAYER — the template's non-3D interaction code
   ----------------------------------------------------------------------------
   js/omma-3d.js carries the WebGL scenes. This file carries the rest of what
   the Omma template does — the parts that are design code rather than geometry:

     • a product ticker under the coverage head
     • the estimate studio's "what's moving this" breakdown bars
     • a staggered 3D lift as static grids enter the viewport
     • an error shake on invalid capture fields
     • 3D cube step markers, lettered answer keys, floating-label fields

   WHY THIS IS SEPARATE FROM THE 3D FILE
   The 3D layer gates itself off on touch, reduced motion and low-end devices.
   None of that applies here: this is ordinary CSS and DOM, it costs nothing to
   run, and a phone should get it too. Keeping the two apart is what lets the
   design travel further down the device range than the geometry does.

   Several template details turned out to be on the site already — the nav
   underline sweep, the pulsing hero dot, the state-chip stagger, the coverage
   card lift and its shine sweep. Those were left alone rather than duplicated.

   Nothing here adds a number, a claim or a rate. The breakdown bars are
   deliberately unlabelled proportions read back off the controls the visitor
   already moved; the studio's model, its ranges and its disclosure are not
   touched. Copy stays as written.
   ========================================================================== */
(function () {
  'use strict';

  var REDUCE = matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* ------------------------------------------------------------------ 1 --
     PRODUCT TICKER
     The template runs a marquee of product names under the hero. This site
     already has one there (the carrier logos), so the ticker goes at the top
     of the coverage section instead, where it names what the cards below are.
     ---------------------------------------------------------------------- */
  function ticker() {
    try {
      var head = document.querySelector('#coverage .sec-head');
      if (!head || document.querySelector('.omma-ticker')) return;
      var words = [
        'MORTGAGE PROTECTION', 'INDEXED UNIVERSAL LIFE', 'HYBRID LONG-TERM CARE',
        'FINAL EXPENSE', 'FIXED ANNUITIES', 'DISABILITY INCOME', 'TERM & WHOLE LIFE'
      ];
      var row = words.map(function (w) {
        return '<span>' + w + '</span><i aria-hidden="true">&#9670;</i>';
      }).join('');
      var el = document.createElement('div');
      el.className = 'omma-ticker';
      el.setAttribute('aria-hidden', 'true');
      /* the track is duplicated so the -50% translate loops seamlessly */
      el.innerHTML = '<div class="omma-ticker-track">' + row + row + '</div>';
      head.insertAdjacentElement('afterend', el);
    } catch (e) {}
  }

  /* ------------------------------------------------------------------ 2 --
     ESTIMATE BREAKDOWN BARS
     The template's quoter shows what is driving the premium as three bars.
     Same idea here, with one hard rule: NO NUMBERS. These are proportions read
     back off the controls the visitor already set, so they can see which lever
     is doing the work — they are not a second, more precise estimate, and the
     q-note disclosure below still says exactly what the figure is.

     The studio re-renders its output on every input, so the bars are rebuilt
     from a MutationObserver rather than wired once.
     ---------------------------------------------------------------------- */
  function bars() {
    var stage = document.getElementById('qStage');
    var shell = document.querySelector('#quotes .q-shell');
    if (!stage || !shell) return;

    function read() {
      var ranges = [].slice.call(stage.querySelectorAll('input[type=range]'));
      if (!ranges.length) return null;
      var money = null, span = -1;
      ranges.forEach(function (r) {
        var s = (+r.max) - (+r.min);
        if (s > span) { span = s; money = r; }
      });
      var age = null;
      ranges.forEach(function (r) {
        if (r !== money && (+r.max) <= 90 && (+r.min) >= 18) age = age || r;
      });
      var norm = function (r) {
        return r ? ((+r.value) - (+r.min)) / Math.max(1, (+r.max) - (+r.min)) : 0;
      };
      /* how many option groups are set away from their first choice */
      var segs = [].slice.call(stage.querySelectorAll('.q-seg'));
      var moved = segs.filter(function (sg) {
        var on = sg.querySelector('.on');
        return on && on !== sg.firstElementChild;
      }).length;
      return [
        ['Amount', Math.max(0.06, norm(money))],
        ['Age', Math.max(0.06, norm(age))],
        ['Options', segs.length ? Math.max(0.06, moved / segs.length) : 0.06]
      ];
    }

    function paint() {
      try {
        var out = stage.querySelector('.q-out');
        if (!out) return;
        var data = read();
        if (!data) return;
        var box = out.querySelector('.omma-bars');
        if (!box) {
          box = document.createElement('div');
          box.className = 'omma-bars';
          box.innerHTML =
            '<span class="omma-bars-cap">What\'s moving this estimate</span>' +
            data.map(function (d) {
              return '<div class="omma-bar"><span>' + d[0] + '</span><i></i></div>';
            }).join('');
          /* above the CTA, below the figure — never between the figure and its
             disclosure, and never inside .q-note */
          var cta = out.querySelector('.btn');
          if (cta) out.insertBefore(box, cta); else out.appendChild(box);
        }
        var fills = box.querySelectorAll('.omma-bar i');
        data.forEach(function (d, i) {
          if (fills[i]) fills[i].style.width = Math.round(d[1] * 100) + '%';
        });
      } catch (e) {}
    }

    paint();
    new MutationObserver(paint).observe(stage, { childList: true, subtree: true });
    shell.addEventListener('input', paint, { passive: true });
  }

  /* ------------------------------------------------------------------ 3 --
     STAGGERED 3D LIFT
     cards.js tips the whole card grid back and flattens it as the grid enters
     the viewport, staggered by column. Applied here only to grids the site does
     NOT already drive with inline transforms — the coverage and annuity cards
     belong to the GSAP carousel and the why-cards carry pointer tilt, so any
     transform written onto those would fight for the same property.
     ---------------------------------------------------------------------- */
  function lift() {
    if (REDUCE) return;
    var SETS = ['.bp-steps', '.book-points', '.iul-points', '.ai-feats', '.states-grid'];
    var items = [];
    SETS.forEach(function (sel) {
      var box = document.querySelector(sel);
      if (!box) return;
      /* the states grid already animates its chips in; don't double it up */
      if (sel === '.states-grid') return;
      box.classList.add('omma-lift-set');
      [].slice.call(box.children).forEach(function (c, i) {
        c.classList.add('omma-lift');
        c.style.transitionDelay = (i * 70) + 'ms';
        items.push(c);
      });
    });
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (c) { c.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    items.forEach(function (c) { io.observe(c); });
  }

  /* ------------------------------------------------------------------ 4 --
     ERROR SHAKE
     The template shakes a field that fails validation. This site already
     writes the message and the aria-live announcement; this only adds the
     motion, and only for people who haven't asked for less of it.
     ---------------------------------------------------------------------- */
  function shake() {
    if (REDUCE) return;
    document.addEventListener('animationend', function (e) {
      if (e.animationName === 'ommaShake') e.target.classList.remove('omma-shake');
    });
    /* the site toggles [hidden] on .field-err when a field fails */
    new MutationObserver(function (recs) {
      recs.forEach(function (r) {
        var el = r.target;
        if (!el.classList || !el.classList.contains('field-err')) return;
        if (el.hasAttribute('hidden')) return;
        var card = el.closest('.cap-card');
        if (!card) return;
        card.classList.remove('omma-shake');
        void card.offsetWidth;                 /* restart the animation */
        card.classList.add('omma-shake');
      });
    }).observe(document.body, {
      attributes: true, subtree: true, attributeFilter: ['hidden']
    });
  }


  /* ------------------------------------------------------------------ 5 --
     CUBE STEP MARKERS
     The template's process cubes, on the step numbers this site already has.
     Pure CSS 3D — no WebGL — which is why this lives here and not in the gated
     module: a phone was losing it for no reason.
     ---------------------------------------------------------------------- */
  function cubes() {
    if (REDUCE) return;
    document.querySelectorAll('.bp-step > .n, .book-point > .n, .proc-n').forEach(function (n, i) {
      if (n.dataset.ommaCube) return;
      n.dataset.ommaCube = '1';
      var num = n.textContent.trim();
      n.classList.add('omma-cube-slot');
      /* the number goes on all four SIDE faces. Front + right alone leaves a
         dead zone between 135 and 225 degrees where a blank face is toward the
         camera and the step silently loses its number. */
      n.innerHTML =
        '<span class="omma-cube" style="animation-delay:' + (-i * 1.7).toFixed(1) + 's">' +
        '<i class="f1">' + num + '</i><i class="f2">' + num + '</i>' +
        '<i class="f3">' + num + '</i><i class="f4">' + num + '</i>' +
        '<i class="f5"></i><i class="f6"></i></span>';
    });
  }

  /* ------------------------------------------------------------------ 6 --
     LETTERED ANSWER KEYS
     The fit check re-renders on every answer, so watch rather than query once.
     ---------------------------------------------------------------------- */
  function answerKeys() {
    var body = document.getElementById('fitBody');
    if (!body) return;
    function mark() {
      body.querySelectorAll('.fit-opt').forEach(function (b, i) {
        if (b.dataset.ommaLetter) return;
        b.dataset.ommaLetter = '1';
        var tag = document.createElement('i');
        tag.className = 'omma-opt-key';
        tag.setAttribute('aria-hidden', 'true');
        tag.textContent = String.fromCharCode(65 + i);
        b.insertBefore(tag, b.firstChild);
      });
    }
    mark();
    new MutationObserver(function () { try { mark(); } catch (e) {} })
      .observe(body, { childList: true, subtree: true });
  }

  /* ------------------------------------------------------------------ 7 --
     FLOATING-LABEL FIELDS
     Presentational only: name, type, autocomplete, required and
     aria-describedby all stay on the original input, so validation and the
     Netlify form stubs behave exactly as before.
     ---------------------------------------------------------------------- */
  function floatLabels() {
    function wrap() {
      document.querySelectorAll('.cap-card input[placeholder]').forEach(function (input) {
        if (input.dataset.ommaFloat || input.type === 'checkbox') return;
        input.dataset.ommaFloat = '1';
        var text = input.getAttribute('placeholder');
        var box = document.createElement('span');
        box.className = 'omma-float';
        input.parentNode.insertBefore(box, input);
        box.appendChild(input);
        var label = document.createElement('span');
        label.className = 'omma-float-label';
        label.setAttribute('aria-hidden', 'true');
        label.textContent = text;
        box.appendChild(label);
        /* a space keeps :placeholder-shown accurate while showing nothing */
        input.setAttribute('placeholder', ' ');
        input.setAttribute('aria-label', text);
      });
    }
    wrap();
    new MutationObserver(function () { try { wrap(); } catch (e) {} })
      .observe(document.body, { childList: true, subtree: true });
  }

  function boot() {
    ticker(); bars(); lift(); shake();
    cubes(); answerKeys(); floatLabels();
    document.documentElement.classList.add('omma-design-on');
  }
  if (document.readyState === 'loading') {
    addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

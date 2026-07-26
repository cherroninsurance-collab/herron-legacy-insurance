/* Herron & Co. — premium upgrade layer (docs/premium-upgrade-spec.md §2–3).
   Scroll-driven 3D product wheel + why-card glow.
   Desktop + fine pointer only; everywhere else the normal grid renders untouched. */
(function () {
  'use strict';

  /* ---- why-card cursor glow: one delegated, passive listener ---- */
  document.addEventListener('pointermove', function (e) {
    var c = e.target.closest && e.target.closest('.hx-why-card');
    if (!c) return;
    var r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  /* ---- 3D product wheel ---- */
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
  document.getElementById('coverage').classList.add('hx-on');

  var n = cards.length;
  var step = 360 / n;
  // radius that stops neighbouring faces intersecting: (w/2) / tan(step/2)
  var w = Math.min(520, innerWidth * 0.88);
  var radius = Math.round((w / 2) / Math.tan((step / 2) * Math.PI / 180));

  cards.forEach(function (c, i) {
    gsap.set(c, {
      xPercent: -50,
      yPercent: -50,
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
    cards.forEach(function (c, i) {
      c.classList.toggle('hx-front', i === idx);
      c.classList.toggle('hx-dim', i !== idx);
    });
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
    scrub: true,
    anticipatePin: 1,
    animation: gsap.to(wheel, {
      rotationY: -(step * (n - 1)),
      ease: 'none'
    }),
    onUpdate: function (self) {
      face(Math.round(self.progress * (n - 1)));
    }
  });

  /* Anchor shim: five nav links (desktop + mobile sheet) point INTO these cards.
     Map those hashes onto the wheel's scroll span so navigation keeps working.
     Only card ids are intercepted — every other anchor behaves exactly as before. */
  var ids = cards.map(function (c) { return c.id; }).filter(Boolean);
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var idx = ids.indexOf(id);
    if (idx < 0) return;
    e.preventDefault();
    var y = st.start + (st.end - st.start) * (idx / (n - 1));
    window.scrollTo({ top: y, behavior: 'auto' });
    face(idx);
    /* if the mobile sheet is open, close it through its own toggle so body
       overflow + aria state are restored by the site's existing handler */
    var sheet = document.getElementById('navSheet');
    var burger = document.getElementById('navBurger');
    if (sheet && burger && sheet.classList.contains('open')) burger.click();
  }, true);

  /* The site's own "Check my fit" handler smooth-scrolls to #fitcheck. While this
     section is pinned, that lands short (the pin spacer shifts mid-animation). We
     don't touch their handler — we let it run, then immediately re-issue an instant,
     corrected jump: first past the pin's end so it releases, then to the quiz. */
  wheel.addEventListener('click', function (e) {
    var go = e.target.closest && e.target.closest('.go[data-track]');
    if (!go) return;
    setTimeout(function () {
      var fit = document.getElementById('fitcheck');
      if (!fit) return;
      window.scrollTo({ top: st.end + 10, behavior: 'auto' });
      requestAnimationFrame(function () {
        fit.scrollIntoView({ behavior: 'auto', block: 'start' });
      });
    }, 60);
  }, false);

  addEventListener('resize', function () { ScrollTrigger.refresh(); }, { passive: true });
})();

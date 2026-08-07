/* ============================================================================
   THE PROTECTION PLAN — four devices on one scroll-driven camera path
   ----------------------------------------------------------------------------
   Ported from the second Omma export (docs/omma-explainer-source/). What came
   across is the geometry, the four-light bright rig and the authored camera
   stops. What did not: the copy (see that folder's README — most of the
   statistics were unsourced and several claims were the licensed agent's to
   make, not a generator's), the decorative bars drawn beside real numbers, and
   the orbiting orb around the monument.

   WHY A SEPARATE PAGE AND NOT A HOMEPAGE SECTION
   This pattern needs to own the scroll — the camera flies between four stops as
   the document scrolls, which is precisely what the homepage cannot give up.
   It also cannot share the homepage's Painter, because that draws N bounded
   stages per frame and this is one full-viewport scene. So: its own page, its
   own single renderer, the same way the Matrix and the Blueprint work.

   THE DEVICES ARE THE ARGUMENT
     care     — a shield with three bars: one policy doing three jobs
     paycheck — six months of income, one struck out, the rest carried
     home     — a house with a shield laid over it
     legacy   — a monument that outlasts the person who built it

   PROGRESSIVE ENHANCEMENT
   Every panel is real HTML in the document. This module only adds the scene
   behind them. No JavaScript, no WebGL, reduced motion, weak hardware — the
   page is still a readable four-section article with every disclosure and
   every source visible. Nothing here carries content.
   ========================================================================== */
import * as THREE from '../vendor/three.module.min.js';

(function () {
  'use strict';

  const host = document.getElementById('planCanvas');
  if (!host) return;

  const REDUCE = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const MOBILE = matchMedia('(pointer:coarse)').matches;
  const lowCpu = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
  const lowMem = navigator.deviceMemory && navigator.deviceMemory <= (MOBILE ? 4 : 2);
  if (REDUCE || lowCpu || lowMem) return;   /* the article stands on its own */

  /* --------------------------------------------------------------- palette --
     The export shipped its own ivory/navy/gold set. These are the site's. */
  const C = {
    navy:     0x0E1F3E,
    navyMid:  0x1E3A66,
    brass:    0xBE9235,
    brassLit: 0xE0BE79,
    brassDim: 0x8A5F10,
    paper:    0xFDFCF9,
    porcelain:0xF6F7FA,
    mist:     0xDCE4F1,
    slate:    0x5A6A82,
    glass:    0xD0E4F7,
    risk:     0xA85B43
  };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !MOBILE, alpha: true });
  } catch (e) {
    return;                                  /* no context — article only */
  }
  renderer.setPixelRatio(MOBILE ? 1 : Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  /* No shadow map. The export turned one on at 1024²; on a page whose ground is
     near-white the contact shadow buys almost nothing and costs a whole pass. */
  host.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
  document.documentElement.classList.add('plan-3d-on');

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(C.paper, 11, 26);
  const camera = new THREE.PerspectiveCamera(42, 1.6, 0.1, 80);

  /* ------------------------------------------------------------ light rig --
     The export's four-light bright-scene setup, kept intact: ivory ambient,
     warm key from upper-left, cool rim from behind, warm bounce from below.
     Lighting a light scene is harder than lighting a dark one and this works. */
  scene.add(new THREE.AmbientLight(0xF7F4EC, 0.75));
  const key = new THREE.DirectionalLight(0xFFF5DC, 1.65); key.position.set(-6, 10, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0xC8D8F0, 0.55); rim.position.set(10, 4, -8); scene.add(rim);
  const bounce = new THREE.DirectionalLight(0xE3C476, 0.20); bounce.position.set(0, -6, 4); scene.add(bounce);

  const M = {
    navy:      new THREE.MeshStandardMaterial({ color: C.navy, roughness: 0.30, metalness: 0.42 }),
    navyMid:   new THREE.MeshStandardMaterial({ color: C.navyMid, roughness: 0.38, metalness: 0.30 }),
    brass:     new THREE.MeshStandardMaterial({ color: C.brass, roughness: 0.22, metalness: 0.68 }),
    brassDim:  new THREE.MeshStandardMaterial({ color: C.brassDim, roughness: 0.32, metalness: 0.60 }),
    paper:     new THREE.MeshStandardMaterial({ color: C.paper, roughness: 0.55, metalness: 0.04 }),
    porcelain: new THREE.MeshStandardMaterial({ color: C.porcelain, roughness: 0.60, metalness: 0.02 }),
    slate:     new THREE.MeshStandardMaterial({ color: C.slate, roughness: 0.42, metalness: 0.26 }),
    glass:     new THREE.MeshStandardMaterial({ color: C.glass, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.30 }),
    risk:      new THREE.MeshStandardMaterial({ color: C.risk, roughness: 0.38, metalness: 0.16 })
  };

  /* a shield outline, reused at two sizes */
  function shieldPath(P, s) {
    P.moveTo(0, 2.2 * s);
    P.lineTo(1.6 * s, 1.4 * s);
    P.lineTo(1.6 * s, -0.4 * s);
    P.quadraticCurveTo(1.6 * s, -2.0 * s, 0, -2.6 * s);
    P.quadraticCurveTo(-1.6 * s, -2.0 * s, -1.6 * s, -0.4 * s);
    P.lineTo(-1.6 * s, 1.4 * s);
    P.closePath();
    return P;
  }

  /* ---------------------------------------------------------- 1. the care --
     A shield carrying three bars — one policy, three jobs. */
  function careDevice() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shieldPath(new THREE.Shape(), 1), {
        depth: 0.28, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 4
      }), M.navy);
    g.add(body);

    /* the border is the same outline at 1.11x with the body punched out of it */
    const border = shieldPath(new THREE.Shape(), 1.11);
    border.holes.push(shieldPath(new THREE.Path(), 1));
    const bm = new THREE.Mesh(new THREE.ExtrudeGeometry(border, { depth: 0.06, bevelEnabled: false }), M.brass);
    bm.position.z = 0.25; g.add(bm);

    const bars = [];
    [-0.55, 0, 0.55].forEach((y, i) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.12), i === 1 ? M.brass : M.brassDim);
      b.position.set(0, y, 0.36); g.add(b); bars.push(b);
    });
    g.position.set(0, 0.3, 0);
    g.userData.bars = bars;
    scene.add(g);
    return g;
  }

  /* ------------------------------------------------------ 2. the paycheck --
     Six months of income. One is struck out; the rest are carried. */
  function paycheckDevice() {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.18, 1.4), M.porcelain);
    base.position.set(0, -1.6, 0); g.add(base);

    const data = [
      { h: 1.8, m: M.navy,  x: -1.5 },
      { h: 1.8, m: M.navy,  x: -0.9 },
      { h: 1.8, m: M.navy,  x: -0.3 },
      { h: 0.4, m: M.risk,  x:  0.3 },   /* the month the income stops */
      { h: 1.4, m: M.brass, x:  0.9 },   /* the benefit picks it up */
      { h: 1.8, m: M.brass, x:  1.5 }
    ];
    const bars = [];
    data.forEach(b => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, b.h, 0.9), b.m);
      mesh.position.set(b.x, -1.6 + b.h / 2 + 0.09, 0);
      mesh.userData.h = b.h;
      g.add(mesh); bars.push(mesh);
    });

    const slash = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.92), M.brass);
    slash.rotation.z = Math.PI / 5; slash.position.set(0.3, -1.1, 0); g.add(slash);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.04, 0.08), M.brass);
    rail.position.set(0, -1.52, 0.69); g.add(rail);

    g.position.set(6.2, 0.3, 0);
    g.userData.bars = bars;
    scene.add(g);
    return g;
  }

  /* ---------------------------------------------------------- 3. the home --
     A house with a shield laid over it. */
  function homeDevice() {
    const g = new THREE.Group();
    const walls = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 1.2), M.paper);
    walls.position.set(0, -0.5, 0); g.add(walls);

    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0, 1.85, 1.2, 4, 1), M.navy);
    roof.rotation.y = Math.PI / 4; roof.position.set(0, 0.7, 0); g.add(roof);

    /* the export reached for M.navyMid, which its own material table did not
       define — the door silently fell through to slate. It exists here. */
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.68, 0.08), M.navyMid);
    door.position.set(0, -1.06, 0.64); g.add(door);

    [-0.72, 0.72].forEach(x => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.08), M.glass);
      w.position.set(x, -0.38, 0.64); g.add(w);
    });

    const sh = shieldPath(new THREE.Shape(), 0.69);
    const shMat = new THREE.MeshStandardMaterial({
      color: C.brass, roughness: 0.22, metalness: 0.58, transparent: true, opacity: 0.40
    });
    const shield = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false }), shMat);
    shield.position.set(-0.55, 0.0, 0.68); g.add(shield);

    const ckMat = new THREE.MeshStandardMaterial({ color: C.brass, roughness: 0.2, metalness: 0.7 });
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), ckMat);
    stem.rotation.z = -0.55; stem.position.set(-0.73, -0.30, 0.78); g.add(stem);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), ckMat);
    arm.rotation.z = 0.62; arm.position.set(-0.45, -0.06, 0.78); g.add(arm);

    g.position.set(11.4, 0.3, 0);
    scene.add(g);
    return g;
  }

  /* -------------------------------------------------------- 4. the legacy --
     A monument. The export flew a gold orb around it on a circular path; that
     is the orbiting look that got cut from the homepage, so the ring stays and
     the orb does not. Contained, attached, no free flight. */
  function legacyDevice() {
    const g = new THREE.Group();
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.28, 32), M.porcelain);
    ped.position.set(0, -1.7, 0); g.add(ped);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 3.2, 32), M.navy);
    g.add(col);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.9), M.brass);
    cap.position.set(0, 1.71, 0); g.add(cap);
    const apex = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.45, 0.7, 4, 1), M.brass);
    apex.rotation.y = Math.PI / 4; apex.position.set(0, 2.21, 0); g.add(apex);

    /* two static rings around the shaft — a band, not an orbit */
    [0.2, -0.75].forEach((y, i) => {
      const r = new THREE.Mesh(
        new THREE.TorusGeometry(1.1 - i * 0.18, 0.05, 14, 72),
        i === 0 ? M.brass : M.brassDim);
      r.rotation.x = Math.PI / 2.4;
      r.position.y = y;
      g.add(r);
    });

    g.position.set(17.2, 0.3, 0);
    scene.add(g);
    return g;
  }

  const devices = {
    care: careDevice(), paycheck: paycheckDevice(),
    home: homeDevice(), legacy: legacyDevice()
  };

  /* Ground. The export lit this warm and ran it to the fog, which on a
     near-white page draws a hard beige horizon straight across the reading
     column. It sits lower here, takes the page's own paper colour, and the fog
     is tight enough that it dissolves instead of ending in a line. */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 26),
    new THREE.MeshStandardMaterial({ color: C.paper, roughness: 0.95, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -2.05, 2);
  scene.add(ground);

  /* ============================================================ the camera ==
     The export's authored-stop model, kept whole because it is the best idea in
     that project. Each stop owns a position, a target, a field of view, an
     easing curve — and a DWELL, the fraction of the segment the camera holds
     still before it starts moving. Without dwell a scroll camera never appears
     to arrive anywhere; it is always already leaving. */
  const EASE = {
    easeOutQuad:    t => 1 - (1 - t) * (1 - t),
    easeInOutQuad:  t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    easeOutCubic:   t => 1 - Math.pow(1 - t, 3),
    easeInOutSine:  t => -(Math.cos(Math.PI * t) - 1) / 2
  };
  /* The export authored its stops for a page with no copy beside the device, so
     they framed each one dead centre and close. Here the panel owns the left of
     a wide screen, so the camera pulls back (the devices are 4–5 units and were
     filling the frame) and aims LEFT of the device, which pushes the device into
     the right half. On a narrow screen there is no room beside anything: the
     camera centres and lifts, the panel sits low, and the device reads above it. */
  const WIDE = () => innerWidth >= 900;
  const DEVICE_X = { care: 0, paycheck: 6.2, home: 11.4, legacy: 17.2 };

  function stopsFor(wide) {
    const aim = wide ? -2.3 : 0;       /* how far left of the device to look */
    const dist = wide ? 12.6 : 11.5;
    const camY = wide ? 2.1 : 1.9;
    const tgtY = wide ? 0.5 : 0.35;
    /* Narrow runs the scene in a short band, so the frame is wide and flat. At
       the desktop field of view the visible width there is about 12 units and
       the devices are 6.2 apart — the neighbours on both sides push into shot.
       Tightening the angle pulls the half-width under 6.2 and leaves one
       device in frame, which is the whole point of a stop. */
    const fovK = wide ? 1 : 0.78;
    const mk = (key, fov, ease, dwell) => ({
      key, ease, dwell, fov: fov * fovK,
      pos: [DEVICE_X[key] + (wide ? 1.1 : 0), camY, dist],
      tgt: [DEVICE_X[key] + aim, tgtY, 0]
    });
    return [
      mk('care',     40, 'easeInOutSine',  0.34),
      mk('paycheck', 38, 'easeOutQuad',    0.30),
      mk('home',     42, 'easeInOutCubic', 0.26),
      mk('legacy',   44, 'easeOutCubic',   0.40)
    ];
  }
  let STOPS = stopsFor(WIDE());
  const N = STOPS.length;

  function segment(a, t) {
    const d = Math.max(0, Math.min(0.9, a.dwell || 0));
    const u = d <= 0 ? t : (t <= d ? 0 : (t - d) / (1 - d));
    return (EASE[a.ease] || EASE.easeInOutQuad)(u);
  }

  const camState = { pos: new THREE.Vector3(0, 1.6, 7.4), tgt: new THREE.Vector3(0, 0.6, 0), fov: 42 };
  function sample(i, t) {
    const a = STOPS[i], b = STOPS[i + 1], e = segment(a, t);
    camState.pos.set(
      a.pos[0] + (b.pos[0] - a.pos[0]) * e,
      a.pos[1] + (b.pos[1] - a.pos[1]) * e,
      a.pos[2] + (b.pos[2] - a.pos[2]) * e);
    camState.tgt.set(
      a.tgt[0] + (b.tgt[0] - a.tgt[0]) * e,
      a.tgt[1] + (b.tgt[1] - a.tgt[1]) * e,
      a.tgt[2] + (b.tgt[2] - a.tgt[2]) * e);
    camState.fov = a.fov + (b.fov - a.fov) * e;
    return t < 0.5 ? i : i + 1;
  }

  /* ---------------------------------------------------------- page scroll --
     The document scrolls normally; the fraction is read off it. Nothing is
     pinned and nothing hijacks the wheel — the page can always be scrolled
     past, which is the difference between a scroll-driven scene and a trap. */
  const track = document.getElementById('planTrack');
  const panels = [].slice.call(document.querySelectorAll('.plan-panel'));
  const stopEls = [].slice.call(document.querySelectorAll('.plan-stop'));
  const dots = [].slice.call(document.querySelectorAll('.plan-dot'));

  /* Each camera stop is anchored to its own section's scroll position rather
     than to an even slice of the track. The sections are NOT equal heights — a
     panel with more copy is taller than the viewport — so dividing the track
     into N-1 equal parts parks the camera short of the device it is supposed to
     be looking at. Anchoring means stop k is reached exactly when section k
     reaches the top, whatever the heights turn out to be. */
  /* Layout position, walked up the offsetParent chain. Deliberately NOT
     getBoundingClientRect: the dim state carries translateY(14px), which the
     rect includes and offsetTop does not. Measuring anchors from the rect makes
     activating a panel move that panel's own anchor — a feedback loop that
     leaves the camera one stop behind wherever a panel sits near a boundary. */
  function absTop(el) {
    let y = 0;
    for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
    return y;
  }

  function progress() {
    if (!panels.length) return { i: 0, t: 0 };
    const y = scrollY;
    /* the anchor is where the PANEL'S CENTRE meets the viewport centre, not
       where its section starts. A panel with more copy than fits on screen is
       taller than its section's 100svh, so section tops drift out of step with
       what the reader is actually looking at; panel centres never do. */
    const at = panels.map(el => absTop(el) + el.offsetHeight / 2 - innerHeight / 2);
    if (y <= at[0]) return { i: 0, t: 0 };
    for (let k = 0; k < at.length - 1; k++) {
      if (y < at[k + 1]) {
        return { i: k, t: (y - at[k]) / Math.max(1, at[k + 1] - at[k]) };
      }
    }
    return { i: at.length - 2, t: 1 };
  }

  /* The canvas is fixed, so it also covers the intro above the track and the
     sources below it. Fade it against the track's own edges rather than leaving
     a 3D shield sitting behind the headline. */
  function sceneOpacity() {
    if (!track) return 0;
    const r = track.getBoundingClientRect();
    /* full strength only once the track's top has reached the top of the
       viewport — i.e. once the intro has actually scrolled away. Fading in
       from the bottom edge instead puts a shield behind the headline. */
    const inAt = Math.min(1, Math.max(0, (innerHeight * 0.4 - r.top) / (innerHeight * 0.4)));
    const outAt = Math.min(1, Math.max(0, r.bottom / (innerHeight * 0.5)));
    return Math.min(inAt, outAt);
  }

  let active = -1;
  function setActive(i) {
    if (i === active) return;
    active = i;
    panels.forEach((p, n) => p.classList.toggle('is-on', n === i));
    dots.forEach((d, n) => {
      d.classList.toggle('is-on', n === i);
      d.setAttribute('aria-current', n === i ? 'true' : 'false');
    });
  }

  dots.forEach((d, i) => d.addEventListener('click', () => {
    const el = panels[i];
    if (!el) return;
    scrollTo({ top: absTop(el) + el.offsetHeight / 2 - innerHeight / 2, behavior: 'smooth' });
  }));

  /* ----------------------------------------------------------------- loop --*/
  const smoothPos = camState.pos.clone();
  const smoothTgt = camState.tgt.clone();
  let W = 0, H = 0, vis = true, acc = 0;
  const STEP = MOBILE ? 1 / 24 : 0;

  new IntersectionObserver(es => es.forEach(e => { vis = e.isIntersecting; }),
    { rootMargin: '200px' }).observe(host);
  document.addEventListener('visibilitychange', () => { if (document.hidden) vis = false; });

  let wasWide = WIDE();
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (w === W && h === H) return;
    W = w; H = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    /* crossing the layout breakpoint re-authors the stops, so a rotated phone
       or a resized window gets the framing that matches the new column */
    const wide = WIDE();
    if (wide !== wasWide) { wasWide = wide; STOPS = stopsFor(wide); }
  }

  const clock = new THREE.Clock();
  (function loop() {
    requestAnimationFrame(loop);
    let dt = Math.min(clock.getDelta(), 0.05);
    if (!vis || !host.clientWidth) return;
    if (STEP) { acc += dt; if (acc < STEP) return; dt = Math.min(acc, 0.05); acc = 0; }
    const t = clock.elapsedTime;
    resize();

    const pr = progress();
    setActive(sample(pr.i, pr.t));
    host.style.opacity = sceneOpacity().toFixed(3);

    /* frame-rate-independent easing, so the throttled path lands in the same
       place as the full one rather than crawling */
    const k = 1 - Math.exp(-4.2 * dt);
    smoothPos.lerp(camState.pos, k);
    smoothTgt.lerp(camState.tgt, k);
    camera.position.copy(smoothPos);
    camera.lookAt(smoothTgt);
    if (Math.abs(camera.fov - camState.fov) > 0.04) {
      camera.fov += (camState.fov - camera.fov) * k;
    }
    camera.updateProjectionMatrix();

    devices.care.rotation.y = Math.sin(t * 0.40) * 0.18;
    devices.care.position.y = 0.3 + Math.sin(t * 0.60) * 0.07;
    devices.care.userData.bars.forEach((b, i) => {
      b.scale.x = 1 + Math.sin(t * 1.1 + i * 0.9) * 0.045;
    });

    devices.paycheck.rotation.y = Math.sin(t * 0.35) * 0.12;
    devices.paycheck.rotation.z = Math.sin(t * 0.50) * 0.022;

    devices.home.rotation.y = Math.sin(t * 0.30) * 0.14;
    devices.home.position.y = 0.3 + Math.sin(t * 0.50) * 0.05;

    devices.legacy.rotation.y = Math.sin(t * 0.16) * 0.28;

    renderer.render(scene, camera);
  })();
})();

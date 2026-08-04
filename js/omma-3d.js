/* ============================================================================
   OMMA 3D LAYER — Herron & Co. Legacy Agency
   ----------------------------------------------------------------------------
   A single WebGL "painter" that drives every interactive 3D surface on the site:

     • hero orbit        — brass/blue instrument rings + 7 product nodes turning
                           around the liquid-metal heron (the heron itself is
                           untouched; this renders BEHIND it)
     • coverage cards    — one live shader surface per product card
     • estimate studio   — a premium tower that rebuilds as the sliders move
     • fit check         — a compass whose needle seeks your leading answer
     • tool panes        — the Wealth Shield / Protection Blueprint devices
     • booking           — a lattice that converges when you focus a field
     • backdrop          — a slow field of light motes over the whole page

   ---------------------------------------------------------------------------
   WHY ONE RENDERER (read before adding a scene)
   ---------------------------------------------------------------------------
   Browsers hard-cap live WebGL contexts (~16, and they evict the oldest). This
   page already spends several: the heron SDF, the diamond field, and up to six
   liquid-glass panes. A renderer per scene would blow the budget and silently
   kill the emblem. So there is exactly ONE THREE.WebGLRenderer here, drawing
   into an offscreen buffer; each target owns a plain 2D canvas and receives its
   frame via drawImage(). Add scenes by calling painter.add(), never by
   constructing another WebGLRenderer.

   VISUAL LANGUAGE — BRIGHT / CORPORATE / FINTECH
   The page is ivory-frosted, so nothing here may darken it. Geometry is
   porcelain and light chrome with navy hairline edges and brass rims; blending
   is NORMAL (additive blooms wash out to grey mush on white); alpha stays low
   so copy always wins. The one dark element allowed is a thin navy line — the
   same "dark line on light" language as the heron emblem.

   SAFETY
     • fine pointers only — phones/tablets keep the existing lighter page
       (profiling history in CLAUDE.md: mobile cost is cumulative compositing)
     • prefers-reduced-motion and low-end devices bail entirely
     • every init is wrapped; one throwing scene can never stop the others
     • all of it is decoration — no content, disclosure or control depends on it
   ========================================================================== */

import * as THREE from '../vendor/three.module.min.js';

/* ----------------------------------------------------------------- palette --
   The homepage is ivory, so solids are light steel with navy hairline edges.
   The two tool pages are navy apps; set data-omma-theme="dark" on <html> there
   and the same scenes invert to bright metal on a dark field. Nothing else in
   the module branches on theme. */
const DARK = document.documentElement.dataset.ommaTheme === 'dark';
const C = DARK ? {
  navy:      0xE8C96A,   /* "edge" colour — gold hairlines on a navy page */
  navyDeep:  0x0A1128,
  ink:       0x8AA0C8,
  brass:     0xD4AF37,
  brassLit:  0xF0DCA6,
  gold:      0xFFF3D0,
  blue:      0x2DD4BF,
  blueSoft:  0x7FE6DA,
  porcelain: 0x1A2650,
  paper:     0x0A1128,
  mist:      0x243468
} : {
  navy:      0x0E1F3E,
  navyDeep:  0x081226,
  ink:       0x2B3C5E,
  brass:     0xBE9235,
  brassLit:  0xE0BE79,
  gold:      0xF0DCA6,
  blue:      0x4C7EE8,   /* the heron underline blue */
  blueSoft:  0x9DB8EE,
  porcelain: 0xF6F7FA,
  paper:     0xFDFCF9,
  mist:      0xDCE4F1
};

/* ------------------------------------------------------- shared page state -- */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp  = (a, b, t) => a + (b - a) * t;
const damp  = (cur, tgt, l, dt) => lerp(cur, tgt, 1 - Math.exp(-l * dt));

const scrollState = {
  y: 0, smooth: 0, vel: 0, progress: 0, _last: 0,
  update() {
    const y = window.scrollY || 0;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    this.vel += ((y - this._last) - this.vel) * 0.18;
    this._last = y; this.y = y;
    this.progress = Math.min(1, y / max);
    this.smooth += (y - this.smooth) * 0.09;
  }
};

const pointer = { nx: 0, ny: 0 };
addEventListener('pointermove', e => {
  pointer.nx = (e.clientX / innerWidth) * 2 - 1;
  pointer.ny = -((e.clientY / innerHeight) * 2 - 1);
}, { passive: true });

/* 0 → 1 as an element travels through the viewport */
function viewportProgress(el) {
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  return clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1);
}
/* -1 → 1, zero when the element is centred */
function centerOffset(el) {
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  const c = r.top + r.height / 2;
  return clamp((c - innerHeight / 2) / (innerHeight / 2 + r.height / 2), -1, 1);
}

/* ============================================================================
   THE PAINTER
   One renderer, an offscreen buffer, N plain 2D canvases.
   ========================================================================== */
class Painter {
  constructor() {
    this.pr = Math.min(devicePixelRatio || 1, 2);
    this.gl = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.gl.setPixelRatio(1);                 /* device pixels are managed here */
    this.gl.setClearColor(0x000000, 0);
    this.gl.setScissorTest(true);
    this.buf = this.gl.domElement;
    this.bw = 0; this.bh = 0;
    this.targets = [];
    this.clock = new THREE.Clock();
    this.running = false;
    this.hidden = false;
    document.addEventListener('visibilitychange', () => { this.hidden = document.hidden; });
  }

  /* spec: {el, canvas, scene, camera, update(dt,t,ctx), resize(w,h), scale} */
  add(spec) {
    spec.visible = false;
    spec.scale = spec.scale || 1;
    spec.ctx = spec.canvas.getContext('2d');
    spec.w = 0; spec.h = 0;
    this.targets.push(spec);
    new IntersectionObserver(
      es => es.forEach(e => { spec.visible = e.isIntersecting; }),
      { threshold: 0, rootMargin: '120px' }
    ).observe(spec.el);
    this.measure(spec);
    return spec;
  }

  measure(t) {
    const box = t.sizeFrom || t.el;
    const w = Math.max(1, Math.round(box.clientWidth));
    const h = Math.max(1, Math.round(box.clientHeight));
    if (w === t.w && h === t.h) return false;
    t.w = w; t.h = h;
    t.dw = Math.max(1, Math.round(w * this.pr * t.scale));
    t.dh = Math.max(1, Math.round(h * this.pr * t.scale));
    t.canvas.width = t.dw; t.canvas.height = t.dh;
    if (t.camera && t.camera.isPerspectiveCamera) {
      t.camera.aspect = w / h;
      t.camera.updateProjectionMatrix();
    }
    if (t.resize) t.resize(w, h);
    return true;
  }

  /* the offscreen buffer is as large as the biggest visible target */
  fitBuffer() {
    let mw = 1, mh = 1;
    for (const t of this.targets) {
      if (!t.visible) continue;
      if (t.dw > mw) mw = t.dw;
      if (t.dh > mh) mh = t.dh;
    }
    mw = Math.min(mw, 2400); mh = Math.min(mh, 1600);
    if (mw === this.bw && mh === this.bh) return;
    this.bw = mw; this.bh = mh;
    this.gl.setSize(mw, mh, false);
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      if (this.hidden) return;
      const t = this.clock.elapsedTime;
      scrollState.update();
      /* drop targets whose host left the document — the Protection Blueprint is
         a compiled bundle that replaces the whole DOM once it mounts, and the
         layer is re-attached afterwards rather than left pointing at ghosts */
      if (this.targets.some(t => t.el !== document.documentElement && !t.el.isConnected)) {
        this.targets = this.targets.filter(t => t.el === document.documentElement || t.el.isConnected);
      }
      this.fitBuffer();
      for (const tg of this.targets) {
        if (!tg.visible) continue;
        this.measure(tg);
        try { tg.update(dt, t); } catch (e) { tg.visible = false; continue; }
        if (tg.paint === false) continue;
        const dw = Math.min(tg.dw, this.bw), dh = Math.min(tg.dh, this.bh);
        /* GL's origin is bottom-left, but a WebGL canvas is PRESENTED to
           drawImage already flipped to top-left. Rendering into the viewport
           at y = bh - dh therefore lands at y = 0 of the source image — read
           from 0, not from bh - dh, or every target shows another target's
           slice of the buffer. */
        this.gl.setViewport(0, this.bh - dh, dw, dh);
        this.gl.setScissor(0, this.bh - dh, dw, dh);
        this.gl.clear(true, true, true);
        this.gl.render(tg.scene, tg.camera);
        tg.ctx.clearRect(0, 0, tg.dw, tg.dh);
        tg.ctx.drawImage(this.buf, 0, 0, dw, dh, 0, 0, tg.dw, tg.dh);
      }
    };
    loop();
  }
}

/* ------------------------------------------------------------- utilities -- */
function mkCanvas(cls) {
  const c = document.createElement('canvas');
  c.className = cls;
  c.setAttribute('aria-hidden', 'true');
  return c;
}
/* studio light rig shared by the solid scenes — warm key, cool fill, bright
   ambient so nothing on this page ever renders as a dark hole */
function studioLights(scene, warm = 2.0) {
  scene.add(new THREE.AmbientLight(0xFFFFFF, DARK ? 0.55 : 1.15));
  scene.add(new THREE.HemisphereLight(0xFFFFFF, DARK ? 0x18244A : 0xD9E2F2, DARK ? 0.6 : 0.9));
  const key = new THREE.DirectionalLight(0xFFF0D2, warm); key.position.set(4, 6, 6); scene.add(key);
  const fill = new THREE.DirectionalLight(DARK ? 0x6FE3D6 : 0xD9E4FA, DARK ? 0.9 : 1.15);
  fill.position.set(-5, -1, -4); scene.add(fill);
  return key;
}

/* ============================================================================
   1. HERO ORBIT — instrument rings around the liquid-metal heron
   ========================================================================== */
function heroOrbit(painter) {
  const crest = document.querySelector('.hero .crest');
  const heron = document.getElementById('heroHeron');
  if (!crest || !heron || crest.querySelector('.omma-orbit')) return;

  const host = document.createElement('div');
  host.className = 'omma-orbit';
  host.setAttribute('aria-hidden', 'true');
  const canvas = mkCanvas('omma-orbit-gl');
  host.appendChild(canvas);
  crest.insertBefore(host, crest.firstChild);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 8.6);
  const root = new THREE.Group();
  scene.add(root);
  studioLights(scene, 2.2);

  /* --- instrument rings: brass, blue, brass-light --- */
  const rings = [];
  [
    { r: 2.10, tube: 0.017, col: C.brass,    op: 0.90, tilt: [0.42, 0, 0.20], spd: 0.13 },
    { r: 2.74, tube: 0.011, col: C.blue,     op: 0.62, tilt: [-0.92, 0.40, 0], spd: 0.20 },
    { r: 3.30, tube: 0.008, col: C.brassLit, op: 0.42, tilt: [1.18, 0.20, 0.5], spd: 0.27 }
  ].forEach(sp => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(sp.r, sp.tube, 8, 150),
      new THREE.MeshBasicMaterial({ color: sp.col, transparent: true, opacity: sp.op })
    );
    m.rotation.set(sp.tilt[0], sp.tilt[1], sp.tilt[2]);
    m.userData.spd = sp.spd;
    rings.push(m); root.add(m);
  });

  /* --- seven product nodes: one per line of coverage --- */
  const nodes = new THREE.Group();
  const NODE_N = 7;
  const nodeGeo = new THREE.OctahedronGeometry(0.125, 0);
  for (let i = 0; i < NODE_N; i++) {
    const gold = i % 2 === 0;
    const m = new THREE.Mesh(nodeGeo, new THREE.MeshStandardMaterial({
      color: gold ? C.brassLit : C.porcelain,
      emissive: gold ? C.brass : C.blue,
      emissiveIntensity: gold ? 0.5 : 0.25,
      metalness: DARK ? 0.72 : 0.4, roughness: 0.22, flatShading: true
    }));
    m.userData = { a: (i / NODE_N) * Math.PI * 2, rad: 2.10 + (i % 3) * 0.62, yamp: 0.45 + (i % 4) * 0.26, spd: 0.30 + (i % 3) * 0.14 };
    nodes.add(m);
  }
  root.add(nodes);

  /* --- shield halo: a warm fresnel rim, never a dark sphere --- */
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(3.85, 42, 42),
    new THREE.ShaderMaterial({
      transparent: true, side: THREE.BackSide, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uPulse: { value: 0 } },
      vertexShader: `varying vec3 vN; varying vec3 vP;
        void main(){ vN = normalize(normalMatrix * normal); vP = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vN; varying vec3 vP; uniform float uTime, uPulse;
        void main(){
          float fres  = pow(1.0 - abs(dot(vN, vec3(0.0,0.0,1.0))), 3.0);
          float bands = sin(vP.y * 2.6 - uTime * 1.1) * 0.5 + 0.5;
          vec3  col   = mix(vec3(0.86,0.76,0.52), vec3(0.62,0.72,0.92), bands);
          float a     = fres * (0.10 + bands * 0.07) + uPulse * fres * 0.16;
          gl_FragColor = vec4(col, a);
        }`
    })
  );
  root.add(halo);

  /* --- floor plate: a quiet brass baseline under the emblem --- */
  const plate = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(
      new THREE.RingGeometry(1.55 + i * 0.52, 1.575 + i * 0.52, 96),
      new THREE.MeshBasicMaterial({ color: C.brass, transparent: true, opacity: 0.16 - i * 0.04, side: THREE.DoubleSide })
    );
    r.rotation.x = -Math.PI / 2;
    plate.add(r);
  }
  plate.position.y = -2.45;
  root.add(plate);

  /* --- drag to rotate, with inertia. The heron canvas above is pointer-none
         (see omma CSS) so the whole emblem area is grabbable. --- */
  let drag = false, px = 0, py = 0, velX = 0, velY = 0, rotX = 0, rotY = 0, hover = 0;
  host.addEventListener('pointerdown', e => {
    drag = true; px = e.clientX; py = e.clientY;
    host.setPointerCapture(e.pointerId); host.classList.add('is-grabbing');
  });
  const release = () => { drag = false; host.classList.remove('is-grabbing'); };
  host.addEventListener('pointerup', release);
  host.addEventListener('pointercancel', release);
  host.addEventListener('pointermove', e => {
    if (!drag) return;
    velY += (e.clientX - px) * 0.006;
    velX += (e.clientY - py) * 0.006;
    px = e.clientX; py = e.clientY;
  });
  host.addEventListener('pointerenter', () => { hover = 1; });
  host.addEventListener('pointerleave', () => { hover = 0; });

  let camDist = 8.6, camY = 0, hoverAmt = 0;

  painter.add({
    el: host, sizeFrom: host, canvas, scene, camera,
    update(dt, t) {
      const vp = viewportProgress(host);
      const exiting = clamp((vp - 0.5) * 2, 0, 1);

      camDist = damp(camDist, lerp(8.2, 11.4, exiting), 3.0, dt);
      camY = damp(camY, lerp(0, 1.1, exiting), 2.8, dt);
      const orbit = vp * 0.9 - 0.30 + pointer.nx * 0.06;
      camera.position.set(Math.sin(orbit) * camDist * 0.40, camY + Math.sin(t * 0.5) * 0.10, Math.cos(orbit) * camDist);
      camera.lookAt(0, 0, 0);

      rotY += velY; rotX += velX;
      velY *= 0.92; velX *= 0.92;
      rotY += dt * 0.14;
      rotX = clamp(rotX, -0.8, 0.8);
      root.rotation.y = rotY;
      root.rotation.x = rotX + Math.sin(t * 0.35) * 0.05;

      hoverAmt = damp(hoverAmt, hover, 5, dt);
      const pulse = Math.min(1, Math.abs(scrollState.vel) / 55);
      halo.material.uniforms.uTime.value = t;
      halo.material.uniforms.uPulse.value = damp(halo.material.uniforms.uPulse.value, Math.max(hoverAmt * 0.6, pulse), 5, dt);

      rings.forEach((r, i) => {
        r.rotation.z += dt * r.userData.spd * (1 + hoverAmt);
        r.rotation.x += dt * r.userData.spd * 0.30;
        r.scale.setScalar(1 + Math.sin(t * 0.9 + i) * 0.018);
      });

      nodes.children.forEach((m, i) => {
        const d = m.userData;
        d.a += dt * d.spd * (1 + hoverAmt * 0.8);
        m.position.set(Math.cos(d.a) * d.rad, Math.sin(d.a * 1.4 + i) * d.yamp, Math.sin(d.a) * d.rad);
        m.rotation.x += dt * 1.5; m.rotation.y += dt * 1.1;
        m.scale.setScalar(0.85 + Math.sin(t * 2.2 + i) * 0.12 + hoverAmt * 0.22);
      });

      plate.rotation.y += dt * 0.09;
      root.visible = vp < 0.995;
    }
  });
}

/* ============================================================================
   2. COVERAGE / ANNUITY CARD SURFACES
   Each card gets a live shader plane behind its copy plus a cursor glare.
   ========================================================================== */
const CARD_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const CARD_FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime, uHover, uVariant, uDark;
uniform vec2 uMouse;

mat2 rot(float a){ return mat2(cos(a),-sin(a),sin(a),cos(a)); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<4;i++){ v += a*noise(p); p *= 2.03; a *= 0.5; } return v; }

void main(){
  vec2 uv = vUv;
  vec2 p  = (uv - 0.5) * vec2(1.7, 1.0);
  float t = uTime * (0.30 + uHover * 0.45);
  float v = uVariant;
  float f = 0.0;

  if(v < 0.5){
    /* 00 mortgage protection — a shelter lattice, roof pitch and beams */
    vec2 q = p * rot(0.52) * 6.4;
    vec2 gv = abs(fract(q) - 0.5);
    f = smoothstep(0.45, 0.5, max(gv.x, gv.y));
    f *= 0.55 + 0.45 * sin(length(p) * 5.5 - t * 1.4);
  } else if(v < 1.5){
    /* 01 IUL — an index curve with its floor drawn under it */
    float y = sin(p.x * 3.6 + t) * 0.17 + fbm(vec2(p.x * 2.0, t * 0.22)) * 0.32;
    f  = smoothstep(0.045, 0.0, abs(p.y - y));
    f += smoothstep(0.085, 0.0, abs(p.y + 0.26)) * 0.45;
  } else if(v < 2.5){
    /* 02 long-term care — concentric care rings, one closing over the other */
    float r = length(p * rot(t * 0.13));
    f  = smoothstep(0.045, 0.0, abs(sin(r * 11.0 - t * 1.0)) * 0.06);
    f += (1.0 - r) * 0.16;
  } else if(v < 3.5){
    /* 03 final expense — a slow, settled drift */
    f = fbm(p * 2.1 + vec2(t * 0.10, -t * 0.06));
    f = pow(f, 1.8) * 1.35;
  } else if(v < 4.5){
    /* 04 annuities — income bars stepping up */
    float col = floor(uv.x * 13.0);
    float h = 0.22 + 0.55 * fract(sin(col * 12.9898) * 43758.5453);
    h *= 0.68 + 0.32 * sin(t * 1.2 + col * 0.8);
    f = step(uv.y, h) * (0.35 + 0.45 * fract(sin(col) * 99.0));
    f *= smoothstep(0.0, 0.22, uv.y);
  } else if(v < 5.5){
    /* 05 disability — a paycheck pulse, steady then interrupted */
    float beat = abs(sin(uv.x * 9.0 - t * 1.6));
    f = smoothstep(0.10, 0.0, abs(p.y - (beat - 0.5) * 0.30));
    f *= 0.5 + 0.5 * smoothstep(0.0, 0.35, fract(uv.x - t * 0.06));
  } else {
    /* 06 term & whole — level scanlines, the plainest product drawn plainly */
    float g = sin(p.y * 19.0 + t * 1.7 + fbm(p * 3.0 + t * 0.18) * 2.6);
    f = smoothstep(0.72, 1.0, g) * 0.85 + fbm(p * 2.0 - t * 0.1) * 0.22;
  }

  /* the cursor carries a soft light across the surface */
  float ml = smoothstep(0.62, 0.0, length(uv - uMouse)) * uHover;

  /* BRIGHT PAGE: ink the pattern in navy + brass at low alpha over the glass.
     uDark flips the ramp for dark surfaces (the wide classics card, and the
     two navy tool pages) where light must be added rather than subtracted. */
  vec3 inkCol   = mix(vec3(0.055,0.122,0.243), vec3(0.94,0.86,0.65), uDark);
  vec3 brassCol = mix(vec3(0.745,0.573,0.208), vec3(1.00,0.92,0.72), uDark);
  vec3 col = mix(inkCol, brassCol, clamp(f * 0.9 + ml * 0.5, 0.0, 1.0));

  float vig = smoothstep(1.35, 0.30, length((uv - 0.5) * 2.0));
  float base = mix(0.22, 0.34, uDark);
  float a = clamp(f * base + ml * 0.18, 0.0, 1.0) * vig * (0.62 + uHover * 0.38);
  gl_FragColor = vec4(col, a);
}`;

/* attach a live shader surface + cursor glare to any card-shaped element */
function attachSurface(painter, card, variant, dark, scale) {
  if (card.dataset.ommaSurface) return;
  card.dataset.ommaSurface = '1';

  const canvas = mkCanvas('omma-card-gl');
  const glare = document.createElement('span');
  glare.className = 'omma-card-glare';
  glare.setAttribute('aria-hidden', 'true');
  card.insertBefore(glare, card.firstChild);
  card.insertBefore(canvas, card.firstChild);
  card.classList.add('omma-card');

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uTime: { value: Math.random() * 12 }, uHover: { value: 0 },
    uVariant: { value: variant }, uDark: { value: dark ? 1 : 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) }
  };
  scene.add(new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ vertexShader: CARD_VERT, fragmentShader: CARD_FRAG, uniforms, transparent: true })
  ));

  let hover = 0;
  card.addEventListener('pointerenter', () => { hover = 1; });
  card.addEventListener('pointerleave', () => {
    hover = 0;
    card.style.setProperty('--ogx', '50%');
    card.style.setProperty('--ogy', '0%');
  });
  card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
    uniforms.uMouse.value.set(nx, 1 - ny);
    card.style.setProperty('--ogx', (nx * 100).toFixed(1) + '%');
    card.style.setProperty('--ogy', (ny * 100).toFixed(1) + '%');
  }, { passive: true });

  /* a focused field counts as engagement — the surface warms under the form */
  card.addEventListener('focusin', () => { hover = 1; });
  card.addEventListener('focusout', () => {
    if (!card.contains(document.activeElement)) hover = 0;
  });

  return painter.add({
    el: card, canvas, scene, camera, scale: scale || 0.75,
    update(dt) {
      uniforms.uTime.value += dt;
      uniforms.uHover.value = damp(uniforms.uHover.value, hover, 5, dt);
    }
  });
}

function cardSurfaces(painter) {
  /* variant per product id — annuity cards fall back to the income-bar pattern */
  const VARIANT = {
    mortgage: 0, iul: 1, ltc: 2, 'final-expense': 3,
    'annuities-card': 4, disability: 5, 'term-whole': 6
  };
  document.querySelectorAll('#coverage .cover-card').forEach(card => {
    const v = VARIANT[card.id];
    attachSurface(painter, card, v === undefined ? 6 : v, card.classList.contains('wide-classics'));
  });
  document.querySelectorAll('.ann-band .ann-card').forEach((card, i) => {
    attachSurface(painter, card, [4, 1, 2, 4][i % 4]);
  });
  /* the two tool pages mark their own panels — same treatment, dark ramp */
  document.querySelectorAll('[data-omma-card]').forEach((card, i) => {
    const v = card.dataset.ommaCard;
    attachSurface(painter, card, v === '' || isNaN(+v) ? [1, 4, 2, 0, 6, 3][i % 6] : +v, DARK);
  });
}

/* the lead-capture cards are rendered on demand by the fit check and the
   estimate studio, so watch for them rather than querying once */
function formSurfaces(painter) {
  const attach = () => {
    document.querySelectorAll('.cap-card').forEach(c => attachSurface(painter, c, 5, false, 0.7));
  };
  attach();
  new MutationObserver(() => { try { attach(); } catch (e) {} })
    .observe(document.body, { childList: true, subtree: true });
}

/* ============================================================================
   3. ESTIMATE STUDIO — a premium tower that rebuilds as the sliders move
   The studio's own state lives in a closure we do not own, so this reads the
   rendered controls instead. Decoupled on purpose: the pricing model, its
   ranges and its disclosure are never touched by the animation.
   ========================================================================== */
function quoteTower(painter) {
  const shell = document.querySelector('#quotes .q-shell');
  const tabs = document.getElementById('qTabs');
  const stage = document.getElementById('qStage');
  if (!shell || !tabs || !stage || shell.querySelector('.omma-stage-quote')) return;

  const host = document.createElement('div');
  host.className = 'omma-stage omma-stage-quote';
  host.setAttribute('aria-hidden', 'true');
  const canvas = mkCanvas('omma-stage-gl');
  host.appendChild(canvas);
  const cap = document.createElement('div');
  cap.className = 'omma-stage-cap';
  cap.textContent = 'Illustration only';
  host.appendChild(cap);
  tabs.insertAdjacentElement('afterend', host);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 2, 0.1, 100);
  studioLights(scene, 2.3);

  const tower = new THREE.Group();
  scene.add(tower);

  /* A BANK, NOT A TOWER. The stage is a wide letterbox, and one centred column
     left two thirds of it empty. Seven columns — one per product tab — fill the
     frame and say something true: the selected product builds to the coverage
     the controls are set to while the others stand by as outlines.
     Brushed light steel with navy hairline edges; porcelain on ivory vanishes. */
  const BANK = 7;          /* term, whole, final expense, annuity, IUL, LTC, DI */
  const N = 14;            /* courses per column */
  const STEP = 0.26;
  const GAP = 1.6;
  const blockGeo = new THREE.BoxGeometry(0.86, 0.20, 0.86);
  const edgeGeo = new THREE.EdgesGeometry(blockGeo);
  const columns = [];
  for (let c = 0; c < BANK; c++) {
    const col = new THREE.Group();
    col.position.x = (c - (BANK - 1) / 2) * GAP;
    const blocks = [];
    for (let i = 0; i < N; i++) {
      const mesh = new THREE.Mesh(blockGeo, new THREE.MeshPhysicalMaterial({
        color: DARK ? C.mist : 0xEFF3FA, roughness: 0.26, metalness: DARK ? 0.5 : 0.12,
        transparent: true, opacity: 0.94, clearcoat: 1, clearcoatRoughness: 0.12,
        emissive: C.brass, emissiveIntensity: 0
      }));
      const edge = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({
        color: C.navy, transparent: true, opacity: 0.55
      }));
      mesh.add(edge);
      mesh.userData = { edge, cur: 0 };
      mesh.position.y = i * STEP;
      col.add(mesh); blocks.push(mesh);
    }
    /* full-capacity guide: one hairline per column instead of fourteen ghost
       slabs. The bank reads as a chart, not as a pile of paper. */
    const guide = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, (N - 1) * STEP, 0)
      ]),
      new THREE.LineBasicMaterial({ color: C.navy, transparent: true, opacity: 0.14 })
    );
    col.add(guide);
    const beacon = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      new THREE.MeshStandardMaterial({ color: C.brassLit, emissive: C.brass, emissiveIntensity: 0.6, metalness: DARK ? 0.85 : 0.35, roughness: 0.16 })
    );
    beacon.visible = false;
    col.add(beacon);
    tower.add(col);
    columns.push({ col, blocks, beacon, guide, active: 0, lit: c === 0 ? 1 : 0 });
  }

  /* the rail the bank stands on — carries the full width of the frame */
  const rail = new THREE.Group();
  const railW = BANK * GAP + 1.2;
  for (let i = 0; i < 3; i++) {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-railW / 2, 0, (i - 1) * 0.85),
      new THREE.Vector3(railW / 2, 0, (i - 1) * 0.85)
    ]);
    rail.add(new THREE.Line(g, new THREE.LineBasicMaterial({
      color: i === 1 ? C.brass : C.navy, transparent: true, opacity: i === 1 ? 0.45 : 0.16
    })));
  }
  rail.position.y = -0.22;
  tower.add(rail);

  /* markers that sweep the bank — one per option group in the active product */
  const sats = new THREE.Group();
  const satGeo = new THREE.TetrahedronGeometry(0.17, 0);
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(satGeo, new THREE.MeshStandardMaterial({
      color: C.blueSoft, emissive: C.blue, emissiveIntensity: 0.45, roughness: 0.28, metalness: DARK ? 0.6 : 0.25
    }));
    m.userData = { a: (i / 5) * Math.PI * 2, on: 0 };
    m.visible = false;
    sats.add(m);
  }
  tower.add(sats);

  /* ---- read the studio's rendered state; never its private variables.
     The pricing model, its ranges and its disclosure are untouched by this. --- */
  let fillTarget = 0.5, heatTarget = 0.4, satCount = 0, activeTab = 0;
  function sample() {
    const tabList = [...tabs.querySelectorAll('.q-tab')];
    const on = tabList.findIndex(b => b.classList.contains('on'));
    activeTab = on < 0 ? 0 : on;

    const ranges = [...stage.querySelectorAll('input[type=range]')];
    if (ranges.length) {
      /* the widest range is the money control on every tab */
      let money = null, span = -1;
      ranges.forEach(r => {
        const s = (+r.max) - (+r.min);
        if (s > span) { span = s; money = r; }
      });
      if (money) {
        const f = ((+money.value) - (+money.min)) / Math.max(1, (+money.max) - (+money.min));
        fillTarget = clamp(0.16 + f * 0.84, 0.16, 1);
      }
      /* the age-like control drives how hot the built column glows */
      const ageish = ranges.find(r => (+r.max) <= 90 && (+r.min) >= 18);
      heatTarget = ageish
        ? clamp(((+ageish.value) - (+ageish.min)) / Math.max(1, (+ageish.max) - (+ageish.min)), 0, 1)
        : 0.4;
    }
    satCount = Math.min(5, stage.querySelectorAll('.q-seg').length);
    columns.forEach((c, i) => { c.lit = i === activeTab ? 1 : 0; });
    sats.children.forEach((m, i) => { m.userData.on = i < satCount ? 1 : 0; });
  }
  const resample = () => { try { sample(); } catch (e) {} };
  shell.addEventListener('input', resample, { passive: true });
  shell.addEventListener('click', () => setTimeout(resample, 0), { passive: true });
  new MutationObserver(resample).observe(stage, { childList: true, subtree: true });
  resample();

  let camAng = -0.25, camY = 2.2, camDist = 9.4, heat = 0.4;
  /* frame from the stage aspect: the bank is railW wide, so a wide letterbox
     pulls in while a narrow one pulls back rather than clipping the ends */
  let dist = 9.4;
  const frame = (w, h) => {
    const a = w / Math.max(1, h);
    const vFov = 44 * Math.PI / 180;
    const tan = Math.tan(vFov / 2);
    /* HALF-extents: the bank is railW wide and about 4.6 tall, and the camera
       looks at its middle. Using full extents here parked it twice as far away
       as it needed to be and the whole stage read as empty paper. */
    const dW = (railW / 2 + 0.5) / (tan * Math.max(0.9, a));
    const dH = 2.0 / tan;
    dist = Math.max(dW, dH);
  };
  frame(host.clientWidth, host.clientHeight);

  painter.add({
    el: host, sizeFrom: host, canvas, scene, camera, scale: 0.9,
    resize: frame,
    update(dt, t) {
      const vp = viewportProgress(host);
      const co = centerOffset(host);
      camAng = damp(camAng, lerp(-0.30, 0.30, vp) + pointer.nx * 0.07, 2.6, dt);
      camY = damp(camY, lerp(1.5, 3.2, vp) + co * 0.25, 2.4, dt);
      camDist = damp(camDist, dist + Math.abs(co) * 0.7, 2.4, dt);
      camera.position.set(Math.sin(camAng) * camDist, camY, Math.cos(camAng) * camDist);
      camera.lookAt(0, lerp(1.15, 1.55, vp), 0);

      heat = damp(heat, heatTarget, 3, dt);

      columns.forEach((c, ci) => {
        c.active = damp(c.active, c.lit, 4, dt);
        /* the selected product builds to the coverage on the controls; the rest
           stand by as low outlines */
        const fill = c.lit ? fillTarget : 0.22;
        let top = 0;
        c.blocks.forEach((b, i) => {
          const d = b.userData;
          const want = (i / N) < fill ? 1 : 0;
          d.cur = damp(d.cur, want, 6 + i * 0.3, dt);
          const y = i * STEP + Math.sin(t * 1.1 + i * 0.4 + ci) * 0.015 * d.cur;
          b.position.y = y;
          b.scale.set(0.55 + d.cur * 0.45, 0.18 + d.cur * 0.82, 0.55 + d.cur * 0.45);
          b.rotation.y = (1 - d.cur) * 0.9 + t * 0.03 + i * 0.03;
          /* unfilled courses keep only their navy hairline */
          b.material.opacity = d.cur * 0.94 * (0.55 + c.active * 0.45);
          b.material.emissiveIntensity = d.cur * c.active * heat * (0.24 + 0.14 * Math.sin(t * 2 - i * 0.5));
          d.edge.material.opacity = d.cur * 0.6 * (0.45 + c.active * 0.55);
          if (d.cur > 0.5) top = y;
        });
        c.guide.material.opacity = 0.08 + c.active * 0.14;
        c.beacon.visible = c.active > 0.25;
        c.beacon.position.y = top + 0.6 + Math.sin(t * 1.4) * 0.07;
        c.beacon.scale.setScalar(0.4 + c.active * 0.6);
        c.beacon.rotation.y += dt * 1.0; c.beacon.rotation.x += dt * 0.6;
      });

      tower.rotation.y = Math.sin(t * 0.09) * 0.05;

      sats.children.forEach((m, i) => {
        const d = m.userData;
        d.a += dt * (0.34 + i * 0.05);
        m.visible = d.on > 0 && i < 3;
        /* markers travel the rail, they do not float loose in the frame */
        m.position.set(Math.sin(d.a) * (railW * 0.46), 0.16, 1.5 + i * 0.55);
        m.rotation.y += dt * 1.4;
      });
    }
  });
}

/* ============================================================================
   4. FIT CHECK — a compass that turns toward your leading answer
   ========================================================================== */
function fitCompass(painter) {
  const shell = document.querySelector('#fitcheck .fit-shell');
  const body = document.getElementById('fitBody');
  const bar = document.getElementById('fitBar');
  if (!shell || !body || shell.querySelector('.omma-stage-fit')) return;

  const host = document.createElement('div');
  host.className = 'omma-stage omma-stage-fit';
  host.setAttribute('aria-hidden', 'true');
  const canvas = mkCanvas('omma-stage-gl');
  host.appendChild(canvas);
  const label = document.createElement('div');
  label.className = 'omma-compass-label';
  host.appendChild(label);
  shell.insertBefore(host, shell.firstChild);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 2, 0.1, 60);
  studioLights(scene, 2.1);
  const rig = new THREE.Group(); scene.add(rig);

  /* a thin instrument plate: cool steel face, navy edge, brass bezel */
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(2.35, 2.35, 0.09, 72),
    new THREE.MeshPhysicalMaterial({
      color: DARK ? C.porcelain : 0xF4F7FC,
      metalness: DARK ? 0.5 : 0.10, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1
    })
  );
  rig.add(disc);
  rig.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.CylinderGeometry(2.37, 2.37, 0.10, 72)),
    new THREE.LineBasicMaterial({ color: C.navy, transparent: true, opacity: 0.45 })
  ));
  const bezel = new THREE.Mesh(
    new THREE.TorusGeometry(2.37, 0.035, 8, 120),
    new THREE.MeshStandardMaterial({ color: C.brassLit, emissive: C.brass, emissiveIntensity: 0.4, metalness: DARK ? 0.9 : 0.35, roughness: 0.2 })
  );
  bezel.rotation.x = -Math.PI / 2; bezel.position.y = 0.05; rig.add(bezel);

  /* radial ticks — this is what makes a disc read as an instrument rather
     than a pancake. 60 minor, every 5th major. */
  const tickPts = [];
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const inner = i % 5 === 0 ? 1.95 : 2.12;
    tickPts.push(
      new THREE.Vector3(Math.sin(a) * inner, 0.051, Math.cos(a) * inner),
      new THREE.Vector3(Math.sin(a) * 2.28, 0.051, Math.cos(a) * 2.28)
    );
  }
  const ticks = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(tickPts),
    new THREE.LineBasicMaterial({ color: C.navy, transparent: true, opacity: 0.34 })
  );
  rig.add(ticks);

  /* the eight doors of the fit check, in the order the first question lists them */
  const TRACKS = ['mortgage', 'iul', 'trucker', 'ltc', 'final', 'term', 'annuity', 'disability'];
  const markers = TRACKS.map((key, i) => {
    const a = (i / TRACKS.length) * Math.PI * 2;
    const g = new THREE.Group();
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.8, 8),
      new THREE.MeshBasicMaterial({ color: C.ink, transparent: true, opacity: 0.30 })
    );
    post.position.y = 0.4; g.add(post);
    const orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.17, 0),
      new THREE.MeshStandardMaterial({ color: C.blueSoft, emissive: C.blue, emissiveIntensity: 0.22, roughness: 0.3, metalness: DARK ? 0.6 : 0.2, flatShading: true })
    );
    orb.position.y = 0.9; g.add(orb);
    g.position.set(Math.sin(a) * 1.92, 0.05, Math.cos(a) * 1.92);
    g.userData = { key, angle: a, orb, post, lit: 0, cur: 0 };
    rig.add(g);
    return g;
  });

  const needle = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.ConeGeometry(0.15, 1.9, 4),
    new THREE.MeshStandardMaterial({ color: C.brassLit, emissive: C.brass, emissiveIntensity: 0.5, metalness: DARK ? 0.8 : 0.35, roughness: 0.18 })
  );
  shaft.rotation.x = -Math.PI / 2; shaft.position.z = 0.95; needle.add(shaft);
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.10, 0.72, 4),
    new THREE.MeshStandardMaterial({ color: C.navy, metalness: 0.7, roughness: 0.3 })
  );
  tail.rotation.x = Math.PI / 2; tail.position.z = -0.36; needle.add(tail);
  needle.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 24, 24),
    new THREE.MeshPhysicalMaterial({ color: C.navy, metalness: 0.9, roughness: 0.14, clearcoat: 1 })
  ));
  needle.position.y = 0.28;
  rig.add(needle);

  /* progress halo — fills as the four questions are answered */
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(2.62, 0.055, 8, 140),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uProg: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec2 vUv; uniform float uTime, uProg;
        void main(){
          float a = smoothstep(uProg, uProg - 0.02, vUv.x);
          float pulse = 0.5 + 0.5 * sin(vUv.x * 34.0 - uTime * 2.6);
          vec3 c = mix(vec3(0.745,0.573,0.208), vec3(0.94,0.86,0.66), pulse);
          gl_FragColor = vec4(c, a * (0.45 + pulse * 0.4));
        }`
    })
  );
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.09; rig.add(halo);

  /* ---- follow the quiz by reading what it renders ---- */
  let targetAngle = 0, progress = 0, settled = false;
  function sync() {
    const w = bar ? parseFloat(bar.style.width) || 0 : 0;
    progress = clamp(w / 100, 0, 1);
    settled = progress >= 0.999;
    const stepLabel = body.querySelector('.fit-step-label');
    const heading = body.querySelector('.fit-result h3');
    let name = '';
    if (heading) name = heading.textContent.replace(/ looks like your fit\.?$/, '');
    else if (stepLabel && stepLabel.textContent.includes('·')) name = stepLabel.textContent.split('·')[1].trim();

    if (name) {
      const n = name.toLowerCase();
      let key = 'term';
      if (n.includes('mortgage')) key = 'mortgage';
      else if (n.includes('indexed') || n.includes('iul')) key = 'iul';
      else if (n.includes('truck') || n.includes('owner-operator')) key = 'trucker';
      else if (n.includes('care')) key = 'ltc';
      else if (n.includes('final')) key = 'final';
      else if (n.includes('annuit')) key = 'annuity';
      else if (n.includes('disab') || n.includes('paycheck')) key = 'disability';
      const m = markers.find(x => x.userData.key === key);
      if (m) targetAngle = m.userData.angle;
      markers.forEach(x => { x.userData.lit = x.userData.key === key ? 1 : 0; });
      label.textContent = name;
    } else {
      markers.forEach(x => { x.userData.lit = 0; });
      label.textContent = '';
    }
  }
  new MutationObserver(() => { try { sync(); } catch (e) {} }).observe(body, { childList: true, subtree: true });
  sync();

  let needleAng = 0, camY = 2.0, camAng = 0, camDist = 6.4;
  let dNear = 6.6, dFar = 5.8;
  const frame = (w, h) => {
    /* fit the dial's 4.9 diameter — half-extents, and the dial is raked so its
       on-screen height is much less than its width */
    const a = w / Math.max(1, h);
    const tan = Math.tan(44 * Math.PI / 360);
    const need = Math.max(2.7 / (tan * Math.max(0.8, a)), 1.65 / tan);
    dNear = need + 0.6; dFar = need;
  };
  frame(host.clientWidth, host.clientHeight);

  painter.add({
    el: host, sizeFrom: host, canvas, scene, camera, scale: 0.9,
    resize: frame,
    update(dt, t) {
      const vp = viewportProgress(host);
      const co = centerOffset(host);
      camY = damp(camY, lerp(1.5, 3.4, vp), 2.5, dt);
      camAng = damp(camAng, lerp(-0.38, 0.38, vp) + co * 0.14 + pointer.nx * 0.07, 2.5, dt);
      camDist = damp(camDist, lerp(dNear, dFar, Math.min(1, vp * 1.4)) + Math.abs(co) * 0.6, 2.5, dt);
      camera.position.set(Math.sin(camAng) * camDist, camY, Math.cos(camAng) * camDist);
      camera.lookAt(0, 0.3, 0);
      rig.rotation.y = Math.sin(t * 0.1) * 0.06 + co * 0.1;

      let d = targetAngle - needleAng;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      needleAng += d * (1 - Math.exp(-(settled ? 4.5 : 6.5) * dt));
      needle.rotation.y = needleAng + (settled ? 0 : Math.sin(t * 6) * 0.03);
      needle.position.y = 0.28 + Math.sin(t * 1.3) * 0.025;

      halo.material.uniforms.uTime.value = t;
      halo.material.uniforms.uProg.value = damp(halo.material.uniforms.uProg.value, progress, 4, dt);

      markers.forEach(m => {
        const u = m.userData;
        u.cur = damp(u.cur, u.lit, 5, dt);
        u.orb.material.emissiveIntensity = 0.14 + u.cur * (1.0 + Math.sin(t * 3) * 0.3);
        u.orb.material.color.setHex(u.cur > 0.5 ? C.brassLit : C.blueSoft);
        u.orb.scale.setScalar(1 + u.cur * 0.6);
        u.post.material.opacity = 0.24 + u.cur * 0.5;
        u.orb.rotation.y += dt * (0.6 + u.cur * 2.0);
      });
      disc.rotation.y -= dt * 0.05;
    }
  });
}

/* ============================================================================
   5. TOOL PANES — a working device above each screenshot
   Left: the Wealth Shield (two columns, one shielded, market crashing past).
   Right: the Protection Blueprint (four shields orbiting a core).
   ========================================================================== */
function toolDevices(painter) {
  const panes = [...document.querySelectorAll('.tools-band .tool-pane')];
  if (!panes.length) return;

  panes.forEach((pane, idx) => {
    const shot = pane.querySelector('.t-shot');
    if (!shot || pane.querySelector('.omma-stage-tool')) return;
    const host = document.createElement('div');
    host.className = 'omma-stage omma-stage-tool';
    host.setAttribute('aria-hidden', 'true');
    const canvas = mkCanvas('omma-stage-gl');
    host.appendChild(canvas);
    shot.insertAdjacentElement('beforebegin', host);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 2, 0.1, 60);
    studioLights(scene, 2.2);
    const rig = new THREE.Group(); scene.add(rig);

    const parts = idx === 0 ? shieldDevice(rig) : blueprintDevice(rig);

    /* these panes are narrow — frame tight or the device reads as a speck */
    let base = 6.4;
    const frame = (w, h) => {
      const a = w / Math.max(1, h);
      base = a > 2.6 ? 4.9 : a > 1.9 ? 5.4 : 6.6;
    };
    frame(host.clientWidth, host.clientHeight);

    painter.add({
      el: host, sizeFrom: host, canvas, scene, camera, scale: 0.85,
      resize: frame,
      update(dt, t) {
        const vp = viewportProgress(host);
        const co = centerOffset(host);
        const ang = lerp(-0.38, 0.38, vp) + pointer.nx * 0.10;
        const dist = base + (1 - Math.min(1, vp * 1.5)) * 0.9 + Math.abs(co) * 0.5;
        camera.position.set(Math.sin(ang) * dist, 1.1 + co * 0.4, Math.cos(ang) * dist);
        camera.lookAt(0, 0.1, 0);
        parts(dt, t, vp);
      }
    });
  });
}

/* two value columns — the shielded one holds when the market drops */
function shieldDevice(rig) {
  const cols = [];
  for (let i = 0; i < 2; i++) {
    const g = new THREE.Group();
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: C.porcelain, roughness: 0.12, metalness: 0.1,
      transparent: true, opacity: 0.34, clearcoat: 1
    });
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 3.6, 44, 1, true), glassMat);
    g.add(tube);
    /* EdgesGeometry on an open cylinder draws every facet seam — it looked like
       a barcode. Two clean rim rings instead. */
    [-1.8, 1.8].forEach(y => {
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.82, 0.018, 8, 60),
        new THREE.MeshBasicMaterial({ color: C.navy, transparent: true, opacity: 0.45 })
      );
      rim.rotation.x = Math.PI / 2; rim.position.y = y; g.add(rim);
    });
    const fill = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.76, 1, 44),
      new THREE.MeshStandardMaterial({
        color: i === 0 ? C.brassLit : C.blueSoft,
        emissive: i === 0 ? C.brass : C.blue,
        emissiveIntensity: i === 0 ? 0.4 : 0.2,
        metalness: DARK ? 0.55 : 0.18, roughness: 0.26
      })
    );
    g.add(fill);
    g.position.x = i === 0 ? -1.5 : 1.5;
    rig.add(g);
    cols.push({ g, fill, level: 0.72, target: 0.72, shielded: i === 0 });
  }

  /* the shield: a brass torus cage around the protected column */
  const shield = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.028, 8, 90),
      new THREE.MeshBasicMaterial({ color: C.brass, transparent: true, opacity: 0.7 - i * 0.14 })
    );
    t.rotation.x = Math.PI / 2;
    t.position.y = -1.1 + i * 1.1;
    shield.add(t);
  }
  shield.position.x = -1.5;
  rig.add(shield);

  /* the market line running behind both */
  const PTS = 90;
  const lg = new THREE.BufferGeometry();
  const lp = new Float32Array(PTS * 3);
  lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: C.blue, transparent: true, opacity: 0.5 }));
  line.position.z = -1.9;
  rig.add(line);

  let cycle = 0;
  return (dt, t) => {
    cycle = (cycle + dt * 0.16) % 1;
    /* a downturn sweeps through the middle of every cycle */
    const crash = Math.max(0, Math.sin((cycle - 0.35) * Math.PI / 0.4)) * (cycle > 0.35 && cycle < 0.75 ? 1 : 0);
    cols.forEach(c => {
      c.target = c.shielded ? 0.78 : 0.78 - crash * 0.52;
      c.level = damp(c.level, c.target, 3.2, dt);
      const h = Math.max(0.04, c.level * 3.4);
      c.fill.scale.y = h;
      c.fill.position.y = -1.8 + h / 2;
    });
    shield.rotation.y += dt * 0.5;
    shield.children.forEach((s, i) => {
      s.material.opacity = (0.5 - i * 0.11) * (0.7 + 0.3 * Math.sin(t * 2 + i)) + crash * 0.25;
    });
    const arr = lg.attributes.position.array;
    for (let i = 0; i < PTS; i++) {
      const x = -3.6 + (i / (PTS - 1)) * 7.2;
      const ph = i / (PTS - 1);
      const dip = Math.max(0, Math.sin((ph - 0.35) * Math.PI / 0.4)) * (ph > 0.35 && ph < 0.75 ? 1 : 0);
      arr[i * 3] = x;
      arr[i * 3 + 1] = 1.0 + Math.sin(ph * 16 + t * 0.7) * 0.14 + ph * 0.5 - dip * 2.1;
      arr[i * 3 + 2] = 0;
    }
    lg.attributes.position.needsUpdate = true;
    rig.rotation.y = Math.sin(t * 0.13) * 0.09;
  };
}

/* four shields orbiting a core — care, paycheck, home, legacy */
function blueprintDevice(rig) {
  const COLS = [C.brassLit, C.blueSoft, C.mist, C.brass];
  const shields = COLS.map((col, i) => {
    const g = new THREE.Group();
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 0.92, 0.07, 6),
      new THREE.MeshPhysicalMaterial({ color: col, metalness: DARK ? 0.62 : 0.22, roughness: 0.24, clearcoat: 1 })
    );
    plate.rotation.x = Math.PI / 2;
    g.add(plate);
    g.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.95, 0.95, 0.08, 6)),
      new THREE.LineBasicMaterial({ color: C.navy, transparent: true, opacity: 0.4 })
    ).rotateX(Math.PI / 2));
    g.userData = { a: (i / 4) * Math.PI * 2 };
    rig.add(g);
    return g;
  });

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.62, 1),
    new THREE.MeshPhysicalMaterial({ color: C.porcelain, metalness: 0.45, roughness: 0.2, clearcoat: 1, flatShading: true })
  );
  rig.add(core);
  const coreWire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.64, 1)),
    new THREE.LineBasicMaterial({ color: C.brass, transparent: true, opacity: 0.6 })
  );
  rig.add(coreWire);

  const spokes = new THREE.BufferGeometry();
  const sp = new Float32Array(4 * 2 * 3);
  spokes.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const spokeLines = new THREE.LineSegments(spokes, new THREE.LineBasicMaterial({ color: C.navy, transparent: true, opacity: 0.2 }));
  rig.add(spokeLines);

  return (dt, t) => {
    core.rotation.y += dt * 0.32; core.rotation.x += dt * 0.14;
    coreWire.rotation.copy(core.rotation);
    core.scale.setScalar(1 + Math.sin(t * 1.5) * 0.03);
    const arr = spokes.attributes.position.array;
    shields.forEach((g, i) => {
      const u = g.userData;
      u.a += dt * 0.28;
      const r = 2.5, y = Math.sin(t * 0.8 + i * 1.6) * 0.35;
      const x = Math.cos(u.a) * r, z = Math.sin(u.a) * r;
      g.position.set(x, y, z);
      g.rotation.y = -u.a + Math.PI / 2;
      g.rotation.z = Math.sin(t * 0.9 + i) * 0.16;
      arr[i * 6] = x; arr[i * 6 + 1] = y; arr[i * 6 + 2] = z;
      arr[i * 6 + 3] = 0; arr[i * 6 + 4] = 0; arr[i * 6 + 5] = 0;
    });
    spokes.attributes.position.needsUpdate = true;
    rig.rotation.y = Math.sin(t * 0.1) * 0.1;
  };
}

/* ============================================================================
   6. BOOKING — a lattice that converges when you engage the calendar
   ========================================================================== */
function bookingField(painter) {
  const copy = document.querySelector('#booking .book-copy');
  if (!copy || document.querySelector('.omma-book-field')) return;

  const host = document.createElement('div');
  host.className = 'omma-book-field';
  host.setAttribute('aria-hidden', 'true');
  const canvas = mkCanvas('omma-stage-gl');
  host.appendChild(canvas);
  document.querySelector('#booking').insertBefore(host, document.querySelector('#booking').firstChild);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 2, 0.1, 60);
  studioLights(scene, 1.9);
  const rig = new THREE.Group(); scene.add(rig);

  const geos = [
    new THREE.TorusKnotGeometry(0.5, 0.15, 80, 12),
    new THREE.IcosahedronGeometry(0.62, 0),
    new THREE.OctahedronGeometry(0.68, 0),
    new THREE.TorusGeometry(0.54, 0.13, 12, 50),
    new THREE.DodecahedronGeometry(0.6, 0)
  ];
  const shapes = [];
  for (let i = 0; i < 10; i++) {
    const gold = i % 3 === 0;
    const m = new THREE.Mesh(geos[i % geos.length], new THREE.MeshPhysicalMaterial({
      color: gold ? C.brassLit : C.porcelain,
      metalness: DARK ? 0.68 : 0.26, roughness: 0.24, clearcoat: 1,
      emissive: gold ? C.brass : C.blue, emissiveIntensity: gold ? 0.16 : 0.08
    }));
    m.userData = {
      bx: (Math.random() - 0.5) * 9.5, by: (Math.random() - 0.5) * 6.4, bz: (Math.random() - 0.5) * 4 - 1,
      sp: 0.22 + Math.random() * 0.5, ph: Math.random() * 6.28, sc: 0.45 + Math.random() * 0.6
    };
    m.scale.setScalar(m.userData.sc);
    shapes.push(m); rig.add(m);
  }

  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(shapes.length * 2 * 3), 3));
  const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: C.brass, transparent: true, opacity: 0.14 }));
  rig.add(lines);

  /* the calendar is a third-party iframe, so hovering the frame stands in for
     "engaging" — the lattice draws together as you reach for a time */
  let pullTarget = 0, pull = 0;
  const frame = document.querySelector('#booking .book-frame');
  if (frame) {
    frame.addEventListener('pointerenter', () => { pullTarget = 1; });
    frame.addEventListener('pointerleave', () => { pullTarget = 0; });
  }

  painter.add({
    el: document.querySelector('#booking'), sizeFrom: host, canvas, scene, camera, scale: 0.6,
    update(dt, t) {
      const vp = viewportProgress(host);
      const ang = lerp(-0.3, 0.3, vp) + pointer.nx * 0.1;
      const dist = lerp(12.5, 10.2, Math.min(1, vp * 1.5));
      camera.position.set(Math.sin(ang) * dist, pointer.ny * 0.6 + lerp(-1, 1, vp) * 0.5, Math.cos(ang) * dist);
      camera.lookAt(0, 0, 0);

      pull = damp(pull, pullTarget, 3.2, dt);
      const arr = lg.attributes.position.array;
      shapes.forEach((m, i) => {
        const u = m.userData;
        const px = u.bx * (1 - pull * 0.6) + Math.sin(t * u.sp + u.ph) * 0.45;
        const py = u.by * (1 - pull * 0.6) + Math.cos(t * u.sp * 0.8 + u.ph) * 0.45;
        const pz = u.bz * (1 - pull * 0.45) + Math.sin(t * u.sp * 0.6 + u.ph) * 0.3;
        m.position.set(px, py, pz);
        m.rotation.x += dt * u.sp * 0.8; m.rotation.y += dt * u.sp * 1.1;
        m.scale.setScalar(u.sc * (1 + pull * 0.22 + Math.sin(t * 1.5 + u.ph) * 0.035));
        arr[i * 6] = px; arr[i * 6 + 1] = py; arr[i * 6 + 2] = pz;
      });
      lg.attributes.position.needsUpdate = true;
      lines.material.opacity = 0.08 + pull * 0.22;
      rig.rotation.z = Math.sin(t * 0.08) * 0.05;
    }
  });
}

/* ============================================================================
   7. BACKDROP — a slow field of light motes behind the whole page
   Rendered at a fraction of viewport resolution: it is out-of-focus by design.
   ========================================================================== */
function backdrop(painter) {
  if (document.querySelector('.omma-backdrop')) return;
  const host = document.createElement('div');
  host.className = 'omma-backdrop';
  host.setAttribute('aria-hidden', 'true');
  const canvas = mkCanvas('omma-backdrop-gl');
  host.appendChild(canvas);
  document.body.insertBefore(host, document.body.firstChild);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 120);
  camera.position.set(0, 0, 26);

  const COUNT = 900;
  const pos = new Float32Array(COUNT * 3);
  const seed = new Float32Array(COUNT);
  const sz = new Float32Array(COUNT);
  const tone = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 74;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 120;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 32 - 6;
    seed[i] = Math.random() * Math.PI * 2;
    sz[i] = 0.5 + Math.random() * 1.7;
    tone[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  g.setAttribute('aTone', new THREE.BufferAttribute(tone, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uScroll: { value: 0 }, uBoost: { value: 0 },
      /* brass motes over a cool minority — ink on ivory, light on navy */
      uWarm: { value: new THREE.Color(DARK ? 0xD4AF37 : 0xBE9235) },
      uCool: { value: new THREE.Color(DARK ? 0x2DD4BF : 0x6B85B8) },
      uAlpha: { value: DARK ? 0.55 : 0.30 }
    },
    vertexShader: `
      attribute float aSeed; attribute float aSize; attribute float aTone;
      uniform float uTime, uScroll, uBoost;
      varying float vA; varying float vTone;
      void main(){
        vec3 p = position;
        p.y += sin(uTime * 0.22 + aSeed) * 1.3;
        p.x += cos(uTime * 0.16 + aSeed * 1.7) * 1.0;
        p.y = mod(p.y + uScroll * 0.010 + 60.0, 120.0) - 60.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float d = -mv.z;
        vA = smoothstep(62.0, 6.0, d) * (0.35 + 0.65 * abs(sin(uTime * 0.6 + aSeed)));
        vA *= 1.0 + uBoost * 1.1;
        vTone = aTone;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * (300.0 / max(d, 1.0)) * (1.0 + uBoost * 0.5);
      }`,
    fragmentShader: `
      varying float vA; varying float vTone;
      uniform vec3 uWarm, uCool; uniform float uAlpha;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float r = length(c);
        if(r > 0.5) discard;
        float a = smoothstep(0.5, 0.0, r) * vA;
        vec3 col = mix(uWarm, uCool, step(0.72, vTone));
        gl_FragColor = vec4(col, a * uAlpha);
      }`
  });
  const points = new THREE.Points(g, mat);
  scene.add(points);

  /* a faint drafting grid that tilts as the page advances */
  const grid = new THREE.Group();
  const gm = new THREE.LineBasicMaterial({ color: C.blue, transparent: true, opacity: 0.055 });
  for (let i = -9; i <= 9; i++) {
    const a = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(i * 4.4, -40, -16), new THREE.Vector3(i * 4.4, 40, -16)]);
    const b = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-40, i * 4.4, -16), new THREE.Vector3(40, i * 4.4, -16)]);
    grid.add(new THREE.Line(a, gm), new THREE.Line(b, gm));
  }
  scene.add(grid);

  let camX = 0, camY = 0;
  const sizer = { clientWidth: 0, clientHeight: 0 };
  const resync = () => { sizer.clientWidth = innerWidth; sizer.clientHeight = innerHeight; };
  resync();
  addEventListener('resize', resync, { passive: true });

  const target = painter.add({
    el: document.documentElement, sizeFrom: sizer, canvas, scene, camera, scale: 0.5,
    update(dt, t) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uScroll.value = scrollState.smooth;
      const boost = Math.min(1, Math.abs(scrollState.vel) / 60);
      mat.uniforms.uBoost.value = damp(mat.uniforms.uBoost.value, boost, 6, dt);
      camX = damp(camX, pointer.nx * 2.0, 2.2, dt);
      camY = damp(camY, pointer.ny * 1.4, 2.2, dt);
      camera.position.set(camX, camY, 26 + scrollState.progress * 7);
      camera.lookAt(0, camY * 0.3, -6);
      grid.rotation.x = scrollState.progress * 0.45 - 0.1;
      grid.rotation.z = Math.sin(t * 0.05) * 0.05 + scrollState.progress * 0.22;
      points.rotation.z = scrollState.progress * 0.18;
    }
  });
  target.visible = true;   /* documentElement never intersects — keep it on */
}

/* ============================================================================
   8. NON-WEBGL POLISH — magnetic CTAs, tilting tool panes, marquee of products
   ========================================================================== */
function polish() {
  /* --- magnetic primary buttons --- */
  document.querySelectorAll('.btn-brass, .btn-navy').forEach(btn => {
    if (btn.classList.contains('omma-magnet')) return;
    btn.classList.add('omma-magnet');
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      const mx = (e.clientX - r.left - r.width / 2) / r.width;
      const my = (e.clientY - r.top - r.height / 2) / r.height;
      btn.style.setProperty('--mgx', (mx * 8).toFixed(2) + 'px');
      btn.style.setProperty('--mgy', (my * 6).toFixed(2) + 'px');
    }, { passive: true });
    btn.addEventListener('pointerleave', () => {
      btn.style.setProperty('--mgx', '0px');
      btn.style.setProperty('--mgy', '0px');
    });
  });

  /* --- numbered steps become slowly turning 3D cubes. Pure CSS transforms:
         the number stays readable on the front face at every angle. --- */
  document.querySelectorAll('.bp-step > .n, .book-point > .n, .proc-n').forEach((n, i) => {
    if (n.dataset.ommaCube) return;
    n.dataset.ommaCube = '1';
    const num = n.textContent.trim();
    n.classList.add('omma-cube-slot');
    n.innerHTML =
      '<span class="omma-cube" style="animation-delay:' + (-i * 1.7).toFixed(1) + 's">' +
      '<i class="f1">' + num + '</i><i class="f2">' + num + '</i><i class="f3"></i>' +
      '<i class="f4"></i><i class="f5"></i><i class="f6"></i></span>';
  });

  /* --- fit-check answers get the template's lettered badges --- */
  const fitBody = document.getElementById('fitBody');
  if (fitBody) {
    const letter = () => {
      const opts = fitBody.querySelectorAll('.fit-opt');
      opts.forEach((b, i) => {
        if (b.dataset.ommaLetter) return;
        b.dataset.ommaLetter = '1';
        const tag = document.createElement('i');
        tag.className = 'omma-opt-key';
        tag.setAttribute('aria-hidden', 'true');
        tag.textContent = String.fromCharCode(65 + i);
        b.insertBefore(tag, b.firstChild);
      });
    };
    letter();
    new MutationObserver(() => { try { letter(); } catch (e) {} })
      .observe(fitBody, { childList: true, subtree: true });
  }

  /* --- the template's floating-label fields, applied to the lead-capture
         forms. Purely presentational: name, type, autocomplete, required and
         aria-describedby all stay on the original input, so validation and the
         Netlify form stubs behave exactly as before. --- */
  const floatLabels = () => {
    document.querySelectorAll('.cap-card input[placeholder]').forEach(input => {
      if (input.dataset.ommaFloat || input.type === 'checkbox') return;
      input.dataset.ommaFloat = '1';
      const text = input.getAttribute('placeholder');
      const wrap = document.createElement('span');
      wrap.className = 'omma-float';
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);
      const label = document.createElement('span');
      label.className = 'omma-float-label';
      label.setAttribute('aria-hidden', 'true');
      label.textContent = text;
      wrap.appendChild(label);
      /* a space keeps :placeholder-shown accurate while showing nothing */
      input.setAttribute('placeholder', ' ');
      input.setAttribute('aria-label', text);
    });
  };
  floatLabels();
  new MutationObserver(() => { try { floatLabels(); } catch (e) {} })
    .observe(document.body, { childList: true, subtree: true });

  /* --- the emblem is draggable, so say so once --- */
  const orbit = document.querySelector('.omma-orbit');
  if (orbit && !document.querySelector('.omma-hint')) {
    const hint = document.createElement('span');
    hint.className = 'omma-hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.textContent = 'Drag to rotate';
    orbit.parentElement.appendChild(hint);
  }

  /* --- tool panes and why-cards get a tracked sheen. Never a 3D tilt: these
         are backdrop-filter surfaces and Chrome glitches transformed glass. --- */
  document.querySelectorAll('.tool-pane, .ann-card').forEach(el => {
    if (el.classList.contains('omma-sheen')) return;
    el.classList.add('omma-sheen');
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--ogx', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
      el.style.setProperty('--ogy', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
    }, { passive: true });
  });

}

/* ============================================================================
   BOOT
   ========================================================================== */
/* One renderer for the life of the page, even across a DOM rebuild. Every step
   below is guarded (a surface records data-omma-surface, a stage bails when its
   host already exists), so calling boot() again only re-attaches what is
   missing. */
let PAINTER = null;

function boot() {
  if (!PAINTER) PAINTER = new Painter();
  const painter = PAINTER;
  const steps = [
    ['hero orbit', () => heroOrbit(painter)],
    ['card surfaces', () => cardSurfaces(painter)],
    ['form surfaces', () => formSurfaces(painter)],
    ['quote tower', () => quoteTower(painter)],
    ['fit compass', () => fitCompass(painter)],
    ['tool devices', () => toolDevices(painter)],
    ['booking field', () => bookingField(painter)],
    ['backdrop', () => backdrop(painter)],
    ['polish', () => polish()]
  ];
  for (const [, fn] of steps) {
    try { fn(); } catch (e) { /* one dead scene must never stop the rest */ }
  }
  document.documentElement.classList.add('omma-on');
  painter.start();
}
window.__ommaBoot = boot;

(function gate() {
  try {
    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
    const coarse = matchMedia('(pointer:coarse)').matches;
    const lowMem = navigator.deviceMemory && navigator.deviceMemory <= 2;
    const lowCpu = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
    /* Phones and tablets keep the lighter page on purpose — profiling showed the
       mobile cost here is cumulative compositing, not any single scene. */
    if (reduce || coarse || lowMem || lowCpu) { window.__ommaGated = true; return; }
    if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  } catch (e) { /* no 3D layer; the page is already complete without it */ }
})();

/* ============================================================================
   LIQUID GLASS — physics-based WebGL refraction container
   ----------------------------------------------------------------------------
   Wraps the "Talk to Legacy AI" chat shell and the "Legacy Blueprint" card in
   a superellipse (squircle) pane of simulated thick glass:

     • Vertex shader   — low-frequency simplex noise ripples the glass surface
                         ("liquid mercury" micro-waves). Screen-space
                         derivatives of that ripple perturb the shading normal.
     • Fragment shader — signed-distance squircle with a noise-wobbled fluid
                         border, thick-slab refraction of a procedural
                         recreation of the page background (deep indigo /
                         purple / cyan gradient blobs + the site's 56px layout
                         grid), per-channel chromatic aberration at the bevel,
                         Fresnel rim lighting with a moving specular light that
                         lerps toward the cursor.

   WHY A PROCEDURAL BACKGROUND? WebGL cannot sample the live DOM behind the
   canvas (that would be a cross-origin screen-read). The industry trick is to
   re-render a matching ambient scene inside the shader — the sections behind
   these containers get matching CSS blob layers (.lg-blob), so the refracted
   scene inside the glass reads as the real page bending through it.

   SAFETY SYSTEMS (all mandatory guardrails implemented):
     1. Progressive enhancement — the markup ships with a pure-CSS
        backdrop-filter glass ALREADY ACTIVE. WebGL only upgrades it
        (adds .lg-webgl-on). If this module never loads (CDN down, old
        browser, JS off) the page is already correct.
     2. try/catch around every init — any throw calls fail() which removes
        the canvas and applies .webgl-failed-fallback (blur(20px) glass).
     3. webglcontextlost — same fail() path; we never attempt a live restore
        because a lost context on a low-end GPU tends to thrash.
     4. Pixel-ratio clamp — Math.min(devicePixelRatio, 2) so 3x/4x mobile
        panels don't quadruple fragment load.
     5. Low-end gate — <=2GB deviceMemory, <=2 cores, or
        prefers-reduced-motion keeps the CSS fallback (no WebGL at all).
     6. IntersectionObserver + visibilitychange — the render loop fully
        stops when a pane is off-screen or the tab is hidden.
     7. Layering contract — canvas: z-index 10 / pointer-events NONE.
        Content: z-index 20 / pointer-events AUTO. Enforced inline here and
        in the stylesheet, so UI can never become unclickable.
   ========================================================================== */

// Vendored locally (npm three@0.161.0) — no third-party CDN in the critical
// path; the module either loads with the site or the CSS fallback stands.
import * as THREE from './vendor/three.module.min.js';

/* --------------------------------------------------------------------------
   GLSL: 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT).
   Shared by both shaders. We feed it (x, y, time) so the 2D field evolves
   smoothly — this is the "liquid" in liquid glass.
   -------------------------------------------------------------------------- */
const GLSL_SIMPLEX = /* glsl */`
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g  = step(x0.yzx, x0.xyz);
  vec3 l  = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

/* --------------------------------------------------------------------------
   VERTEX SHADER — the liquid surface.
   The pane is a 1×1 plane with 96×96 segments viewed by an orthographic
   camera. Two octaves of LOW-FREQUENCY simplex noise (3 and 6 cycles across
   the pane, drifting slowly in time) displace each vertex along Z. Under an
   ortho camera that displacement is invisible in silhouette — what matters
   is that we export the height field as `vRipple`; the fragment shader takes
   its screen-space derivatives (dFdx/dFdy) to recover the *slope* of the
   displaced surface, which is exactly the normal perturbation of a rippling
   liquid film. Geometry and shading therefore agree by construction.
   -------------------------------------------------------------------------- */
const VERT = /* glsl */`
uniform float uTime;
varying vec2  vUv;
varying float vRipple;
${GLSL_SIMPLEX}
void main(){
  vUv = uv;
  // Octave 1: broad 3-cycle swell. Octave 2: finer 6-cycle shimmer.
  // Time scales (0.14 / 0.21) keep the motion languid — mercury, not water.
  float n1 = snoise(vec3(uv * 3.0,        uTime * 0.14));
  float n2 = snoise(vec3(uv * 6.0 + 17.0, uTime * 0.21));
  vRipple  = n1 * 0.72 + n2 * 0.28;
  vec3 p = position;
  p.z += vRipple * 0.02;                 // real displacement (feeds derivatives)
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

/* --------------------------------------------------------------------------
   FRAGMENT SHADER — refraction, chromatic aberration, Fresnel.
   All positional math is done in CSS pixels (uSize = canvas CSS size) so the
   look is identical at any devicePixelRatio.
   -------------------------------------------------------------------------- */
const FRAG = /* glsl */`
precision highp float;

uniform float uTime;
uniform vec2  uSize;      // canvas size in CSS px (includes the bleed apron)
uniform float uBleed;     // px of transparent apron around the pane (for halo)
uniform vec2  uMouse;     // lerped cursor, container space, [-1,1] each axis
uniform float uScroll;    // slow parallax offset from page scroll
uniform vec3  uColA;      // theme: background base (deep)
uniform vec3  uColB;      // theme: background base (lifted)
uniform vec3  uBlob1;     // theme: blob colors — purple / indigo / cyan
uniform vec3  uBlob2;
uniform vec3  uBlob3;
uniform vec3  uTint;      // glass body tint
uniform float uTintAmt;   // how strongly the tint mixes over the refraction
uniform float uGridAmt;   // strength of the 56px layout grid in the scene

varying vec2  vUv;
varying float vRipple;
${GLSL_SIMPLEX}

/* ---- Superellipse (squircle) signed distance ------------------------------
   Classic rounded-box SDF is  length(max(q,0)) + min(max(q.x,q.y),0) - r
   with q = abs(p) - halfSize + r.  Swapping the Euclidean length for a
   p-norm  (|x|^n + |y|^n)^(1/n), n≈3.4  turns the circular corner arc into
   a superellipse arc — the continuous-curvature "squircle" of iOS icons.
   Returned distance is ~px accurate near the edge, which is all the bevel
   math needs. */
float sdSquircle(vec2 p, vec2 half_, float r, float n){
  vec2 q  = abs(p) - half_ + vec2(r);
  vec2 qc = max(q, vec2(0.0));
  float outside = pow(pow(qc.x, n) + pow(qc.y, n), 1.0 / n);
  float inside  = min(max(q.x, q.y), 0.0);
  return outside + inside - r;
}

/* ---- Procedural scene the glass refracts ----------------------------------
   Mirrors what actually sits behind the pane in the DOM: a deep navy→indigo
   gradient, three drifting radial blobs (deep purple, indigo, cyan — high
   chroma against the dark base so the lens distortion visibly POPS), and the
   site's 56px hero grid. uv is in CSS px, origin at pane centre. */
vec3 scene(vec2 uv, float t){
  vec2 nuv = uv / max(uSize.x, uSize.y);          // normalized, aspect-true
  // Diagonal base gradient (matches .ai-band linear-gradient(160deg, ...))
  vec3 col = mix(uColA, uColB, clamp(nuv.x * 0.7 - nuv.y * 0.9 + 0.5, 0.0, 1.0));

  // Three blobs on slow Lissajous orbits. Radial falloff ~ smooth gaussian.
  vec2 c1 = vec2(cos(t*0.23),        sin(t*0.31)) * uSize * 0.33;
  vec2 c2 = vec2(cos(t*0.17 + 2.1),  sin(t*0.26 + 1.3)) * uSize * 0.38;
  vec2 c3 = vec2(cos(t*0.29 + 4.2),  sin(t*0.19 + 3.7)) * uSize * 0.36;
  float R = max(uSize.x, uSize.y) * 0.55;
  col += uBlob1 * exp(-pow(length(uv - c1) / R, 2.0) * 3.0);
  col += uBlob2 * exp(-pow(length(uv - c2) / R, 2.0) * 3.5);
  col += uBlob3 * exp(-pow(length(uv - c3) / R, 2.0) * 4.0);

  // 56px layout grid (matches .hero-grid-lines). Thin AA'd lines.
  vec2 g = abs(fract((uv + uSize * 0.5) / 56.0) - 0.5);
  float line = 1.0 - smoothstep(0.0, 0.06, min(g.x, g.y));
  col += vec3(0.36, 0.55, 0.94) * line * uGridAmt;
  return col;
}

void main(){
  float t  = uTime;
  vec2  px = (vUv - 0.5) * uSize;                 // CSS-px coords, centred
  vec2  half_ = uSize * 0.5 - vec2(uBleed);       // the pane rect inside the apron

  /* -- Fluid border: wobble the distance field itself ---------------------
     Adding low-frequency noise (0.8 cycles across the pane, slow drift) to
     the SDF makes the *boundary* undulate — the silhouette breathes like a
     droplet held in surface tension. Amplitude 3px: perceptible, not wobbly. */
  float r = min(half_.x, half_.y) * 0.42;         // generous squircle radius
  float d = sdSquircle(px, half_, r, 3.4);
  d += snoise(vec3(px * 0.008, t * 0.28)) * 3.0;

  /* -- Thick-slab height profile ------------------------------------------
     Model the pane as glass with a bevelled edge of width bw. Let
     x ∈ [0,1] be the normalized inset from the rim; the surface height is a
     quarter-circle arc  h = sqrt(1-(1-x)²)  — flat in the middle, curling
     hard at the rim exactly like a slab of poured glass. Its analytic slope
     (1-x)/h  is the magnitude of the normal's tilt. */
  float bw = min(min(half_.x, half_.y) * 0.30, 46.0);
  float x  = clamp(-d / bw, 0.0, 1.0);
  float h  = sqrt(max(1.0 - (1.0 - x) * (1.0 - x), 1e-4));
  float slope = (1.0 - x) / h;                    // ∞ at rim → clamp below
  slope = min(slope, 6.0);

  /* -- Surface normal ------------------------------------------------------
     Rim direction = gradient of the SDF (screen-space derivatives, cheap and
     exact enough). Ripple tilt = derivatives of the vertex height field,
     scaled back to px space. The sum, renormalized with z up, is the normal
     of "rippling liquid inside a bevelled squircle". */
  vec2 gradD = vec2(dFdx(d), dFdy(d));
  vec2 rimDir = gradD / max(length(gradD), 1e-5);
  vec2 rippleGrad = vec2(dFdx(vRipple), dFdy(vRipple)) * 90.0;
  vec3 N = normalize(vec3(rimDir * slope * 0.55 + rippleGrad * 0.12, 1.0));

  /* -- Refraction ----------------------------------------------------------
     Snell-style offset: a thick slab shifts the ray by ~thickness · tan(θ).
     We approximate with  offset = -N.xy · (η·bw·h)  so displacement grows
     with both surface tilt and local glass thickness. The cursor adds a
     small global warp so the interior visibly tracks the hand. */
  float eta = 0.55;                                // "refractive strength"
  vec2 refr = -N.xy * (eta * bw * (0.35 + 0.65 * h));
  vec2 warp = uMouse * uSize * 0.018;              // cursor-follow warp
  vec2 suv  = px + refr + warp + vec2(0.0, uScroll);

  /* -- Chromatic aberration ------------------------------------------------
     Dispersion: refraction index varies per wavelength, so sample the scene
     three times with the offset scaled 0.88 / 1.00 / 1.14 for R/G/B. The
     split is proportional to edge (strong at the bevel, ~0 in the middle)
     which is exactly how a real lens smears rainbows at its rim. */
  float edge = slope / 6.0;                        // 0 centre → 1 at rim
  float ca   = 1.0 + edge * 1.6;
  vec3 refracted = vec3(
    scene(px + refr * (0.88 / ca) * ca + warp, t).r,
    scene(suv, t).g,
    scene(px + refr * 1.14 + warp, t).b
  );

  /* -- Glass body ----------------------------------------------------------
     Mix the refracted scene toward the theme tint (frosting/absorption) and
     darken slightly with thickness for that "deep slab" read. */
  vec3 col = mix(refracted, uTint, uTintAmt);
  col *= 1.0 - 0.10 * h;

  /* -- Lighting ------------------------------------------------------------
     One virtual key light orbits slowly and is pulled toward the cursor
     (uMouse is already lerped on the CPU, so this glides). */
  vec3 L = normalize(vec3(
    uMouse.x * 1.1 + 0.45 * cos(t * 0.30),
   -uMouse.y * 1.1 + 0.45 * sin(t * 0.23),
    0.85));
  vec3 V = vec3(0.0, 0.0, 1.0);

  // Fresnel (Schlick): F = F0 + (1-F0)(1-N·V)^5 — grazing angles flare.
  float NdV = clamp(dot(N, V), 0.0, 1.0);
  float fres = 0.04 + 0.96 * pow(1.0 - NdV, 5.0);

  // Polished-metal rim: Fresnel gated to the bevel, warmed by the key light.
  float rim = fres * smoothstep(0.12, 0.9, edge);
  vec3 rimCol = mix(vec3(0.72, 0.82, 1.0), vec3(1.0, 0.86, 0.55),
                    0.5 + 0.5 * dot(normalize(L.xy + 1e-4), -rimDir));
  col += rimCol * rim * (0.55 + 0.45 * max(dot(N, L), 0.0)) * 1.35;

  // Blinn-Phong specular streak — the "wet highlight" that chases the mouse.
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 90.0);
  col += vec3(1.0) * spec * (0.35 + 0.65 * edge);

  // Faint moving caustic sheen across the interior (light through liquid).
  float sheen = snoise(vec3(px * 0.006 + uMouse * 0.4, t * 0.20));
  col += uBlob3 * max(sheen, 0.0) * 0.05 * (1.0 - edge);

  /* -- Coverage / alpha ----------------------------------------------------
     fwidth-based AA on the SDF for a crisp silhouette, plus a soft exterior
     halo (exp falloff) so the pane appears to glow onto the page. */
  float aa    = max(fwidth(d), 0.75);
  float body  = 1.0 - smoothstep(-aa, aa, d);
  float halo  = exp(-max(d, 0.0) / (uBleed * 0.55)) * 0.10;
  float alpha = clamp(body * 0.96 + halo, 0.0, 1.0);

  // Premultiply-style output keeps the halo additive and the body clean.
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

/* ==========================================================================
   Themes — tuned per host section. Blob palettes are deliberately deep
   purple / indigo / cyan (per the contrast spec) so the lens distortion and
   chromatic split pop hard against them.
   ========================================================================== */
const THEMES = {
  // #ai — dark navy band behind the Legacy AI chat shell
  dark: {
    colA:  [0.043, 0.082, 0.170],   // — matches --navy #0E1F3E region
    colB:  [0.075, 0.060, 0.220],   // lifted indigo
    blob1: [0.230, 0.080, 0.420],   // deep purple
    blob2: [0.130, 0.180, 0.560],   // indigo
    blob3: [0.050, 0.450, 0.520],   // cyan
    tint:  [0.045, 0.085, 0.180],
    tintAmt: 0.34,
    gridAmt: 0.35,
  },
  // #blueprint — light cloud band around the Blueprint card
  light: {
    colA:  [0.890, 0.910, 0.960],   // — matches --cloud #F4F6FA region
    colB:  [0.820, 0.850, 0.950],
    blob1: [0.470, 0.300, 0.750],   // soft deep purple
    blob2: [0.330, 0.420, 0.880],   // indigo
    blob3: [0.240, 0.720, 0.800],   // cyan
    tint:  [0.930, 0.945, 0.980],
    tintAmt: 0.30,
    gridAmt: 0.16,
  },
};

const BLEED = 40;         // px apron around the pane for halo/rim overdraw
const DPR_CAP = 2;        // GUARDRAIL: hard pixel-ratio clamp for mobile GPUs

/* ==========================================================================
   LiquidGlass — one instance per container element.
   ========================================================================== */
class LiquidGlass {
  constructor(el) {
    this.el = el;
    this.theme = THEMES[el.dataset.lgTheme] || THEMES.dark;
    this.raf = 0;
    this.visible = false;
    this.dead = false;
    // Cursor state: target = raw pointer, cur = displayed. cur eases toward
    // target every frame (exponential lerp) for the fluid tracking feel.
    this.mouseTarget = { x: 0, y: 0 };
    this.mouseCur = { x: 0, y: 0 };
    this.clock = new THREE.Clock();

    try {
      this.initGL();          // GUARDRAIL: any throw → CSS fallback
      this.bindEvents();
      el.classList.add('lg-webgl-on');   // upgrade: CSS blur hands off to GL
    } catch (err) {
      console.warn('[liquid-glass] WebGL init failed — CSS fallback active.', err);
      this.fail();
    }
  }

  initGL() {
    const renderer = new THREE.WebGLRenderer({
      alpha: true,                     // transparent canvas — page shows through
      antialias: true,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: true,  // software GL? refuse → CSS fallback
    });
    // GUARDRAIL: clamp device pixel ratio so 3x phones don't melt.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
    renderer.setClearColor(0x000000, 0);

    const canvas = renderer.domElement;
    canvas.className = 'lg-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    // GUARDRAIL: layering contract enforced inline — the canvas can never
    // intercept a click even if the stylesheet fails to load.
    canvas.style.cssText = `position:absolute;inset:${-BLEED}px;width:calc(100% + ${BLEED * 2}px);height:calc(100% + ${BLEED * 2}px);z-index:10;pointer-events:none;display:block;`;
    this.el.prepend(canvas);

    // GUARDRAIL: context-loss lifecycle → permanent, graceful CSS fallback.
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[liquid-glass] WebGL context lost — failing over to CSS.');
      this.fail();
    }, false);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
    camera.position.z = 1;

    const t = this.theme;
    this.uniforms = {
      uTime:   { value: 0 },
      uSize:   { value: new THREE.Vector2(1, 1) },
      uBleed:  { value: BLEED },
      uMouse:  { value: new THREE.Vector2(0, 0) },
      uScroll: { value: 0 },
      uColA:   { value: new THREE.Vector3(...t.colA) },
      uColB:   { value: new THREE.Vector3(...t.colB) },
      uBlob1:  { value: new THREE.Vector3(...t.blob1) },
      uBlob2:  { value: new THREE.Vector3(...t.blob2) },
      uBlob3:  { value: new THREE.Vector3(...t.blob3) },
      uTint:   { value: new THREE.Vector3(...t.tint) },
      uTintAmt:{ value: t.tintAmt },
      uGridAmt:{ value: t.gridAmt },
    };

    // 96×96 segments: enough vertices for the noise ripple to be smooth,
    // still only ~18k triangles — trivial for any GPU that passed the gate.
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1, 96, 96),
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: this.uniforms,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      })
    );
    scene.add(mesh);

    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.resize();
  }

  bindEvents() {
    // ResizeObserver keeps the drawing buffer matched to layout size.
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.el);

    // The canvas is pointer-events:none by contract, so cursor tracking
    // listens on the window and projects into container space.
    this.onMove = (e) => {
      const r = this.el.getBoundingClientRect();
      // [-1,1] with (0,0) at pane centre; unclamped so the light keeps
      // sliding away naturally as the cursor leaves the pane.
      this.mouseTarget.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.mouseTarget.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    window.addEventListener('pointermove', this.onMove, { passive: true });

    // GUARDRAIL: render only while on screen…
    this.io = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) this.start(); else this.stop();
    }, { rootMargin: '80px' });
    this.io.observe(this.el);

    // …and only while the tab is visible.
    this.onVis = () => {
      if (document.hidden) this.stop();
      else if (this.visible) this.start();
    };
    document.addEventListener('visibilitychange', this.onVis);
  }

  resize() {
    if (this.dead) return;
    const w = this.el.clientWidth + BLEED * 2;
    const h = this.el.clientHeight + BLEED * 2;
    if (w <= 0 || h <= 0) return;
    this.renderer.setSize(w, h, false);   // false: CSS controls display size
    this.uniforms.uSize.value.set(w, h);
  }

  start() {
    if (this.raf || this.dead) return;
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      const u = this.uniforms;
      u.uTime.value = this.clock.getElapsedTime();

      // Exponential lerp: cur += (target-cur)·k. Framerate-stable smoothing;
      // k=0.075 ≈ a soft ~150ms settle at 60fps.
      this.mouseCur.x += (this.mouseTarget.x - this.mouseCur.x) * 0.075;
      this.mouseCur.y += (this.mouseTarget.y - this.mouseCur.y) * 0.075;
      u.uMouse.value.set(this.mouseCur.x, this.mouseCur.y);

      // Gentle scroll parallax so the refracted scene shifts with the page.
      const r = this.el.getBoundingClientRect();
      u.uScroll.value = (r.top - window.innerHeight * 0.5) * 0.06;

      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /* GUARDRAIL: single failure path. Removes the canvas, releases the GL
     context, and applies .webgl-failed-fallback so the pure-CSS
     backdrop-filter glass takes over. The layout can never break. */
  fail() {
    this.dead = true;
    this.stop();
    if (this.ro) this.ro.disconnect();
    if (this.io) this.io.disconnect();
    if (this.onMove) window.removeEventListener('pointermove', this.onMove);
    if (this.onVis) document.removeEventListener('visibilitychange', this.onVis);
    if (this.renderer) {
      const canvas = this.renderer.domElement;
      try { this.renderer.dispose(); } catch (_) { /* already gone */ }
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
    this.el.classList.remove('lg-webgl-on');
    this.el.classList.add('webgl-failed-fallback');
  }
}

/* ==========================================================================
   Boot — capability gate, then one instance per [data-liquid-glass].
   ========================================================================== */
(function boot() {
  // GUARDRAIL: low-end / accessibility gate. These devices keep the CSS
  // glass (already active in the stylesheet) and never pay for WebGL.
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowMemory = navigator.deviceMemory !== undefined && navigator.deviceMemory <= 2;
  const lowCores = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 2;
  if (reducedMotion || lowMemory || lowCores) return;

  // Cheap WebGL probe before pulling in renderers.
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2') || probe.getContext('webgl');
  if (!gl) return;
  gl.getExtension('WEBGL_lose_context')?.loseContext();  // release the probe

  const init = () => {
    document.querySelectorAll('[data-liquid-glass]').forEach((el) => new LiquidGlass(el));
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

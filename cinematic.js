/* ============================================================================
   THE LEGACY VAULT — cinematic scroll-driven WebGL cover
   ----------------------------------------------------------------------------
   A five-chapter film that plays as you scroll the top of the page. Everything
   is generated in-shader or in-geometry — there are no textures, no HDRIs and
   no third-party CDNs to download.

     • Environment   A procedural equirectangular studio (warm gold key, cool
                     rim, softbox strips, horizon bounce) baked through
                     PMREMGenerator. This is what makes the metal read as real
                     polished gold instead of a flat yellow plastic.
     • Sky           Back-side dome: layered aurora ribbons over a deep navy →
                     violet gradient, a starfield, and a bloomed sun orb.
     • Ridges        Three parallax mountain silhouettes cut from noise.
     • Ground        Mirror plane — a fake reflection of the sky and the
                     artifact's glow, rippled and fogged into the horizon.
     • The Artifact  "The Legacy Monolith": a bevelled gold slab with a chrome
                     aperture ring and a living emissive core. Click and hold
                     (or drag) to rotate it; it keeps spinning with inertia.
     • Swarm         256 instanced gold cubes that scatter and re-assemble into
                     a lattice column as the chapters advance.
     • Orbits        Chrome and gold spheres on slow Lissajous orbits.
     • Dust          Additive motes drifting through the key light.
     • Post          Hand-rolled bloom (bright pass → separable blur ping-pong)
                     composited with ACES tone mapping, chromatic aberration at
                     the edges, vignette and film grain.

   SAFETY SYSTEMS (identical contract to liquid-glass.js):
     1. Progressive enhancement — the cover ships with a complete CSS-only
        cinematic underneath. WebGL only *upgrades* it (adds .vault-gl-on).
     2. Capability gate — no WebGL, <=2GB deviceMemory, <=2 cores, coarse
        low-end pointer or prefers-reduced-motion keeps the CSS cover.
     3. try/catch around init + webglcontextlost → fail() restores the CSS
        cover permanently. The page can never break.
     4. Pixel-ratio clamp (1.75 desktop / 1.5 mobile) and a half-resolution
        bloom chain.
     5. The loop stops when the cover scrolls off screen or the tab is hidden.
     6. The canvas is pointer-events:none except while a drag is active, and
        it sits behind every piece of UI (z-index contract enforced inline).
   ========================================================================== */

import * as THREE from './vendor/three.module.min.js';

/* ---------------------------------------------------------------------------
   Palette — the brand, pushed to cinematic saturation.
   -------------------------------------------------------------------------- */
const C = {
  navyDeep: new THREE.Color('#050b1a'),
  navy:     new THREE.Color('#0E1F3E'),
  indigo:   new THREE.Color('#2A2C77'),
  violet:   new THREE.Color('#5B2E8C'),
  cyan:     new THREE.Color('#2FB6C9'),
  blue:     new THREE.Color('#5B8DEF'),
  brass:    new THREE.Color('#C9973B'),
  brassLit: new THREE.Color('#E2B45C'),
  champagne:new THREE.Color('#F3D9A0'),
};

/* ---------------------------------------------------------------------------
   Shared GLSL — 3D simplex noise + fbm (Ashima Arts / Stefan Gustavson, MIT).
   -------------------------------------------------------------------------- */
const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C2=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C2.yyy)); vec3 x0=v-i+dot(i,C2.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C2.xxx; vec3 x2=x0-i2+C2.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))
        +i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){
  float a=0.5,s=0.0;
  for(int i=0;i<5;i++){ s+=a*snoise(p); p*=2.02; a*=0.5; }
  return s;
}
`;

/* ===========================================================================
   1. ENVIRONMENT — a procedural photo studio, baked to a PMREM cube.

   Real jewellery renders get their character from what the metal *reflects*:
   long soft strip lights, a warm key, a cool fill and a dark floor. We paint
   exactly that into a 256×128 equirectangular float texture and let
   PMREMGenerator pre-filter it into the roughness mip chain.
   ========================================================================== */
function buildEnvironment(renderer) {
  const W = 256, H = 128;
  const data = new Float32Array(W * H * 4);

  const put = (i, r, g, b) => { data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 1; };

  for (let y = 0; y < H; y++) {
    // v: 0 = zenith, 1 = nadir
    const v = y / (H - 1);
    const theta = v * Math.PI;          // polar angle
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      const phi = u * Math.PI * 2;
      const i = (y * W + x) * 4;

      // Base: cool indigo dome above, near-black floor below.
      const up = Math.cos(theta) * 0.5 + 0.5;
      let r = 0.030 + up * 0.075;
      let g = 0.045 + up * 0.100;
      let b = 0.090 + up * 0.190;

      // Horizon bounce — a wide warm band just above the floor line.
      const horizon = Math.exp(-Math.pow((v - 0.56) / 0.10, 2));
      r += horizon * 0.16; g += horizon * 0.11; b += horizon * 0.07;

      // KEY: a tall warm softbox at phi ≈ 0.9 rad, upper third.
      const dKey = Math.hypot(angDelta(phi, 0.95) * 0.9, (v - 0.30) * 2.6);
      const key = Math.exp(-dKey * dKey * 5.0);
      r += key * 2.55; g += key * 1.95; b += key * 1.05;

      // RIM: a cool strip opposite, slightly lower.
      const dRim = Math.hypot(angDelta(phi, 3.9) * 0.7, (v - 0.42) * 2.2);
      const rim = Math.exp(-dRim * dRim * 4.2);
      r += rim * 0.45; g += rim * 0.85; b += rim * 1.70;

      // FILL: a broad, dim violet wash behind the camera.
      const dFill = Math.hypot(angDelta(phi, 5.5) * 0.5, (v - 0.48) * 1.4);
      const fill = Math.exp(-dFill * dFill * 2.4);
      r += fill * 0.26; g += fill * 0.15; b += fill * 0.42;

      // Three horizontal strip lights — the long streaks that slide across
      // polished metal as it turns. This is the Cartier signature.
      for (const [sv, sw, si] of [[0.20, 0.016, 1.45], [0.36, 0.011, 0.95], [0.50, 0.008, 0.62]]) {
        const strip = Math.exp(-Math.pow((v - sv) / sw, 2)) * (0.55 + 0.45 * Math.cos(phi * 2.0));
        r += strip * si * 1.00; g += strip * si * 0.94; b += strip * si * 0.86;
      }

      put(i, r, g, b);
    }
  }

  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const rt = pmrem.fromEquirectangular(tex);
  tex.dispose();
  pmrem.dispose();
  return rt.texture;
}
// shortest signed angular distance between two angles
function angDelta(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/* ===========================================================================
   2. SKY — aurora dome. Deep navy base, three drifting aurora sheets, stars,
   and a soft sun orb that sits behind the artifact.
   ========================================================================== */
function buildSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTime: { value: 0 },
      uProg: { value: 0 },
      uDeep: { value: new THREE.Color('#04091a') },
      uMid:  { value: new THREE.Color('#141a4d') },
      uVio:  { value: new THREE.Color('#4C2A86') },
      uCyan: { value: new THREE.Color('#1F8FA8') },
      uGold: { value: new THREE.Color('#E2B45C') },
    },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main(){
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }`,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform float uTime, uProg;
      uniform vec3 uDeep,uMid,uVio,uCyan,uGold;
      varying vec3 vDir;
      ${NOISE}

      // hash for the starfield
      float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }

      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;                       // -1 down .. 1 up
        float t = uTime;

        /* --- base gradient: deep at the zenith, lifting to violet at the
               horizon, then falling into near-black below it --- */
        vec3 col = mix(uMid, uDeep, smoothstep(0.0,0.85,h));
        col = mix(col, uVio*0.75, smoothstep(0.42,-0.04,h)*0.85);
        col *= smoothstep(-0.55,-0.02,h)*0.85 + 0.15;

        /* --- stars: a sparse grid, twinkling, fading out near the horizon --- */
        vec2 sp = vec2(atan(d.z,d.x)*2.4, h*3.4);
        vec2 cell = floor(sp*46.0);
        float rnd = hash21(cell);
        if(rnd > 0.982){
          vec2 f = fract(sp*46.0)-0.5;
          float star = exp(-dot(f,f)*90.0);
          float tw = 0.55+0.45*sin(t*(1.2+rnd*4.0)+rnd*30.0);
          col += vec3(0.75,0.85,1.0)*star*tw*smoothstep(0.0,0.35,h)*0.85;
        }

        /* --- aurora: three stacked sheets of fbm, each a thin band in height
               that ripples horizontally. Additive, so they bloom. --- */
        float az = atan(d.z, d.x);
        for(int i=0;i<3;i++){
          float fi = float(i);
          float speed = 0.06 + fi*0.035;
          float band  = 0.16 + fi*0.13;                    // height of the sheet
          float n = fbm(vec3(az*1.6 + fi*10.0, h*2.2, t*speed));
          float sheet = exp(-pow((h - band - n*0.13)/(0.085+fi*0.03), 2.0));
          vec3 ac = mix(uCyan, uVio, fi*0.5 + 0.25*sin(t*0.2+fi));
          col += ac * sheet * (0.15 + 0.11*sin(t*0.35+fi*2.1)) * (0.55+0.45*n);
        }

        /* --- the sun: a soft gold orb low behind the artifact (Cartier's
               blown-out disc) with a wide atmospheric halo --- */
        vec3 sunDir = normalize(vec3(0.18, 0.07 + uProg*0.05, -1.0));
        float sd = max(dot(d, sunDir), 0.0);
        col += uGold * pow(sd, 900.0) * 1.45;              // core
        col += uGold * pow(sd, 22.0)  * 0.17;              // inner halo
        col += mix(uGold,uVio,0.4) * pow(sd, 4.0) * 0.055; // atmosphere

        /* --- a faint volumetric haze band right at the horizon --- */
        col += mix(uVio,uCyan,0.35) * exp(-pow(h/0.055,2.0)) * 0.12;

        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(120, 48, 32), mat);
  mesh.frustumCulled = false;
  return { mesh, mat };
}

/* ===========================================================================
   3. RIDGES — three parallax mountain silhouettes. Each is a closed shape
   built from a 1D noise ridge line, filled with a vertical gradient so the
   base melts into the ground haze.
   ========================================================================== */
function ridgeLine(seed, points, width, height, base) {
  const pts = [];
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const x = (t - 0.5) * width;
    // three octaves of cheap value noise, sharpened into peaks
    let n = 0, amp = 1, freq = 1.6;
    for (let o = 0; o < 4; o++) {
      n += amp * Math.sin(t * freq * 12.7 + seed * 7.3 + o * 2.1) *
                 Math.cos(t * freq * 5.1 - seed * 3.7 + o * 1.3);
      amp *= 0.52; freq *= 2.03;
    }
    const y = base + Math.abs(n) * height * 0.55 + height * 0.12;
    pts.push(new THREE.Vector2(x, y));
  }
  return pts;
}

function buildRidge(seed, width, height, base, color, opacity) {
  const pts = ridgeLine(seed, 120, width, height, base);
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, base - height * 2.2);
  pts.forEach(p => shape.lineTo(p.x, p.y));
  shape.lineTo(width / 2, base - height * 2.2);
  shape.closePath();

  const geo = new THREE.ShapeGeometry(shape, 1);
  // vertical gradient in vertex colours: darker at the peaks, hazier at the base
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const k = THREE.MathUtils.clamp((y - base + height * 0.4) / (height * 1.4), 0, 1);
    const c = color.clone().lerp(C.violet, (1 - k) * 0.55);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity, depthWrite: false, fog: false,
  }));
}

/* ===========================================================================
   4. GROUND — the mirror plain. Not a real reflection (too expensive for a
   hero on a phone); a shader that mirrors the sky's palette, streaks it
   vertically, ripples it with noise and burns a bright column of light
   directly beneath the artifact. Reads exactly like still water at dusk.
   ========================================================================== */
function buildGround() {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: {
      uTime: { value: 0 },
      uGlow: { value: 0.6 },
      uVio:  { value: new THREE.Color('#3E2470') },
      uCyan: { value: new THREE.Color('#1E7E96') },
      uGold: { value: new THREE.Color('#E2B45C') },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv; varying vec3 vPos;
      void main(){
        vUv = uv; vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }`,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform float uTime,uGlow;
      uniform vec3 uVio,uCyan,uGold;
      varying vec2 vUv; varying vec3 vPos;
      ${NOISE}
      void main(){
        // distance from the horizon line (uv.y = 1 is far)
        float far = smoothstep(0.0,1.0,vUv.y);
        float t = uTime;

        // rippled mirror streaks
        float rip = fbm(vec3(vUv.x*7.0, vUv.y*2.2 - t*0.05, t*0.09));
        float streak = 0.5 + 0.5*sin(vUv.x*42.0 + rip*5.0);
        streak = pow(streak, 3.0);

        vec3 col = mix(uVio*0.30, uCyan*0.22, vUv.x);
        col += mix(uVio,uCyan,0.5) * streak * 0.15 * far;

        // the column of light beneath the artifact
        float cx = abs(vUv.x - 0.5);
        float col1 = exp(-pow(cx/0.045,2.0));
        float col2 = exp(-pow(cx/0.16,2.0));
        col += uGold * (col1*0.62 + col2*0.16) * uGlow * (0.35 + 0.65*far) * (0.85+0.15*rip);

        // fade to nothing at the near edge and at the far horizon seam
        float a = smoothstep(0.0,0.30,vUv.y) * (1.0 - smoothstep(0.72,1.0,vUv.y));
        a *= 0.92;
        gl_FragColor = vec4(col, a);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(160, 90, 1, 1), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, -2.35, -36);
  return { mesh, mat };
}

/* ===========================================================================
   5. THE ARTIFACT — a bevelled gold monolith with a chrome aperture ring and
   a living core. Everything is built from primitives so it costs nothing to
   ship and looks hand-machined under the studio environment.
   ========================================================================== */
function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);      s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);      s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);          s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function buildMonolith(env) {
  const group = new THREE.Group();

  const gold = new THREE.MeshPhysicalMaterial({
    color: 0xC9973B, metalness: 1.0, roughness: 0.14,
    clearcoat: 0.65, clearcoatRoughness: 0.14,
    envMap: env, envMapIntensity: 1.28,
  });
  const goldDark = new THREE.MeshPhysicalMaterial({
    color: 0x6E4F1C, metalness: 1.0, roughness: 0.42,
    envMap: env, envMapIntensity: 1.05,
  });
  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xE8EEF8, metalness: 1.0, roughness: 0.055,
    envMap: env, envMapIntensity: 1.25,
  });

  /* --- the slab: rounded rect, extruded with a generous bevel so the rim
         catches the strip lights as it turns --- */
  const slabGeo = new THREE.ExtrudeGeometry(roundedRectShape(1.72, 2.86, 0.34), {
    depth: 0.20, bevelEnabled: true, bevelThickness: 0.055,
    bevelSize: 0.055, bevelSegments: 5, curveSegments: 24,
  });
  slabGeo.center();
  const slab = new THREE.Mesh(slabGeo, gold);
  group.add(slab);

  /* --- Face layout. The three elements each get their own band so none of
         them fights the others: aperture up top, heron inlay in the middle,
         engraved rule lines at the foot. --- */
  const APERTURE_Y = 0.72, HERON_Y = -0.52;

  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.74 - i * 0.10, 0.014, 0.02), goldDark);
    bar.position.set(0, -1.16 - i * 0.085, 0.152);
    group.add(bar);
  }

  /* --- the aperture: a chrome ring inset into the face --- */
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.034, 20, 96), chrome);
  ring.position.set(0, APERTURE_Y, 0.155);
  group.add(ring);

  const ringOuter = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.012, 14, 96), gold);
  ringOuter.position.set(0, APERTURE_Y, 0.150);
  group.add(ringOuter);

  /* --- the core: an additive disc of swirling light inside the aperture --- */
  const coreMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uInt: { value: 0.55 },
      uA: { value: new THREE.Color('#E2B45C') },
      uB: { value: new THREE.Color('#5B8DEF') },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform float uTime,uInt; uniform vec3 uA,uB; varying vec2 vUv;
      ${NOISE}
      void main(){
        vec2 p = vUv*2.0-1.0;
        float r = length(p);
        float ang = atan(p.y,p.x);
        float n = fbm(vec3(cos(ang)*r*2.6, sin(ang)*r*2.6, uTime*0.35));

        // Four layers, so the aperture reads as something THINKING rather than
        // a glowing disc: a white-hot centre, a cool plasma body, a gold iris
        // that turns, and pulses travelling outward from the middle.
        float hot   = exp(-r*r*9.0);
        float body  = exp(-r*r*2.4) * (0.55 + 0.45*n);
        float iris  = exp(-pow((r-0.68)/0.085,2.0)) * (0.45 + 0.55*sin(ang*7.0 + uTime*1.15 + n*3.0));
        float pulse = exp(-pow((fract(r*2.4 - uTime*0.16) - 0.5)/0.16, 2.0))
                      * 0.30 * smoothstep(0.92, 0.15, r);

        vec3 col = uB * body * 1.15
                 + vec3(1.0,0.95,0.86) * hot * 1.35
                 + uA * (iris*0.85 + pulse);
        float a = clamp(body*1.5 + hot*1.6 + iris*0.8 + pulse, 0.0, 1.0)
                  * uInt * smoothstep(1.02,0.70,r);
        gl_FragColor = vec4(col*uInt, a);
      }`,
  });
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.55, 64), coreMat);
  core.position.set(0, APERTURE_Y, 0.168);
  group.add(core);

  /* --- the heron mark, inlaid. Built from the ACTUAL brand path (the same
         curve as the favicon and the nav logo, in its 100×100 viewBox) rather
         than an approximation, so the mark on the artifact is the mark on the
         letterhead. SVG y runs down, three.js y runs up — p() flips it and
         recentres on the box. --- */
  const heron = new THREE.Group();
  const heronInner = new THREE.Group();
  const inlay = new THREE.MeshPhysicalMaterial({
    color: 0xF3D9A0, metalness: 1.0, roughness: 0.09,
    envMap: env, envMapIntensity: 1.40,
  });
  const p = (x, y) => new THREE.Vector3((x - 50) / 50, (50 - y) / 50, 0);
  // Each entry is one subpath of:
  //   M62 74 C70 58 66 44 54 41 C40 38 32 46 33 56
  //   M54 41 C46 38 43 30 46 22 C48 17 54 15 57 19
  //   M57 19 L78 26   M55 61 L54 80   M46 60 L47 80
  const SUBPATHS = [
    { start: [62, 74], segs: [['C', 70, 58, 66, 44, 54, 41], ['C', 40, 38, 32, 46, 33, 56]] },
    { start: [54, 41], segs: [['C', 46, 38, 43, 30, 46, 22], ['C', 48, 17, 54, 15, 57, 19]] },
    { start: [57, 19], segs: [['L', 78, 26]] },
    { start: [55, 61], segs: [['L', 54, 80]] },
    { start: [46, 60], segs: [['L', 47, 80]] },
  ];
  SUBPATHS.forEach(({ start, segs }) => {
    const path = new THREE.CurvePath();
    let cur = p(...start);
    segs.forEach(seg => {
      if (seg[0] === 'C') {
        const [, c1x, c1y, c2x, c2y, ex, ey] = seg;
        const end = p(ex, ey);
        path.add(new THREE.CubicBezierCurve3(cur, p(c1x, c1y), p(c2x, c2y), end));
        cur = end;
      } else {
        const end = p(seg[1], seg[2]);
        path.add(new THREE.LineCurve3(cur, end));
        cur = end;
      }
    });
    heronInner.add(new THREE.Mesh(new THREE.TubeGeometry(path, 64, 0.030, 8, false), inlay));
  });
  // The mark's ink sits around y ≈ -0.05 in that box; nudge it onto centre.
  heronInner.position.y = 0.05;
  heron.add(heronInner);
  // Proud of the face so it catches the key light as inlay, not buried in it.
  heron.position.set(0, HERON_Y, 0.176);
  heron.scale.setScalar(0.62);
  group.add(heron);

  /* --- halo: a wide emissive ring behind the slab that reads as the
         artifact's aura when the camera pulls back --- */
  const haloMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uInt: { value: 0.5 }, uCol: { value: new THREE.Color('#E2B45C') } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform float uTime,uInt; uniform vec3 uCol; varying vec2 vUv;
      ${NOISE}
      void main(){
        vec2 p=vUv*2.0-1.0; float r=length(p); float a=atan(p.y,p.x);
        float n=fbm(vec3(cos(a)*1.6,sin(a)*1.6,uTime*0.2));
        float band=exp(-pow((r-0.80+n*0.03)/0.055,2.0));
        float glow=exp(-pow(r/0.95,4.0))*0.16;
        float al=(band*0.85+glow)*uInt*(0.75+0.25*sin(uTime*0.7+a*3.0));
        gl_FragColor=vec4(uCol*(band*0.85+glow*1.05)*uInt, clamp(al,0.0,1.0));
      }`,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), haloMat);
  halo.position.z = -0.55;
  group.add(halo);

  /* --- gyro rings: two thin chrome bands orbiting on different axes --- */
  const gyro = new THREE.Group();
  // Near-horizontal (π/2 lays a torus flat in XZ): they orbit the artifact
  // like ring systems instead of drawing a wire across its face.
  const g1 = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.009, 10, 128), chrome);
  const g2 = new THREE.Mesh(new THREE.TorusGeometry(1.78, 0.006, 10, 128), gold);
  g1.rotation.set(1.36, 0, 0.10);
  g2.rotation.set(1.62, 0, -0.14);
  gyro.add(g1, g2);
  group.add(gyro);

  return { group, coreMat, haloMat, gyro, slab, ring, ringOuter, heron,
           mats: [gold, goldDark, chrome, inlay] };
}

/* ===========================================================================
   6. SWARM — 256 gold cubes. They live between two states: SCATTERED (a wide
   cloud) and ASSEMBLED (a lattice column, the Cartier stack). A single
   uniform-ish `t` lerps them, per-instance phase-offset so the column builds
   from the bottom up.
   ========================================================================== */
function buildSwarm(env, mobile) {
  /* The assembled state is the IUL story told in gold: a skyline of stacked
     cubes whose columns rise and fall with an index — and never drop below
     the floor row. Targets are built first, then the instance count is set to
     match, so the lattice always completes with no orphan cubes drifting. */
  const HEIGHTS = mobile ? [3, 5, 2, 6, 1, 7, 4]
                         : [3, 5, 2, 6, 1, 7, 4, 6, 2];
  const RANKS = mobile ? 1 : 2;
  const GAPX = 0.52, GAPY = 0.30, BASE_Y = -1.70;
  const spanX = (HEIGHTS.length - 1) * GAPX;
  const maxH = Math.max(...HEIGHTS);

  const targets = [];
  for (let rank = 0; rank < RANKS; rank++) {
    for (let c = 0; c < HEIGHTS.length; c++) {
      for (let h = 0; h < HEIGHTS[c]; h++) {
        targets.push({
          pos: new THREE.Vector3(c * GAPX - spanX / 2, BASE_Y + h * GAPY, -2.6 - rank * 1.15),
          row: h / maxH,          // drives the bottom-up build delay
        });
      }
    }
  }

  const count = targets.length;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xC9973B, metalness: 1.0, roughness: 0.20,
    envMap: env, envMapIntensity: 1.0,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;

  // Deterministic PRNG — the cloud is identical on every load, so the film
  // is reproducible and never randomly parks a cube in front of the lens.
  let seed = 20260726;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

  const data = targets.map((t, i) => ({
    to: t.pos,
    // Scattered: a wide cloud that lives BEHIND the artifact, never between it
    // and the camera — foreground cubes read as dirt on the lens.
    from: new THREE.Vector3((rnd() - 0.5) * 13, (rnd() - 0.5) * 7.5, -3.5 - rnd() * 10),
    size: 0.255 + rnd() * 0.025,
    phase: rnd(),
    spin: (rnd() - 0.5) * 1.6,
    row: t.row,
  }));

  return { mesh, data, mat, geo };
}

/* ===========================================================================
   7. ORBS — chrome and gold spheres on slow Lissajous orbits, the "planets"
   from the reference film.
   ========================================================================== */
function buildOrbs(env) {
  const group = new THREE.Group();
  // xOff biases every orbit into the right half of the frame, where the
  // artifact lives — the left third belongs to the headline.
  const specs = [
    // zOff keeps every orbit BEHIND the artifact's plane. An orb that swings
    // between the lens and the subject reads as an accident, not a planet.
    { r: 0.62, col: 0xE8EEF8, rough: 0.04, orbit: [3.4, 1.7, 2.2], xOff: 3.6, zOff: -6.5, sp: [0.09, 0.13, 0.07], ph: 0.0 },
    { r: 0.40, col: 0xC9973B, rough: 0.16, orbit: [4.2, 2.6, 2.6], xOff: 4.4, zOff: -8.5, sp: [0.06, 0.09, 0.05], ph: 2.1 },
    { r: 0.26, col: 0x5B8DEF, rough: 0.11, orbit: [2.8, 2.1, 2.0], xOff: 3.0, zOff: -5.5, sp: [0.14, 0.10, 0.11], ph: 4.4 },
    // the distant world: dielectric and rough, so it stays a silhouette
    // instead of turning into a chrome bauble
    { r: 1.30, col: 0x141838, rough: 0.88, metal: 0.05, envI: 0.30, orbit: [15.0, 4.2, 6.0], zOff: -14, sp: [0.04, 0.06, 0.035], ph: 1.2 },
  ];
  const orbs = specs.map(s => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(s.r, 48, 32),
      new THREE.MeshPhysicalMaterial({
        color: s.col,
        metalness: s.metal !== undefined ? s.metal : 1.0,
        roughness: s.rough,
        envMap: env, envMapIntensity: s.envI !== undefined ? s.envI : 1.1,
      })
    );
    group.add(m);
    return { mesh: m, spec: s };
  });
  return { group, orbs };
}

/* ===========================================================================
   8. DUST — additive motes catching the key light.
   ========================================================================== */
function buildDust(count) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 26;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 22 - 3;
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: 1 }, uCol: { value: new THREE.Color('#F3D9A0') } },
    vertexShader: /* glsl */`
      uniform float uTime,uPR; attribute float aSeed; varying float vA;
      void main(){
        vec3 p = position;
        p.y += sin(uTime*0.22 + aSeed*36.0)*0.9;
        p.x += cos(uTime*0.17 + aSeed*24.0)*0.7;
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        vA = (0.25 + 0.75*sin(uTime*0.8 + aSeed*40.0)*0.5+0.5) * smoothstep(-38.0,-3.0,mv.z);
        gl_PointSize = (1.4 + aSeed*3.4) * uPR * (14.0 / max(-mv.z,1.0));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      precision mediump float; uniform vec3 uCol; varying float vA;
      void main(){
        vec2 c = gl_PointCoord-0.5;
        float d = exp(-dot(c,c)*14.0);
        gl_FragColor = vec4(uCol*d*1.6, d*vA*0.55);
      }`,
  });
  return { points: new THREE.Points(geo, mat), mat };
}

/* ===========================================================================
   9. POST — hand-rolled bloom + grade.
   ========================================================================== */
const QUAD_VERT = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;

const BRIGHT_FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D tDiffuse; uniform float uThresh,uKnee; varying vec2 vUv;
  void main(){
    vec3 c = texture2D(tDiffuse,vUv).rgb;
    float l = dot(c, vec3(0.2126,0.7152,0.0722));
    // soft knee so highlights ramp in instead of popping
    float s = clamp((l - uThresh + uKnee) / (2.0*uKnee), 0.0, 1.0);
    float w = max(s*s*(l - uThresh + uKnee)/max(l,1e-4), max(l-uThresh,0.0)/max(l,1e-4));
    gl_FragColor = vec4(c*w, 1.0);
  }`;

const BLUR_FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D tDiffuse; uniform vec2 uDir; varying vec2 vUv;
  void main(){
    // 9-tap gaussian
    vec3 s = texture2D(tDiffuse,vUv).rgb * 0.2270270270;
    s += texture2D(tDiffuse, vUv + uDir*1.3846153846).rgb * 0.3162162162;
    s += texture2D(tDiffuse, vUv - uDir*1.3846153846).rgb * 0.3162162162;
    s += texture2D(tDiffuse, vUv + uDir*3.2307692308).rgb * 0.0702702703;
    s += texture2D(tDiffuse, vUv - uDir*3.2307692308).rgb * 0.0702702703;
    gl_FragColor = vec4(s,1.0);
  }`;

const COMPOSITE_FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D tScene, tBloom;
  uniform float uBloom, uTime, uGrain, uVig, uCA, uFade, uExposure;
  varying vec2 vUv;

  // ACES filmic approximation (Narkowicz) — the tone curve that keeps gold
  // highlights from clipping to white paper.
  vec3 aces(vec3 x){
    const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;
    return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0);
  }
  float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }

  void main(){
    vec2 uv = vUv;
    vec2 d  = uv - 0.5;
    float r2 = dot(d,d);

    // lens chromatic aberration — grows toward the edges, like real glass
    vec2 off = d * r2 * uCA;
    vec3 col;
    col.r = texture2D(tScene, uv - off).r;
    col.g = texture2D(tScene, uv).g;
    col.b = texture2D(tScene, uv + off).b;

    col += texture2D(tBloom, uv).rgb * uBloom;

    // Exposure is set on the SCENE, before the tone curve — the same order a
    // camera works in. Grading after aces() only crushes or milks the image.
    col = aces(col * uExposure);

    // vignette
    col *= 1.0 - smoothstep(0.25, 0.95, r2*1.9) * uVig;

    // film grain (animated, luminance-weighted so shadows stay clean)
    float g = hash(uv*vec2(1024.0,1024.0) + fract(uTime)*97.0) - 0.5;
    col += g * uGrain * (0.35 + 0.65*dot(col,vec3(0.333)));

    col *= uFade;

    // linear → sRGB
    col = pow(max(col,0.0), vec3(1.0/2.2));
    gl_FragColor = vec4(col,1.0);
  }`;

/* ===========================================================================
   10. THE FILM — chapters. Each is a camera keyframe plus scene state. The
   DOM copy for each chapter lives in the markup ([data-chapter]); this list
   only drives the 3D.
   ========================================================================== */
const TAU = Math.PI * 2;
const CHAPTERS = [
  // 0 — the reveal: face-on, artifact centred, core banked low
  { cam: [0.0, 0.25, 7.6],  look: [0, 0.10, 0], swarm: 0.02, core: 0.55, halo: 0.45, glow: 0.55, spin: 0.00,
    art: [0, 0] },
  // 1 — the turn: camera swings right as the slab rolls onto its edge and the
  //     key light rakes across the bevel
  { cam: [4.1, 0.75, 5.4],  look: [0, 0.15, 0], swarm: 0.35, core: 0.70, halo: 0.55, glow: 0.70, spin: 0.62,
    art: [0, 0] },
  // 2 — the build: the artifact LIFTS and steps aside so the gold skyline it
  //     has been carrying can own the floor of the frame. Staging the subject
  //     beats moving the camera when a second element has to be read.
  { cam: [0.35, 1.75, 7.4], look: [0.85, 0.20, -1.7], swarm: 1.00, core: 0.80, halo: 0.70, glow: 0.95, spin: 1.85,
    art: [1.85, 0.95] },
  // 3 — the core: the slab completes its turn and lands face-on as the camera
  //     pushes into the aperture. spin = TAU, not ~π, or we'd be staring at a
  //     0.3-unit-thick edge filling the frame.
  { cam: [0.0, 0.72, 3.30], look: [0, 0.72, 0], swarm: 0.30, core: 1.00, halo: 1.00, glow: 1.20, spin: TAU,
    art: [0, 0] },
  // 4 — the wide: pull back, rings open, the whole world reads
  { cam: [0.6, 1.35, 10.4], look: [0, 0.10, 0], swarm: 0.15, core: 0.72, halo: 0.62, glow: 0.75, spin: TAU + 0.30,
    art: [0, 0] },
];

const easeInOut = t => t * t * (3 - 2 * t);

/* ==========================================================================
   THE ENGINE
   ========================================================================== */
class Vault {
  constructor(stage) {
    this.stage = stage;
    this.canvasHost = stage.querySelector('[data-vault-canvas]');
    this.chapterEls = [...stage.querySelectorAll('[data-chapter]')];
    this.railEls = [...stage.querySelectorAll('[data-rail-dot]')];
    this.progressEl = stage.querySelector('[data-vault-progress]');
    this.holdHint = stage.querySelector('[data-hold-hint]');

    this.mobile = matchMedia('(max-width: 860px)').matches;
    this.p = 0;              // scroll progress 0..1
    this.chapter = -1;
    this.raf = 0;
    this.visible = true;
    this.dead = false;

    this.drag = { active: false, x: 0, y: 0, vx: 0, vy: 0, rotX: 0, rotY: 0, auto: 0 };
    this.ptr = { x: 0, y: 0, tx: 0, ty: 0 };
    this.clock = new THREE.Clock();

    try {
      this.init();
      this.bind();
      this.stage.classList.add('vault-gl-on');
      this.setChapter(0, true);
    } catch (err) {
      console.warn('[vault] WebGL init failed — cinematic CSS cover active.', err);
      this.fail();
    }
  }

  /* ---------------------------------------------------------------------- */
  init() {
    const renderer = new THREE.WebGLRenderer({
      antialias: !this.mobile, alpha: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: true,
    });
    this.dpr = Math.min(window.devicePixelRatio || 1, this.mobile ? 1.5 : 1.75);
    renderer.setPixelRatio(this.dpr);
    renderer.setClearColor(0x04091a, 1);
    // We tone-map and encode by hand in the composite pass, so three must
    // hand us raw linear light everywhere.
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    const canvas = renderer.domElement;
    canvas.className = 'vault-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    // Layering contract enforced inline: the canvas sits behind all UI and
    // never eats a click unless a drag is in flight (see bind()).
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:1;display:block;pointer-events:none;';
    this.canvasHost.appendChild(canvas);

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[vault] WebGL context lost — reverting to CSS cover.');
      this.fail();
    }, false);

    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
    this.camera.position.set(0, 0.25, 7.6);
    this.lookAt = new THREE.Vector3(0, 0.1, 0);

    /* --- environment first: every metal below depends on it --- */
    this.env = buildEnvironment(renderer);

    /* --- lights: the env map does the heavy lifting; these add shape --- */
    const key = new THREE.DirectionalLight(0xFFE6BC, 1.15);
    key.position.set(4, 5, 6);
    const rim = new THREE.DirectionalLight(0x8FB4FF, 0.70);
    rim.position.set(-6, 2, -4);
    const fill = new THREE.AmbientLight(0x2A2C77, 0.28);
    this.scene.add(key, rim, fill);

    /* --- sky --- */
    const sky = buildSky();
    this.sky = sky; this.scene.add(sky.mesh);

    /* --- ridges: near, mid, far --- */
    this.ridges = [
      { mesh: buildRidge(3.1, 120, 7.0, 0, new THREE.Color('#0A1030'), 0.95), z: -46, par: 0.30 },
      { mesh: buildRidge(7.7,  96, 5.4, 0, new THREE.Color('#141A45'), 0.85), z: -62, par: 0.18 },
      { mesh: buildRidge(1.4,  76, 4.0, 0, new THREE.Color('#22225C'), 0.65), z: -80, par: 0.10 },
    ];
    this.ridges.forEach(r => {
      r.mesh.position.set(0, -2.6, r.z);
      r.base = r.mesh.position.clone();
      this.scene.add(r.mesh);
    });

    /* --- ground mirror --- */
    const ground = buildGround();
    this.ground = ground; this.scene.add(ground.mesh);

    /* --- the artifact --- */
    const mono = buildMonolith(this.env);
    this.mono = mono;
    this.artifact = new THREE.Group();
    this.artifact.add(mono.group);
    // A phone's wider lens (54° vs 42°) already enlarges everything near the
    // centre; trim the subject so it reads as an object, not a wall.
    if (this.mobile) this.artifact.scale.setScalar(0.82);
    this.scene.add(this.artifact);

    /* --- swarm --- */
    this.swarm = buildSwarm(this.env, this.mobile);
    this.scene.add(this.swarm.mesh);
    this._m4 = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._v = new THREE.Vector3();
    this._s = new THREE.Vector3();

    /* --- orbs + dust --- */
    this.orbs = buildOrbs(this.env);
    this.scene.add(this.orbs.group);
    this.dust = buildDust(this.mobile ? 260 : 520);
    this.dust.mat.uniforms.uPR.value = this.dpr;
    this.scene.add(this.dust.points);

    /* --- post chain --- */
    this.initPost();
    this.resize();
  }

  initPost() {
    const gl = this.renderer.getContext();
    const halfFloat = !!(this.renderer.capabilities.isWebGL2 || gl.getExtension('OES_texture_half_float'));
    // Bloom needs values above 1.0 to have anything to work with. If we can't
    // get a float target we simply skip post and render straight to screen.
    this.useBloom = halfFloat && !matchMedia('(max-width: 480px)').matches;

    if (!this.useBloom) {
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      return;
    }

    const opts = {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      depthBuffer: true, stencilBuffer: false,
    };
    this.rtScene = new THREE.WebGLRenderTarget(1, 1, opts);
    this.rtA = new THREE.WebGLRenderTarget(1, 1, { ...opts, depthBuffer: false });
    this.rtB = new THREE.WebGLRenderTarget(1, 1, { ...opts, depthBuffer: false });

    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadGeo = new THREE.PlaneGeometry(2, 2);

    this.matBright = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT, fragmentShader: BRIGHT_FRAG,
      uniforms: { tDiffuse: { value: null }, uThresh: { value: 1.10 }, uKnee: { value: 0.55 } },
      depthTest: false, depthWrite: false,
    });
    this.matBlur = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT, fragmentShader: BLUR_FRAG,
      uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } },
      depthTest: false, depthWrite: false,
    });
    this.matComp = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT, fragmentShader: COMPOSITE_FRAG,
      uniforms: {
        tScene: { value: null }, tBloom: { value: null },
        uBloom: { value: 0.30 }, uTime: { value: 0 },
        uGrain: { value: 0.022 }, uVig: { value: 0.62 },
        uCA: { value: 0.014 }, uFade: { value: 1 },
        uExposure: { value: 0.68 },
      },
      depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(this.quadGeo, this.matComp);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }

  /* ---------------------------------------------------------------------- */
  bind() {
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize, { passive: true });

    this.onScroll = () => this.updateScroll();
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.updateScroll();

    /* -- pointer parallax (whole window, subtle) -- */
    this.onMove = (e) => {
      this.ptr.tx = (e.clientX / window.innerWidth) * 2 - 1;
      this.ptr.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', this.onMove, { passive: true });

    /* -- click & hold to rotate the artifact --
       The grab surface is a transparent DOM layer, NOT the canvas, so the
       canvas keeps pointer-events:none and can never trap a click. */
    const grab = this.stage.querySelector('[data-vault-grab]');
    if (grab) {
      const down = (e) => {
        this.drag.active = true;
        this.drag.x = e.clientX; this.drag.y = e.clientY;
        this.drag.vx = this.drag.vy = 0;
        grab.setPointerCapture?.(e.pointerId);
        this.stage.classList.add('is-grabbing');
        this.stage.classList.add('has-grabbed');
      };
      const move = (e) => {
        if (!this.drag.active) return;
        const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
        this.drag.x = e.clientX; this.drag.y = e.clientY;
        this.drag.vx = dx * 0.0075;
        this.drag.vy = dy * 0.0050;
        this.drag.rotY += this.drag.vx;
        this.drag.rotX = THREE.MathUtils.clamp(this.drag.rotX + this.drag.vy, -0.7, 0.7);
      };
      const up = (e) => {
        this.drag.active = false;
        grab.releasePointerCapture?.(e.pointerId);
        this.stage.classList.remove('is-grabbing');
      };
      grab.addEventListener('pointerdown', down);
      grab.addEventListener('pointermove', move);
      grab.addEventListener('pointerup', up);
      grab.addEventListener('pointercancel', up);
      grab.addEventListener('lostpointercapture', () => {
        this.drag.active = false; this.stage.classList.remove('is-grabbing');
      });
    }

    /* -- render only while on screen and while the tab is visible -- */
    this.io = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible && !document.hidden) this.start(); else this.stop();
    }, { rootMargin: '10% 0px' });
    this.io.observe(this.stage);

    this.onVis = () => {
      if (document.hidden) this.stop();
      else if (this.visible) this.start();
    };
    document.addEventListener('visibilitychange', this.onVis);
  }

  /* ---------------------------------------------------------------------- */
  resize() {
    if (this.dead) return;
    const w = this.canvasHost.clientWidth || window.innerWidth;
    const h = this.canvasHost.clientHeight || window.innerHeight;
    if (w <= 0 || h <= 0) return;
    this.mobile = matchMedia('(max-width: 860px)').matches;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Widen the lens on narrow screens so the artifact still frames well.
    this.camera.fov = this.mobile ? 54 : 42;
    this.camera.updateProjectionMatrix();
    if (this.artifact) this.artifact.scale.setScalar(this.mobile ? 0.82 : 1);

    if (this.useBloom) {
      const pw = Math.max(2, Math.floor(w * this.dpr));
      const ph = Math.max(2, Math.floor(h * this.dpr));
      this.rtScene.setSize(pw, ph);
      this.rtA.setSize(Math.max(2, pw >> 1), Math.max(2, ph >> 1));
      this.rtB.setSize(Math.max(2, pw >> 1), Math.max(2, ph >> 1));
    }
  }

  /* --- scroll → progress + chapter ------------------------------------- */
  updateScroll() {
    const r = this.stage.getBoundingClientRect();
    const total = Math.max(1, r.height - window.innerHeight);
    const p = THREE.MathUtils.clamp(-r.top / total, 0, 1);
    this.p = p;

    const n = CHAPTERS.length;
    const idx = THREE.MathUtils.clamp(Math.round(p * (n - 1)), 0, n - 1);
    if (idx !== this.chapter) this.setChapter(idx);

    if (this.progressEl) this.progressEl.style.setProperty('--vault-p', p.toFixed(4));
  }

  setChapter(i, immediate) {
    this.chapter = i;
    this.chapterEls.forEach((el, k) => el.classList.toggle('is-live', k === i));
    this.railEls.forEach((el, k) => {
      el.classList.toggle('is-live', k === i);
      el.classList.toggle('is-past', k < i);
    });
    this.stage.dataset.chapter = String(i);
    if (immediate) this.chapterEls.forEach(el => el.classList.add('is-ready'));
  }

  /* --- interpolate the camera keyframes --------------------------------- */
  sampleFilm(p) {
    const n = CHAPTERS.length - 1;
    const f = THREE.MathUtils.clamp(p, 0, 1) * n;
    const i = Math.min(Math.floor(f), n - 1);
    const t = easeInOut(f - i);
    const a = CHAPTERS[i], b = CHAPTERS[i + 1];
    const lerp = (x, y) => x + (y - x) * t;
    return {
      cam: [lerp(a.cam[0], b.cam[0]), lerp(a.cam[1], b.cam[1]), lerp(a.cam[2], b.cam[2])],
      look: [lerp(a.look[0], b.look[0]), lerp(a.look[1], b.look[1]), lerp(a.look[2], b.look[2])],
      art: [lerp(a.art[0], b.art[0]), lerp(a.art[1], b.art[1])],
      swarm: lerp(a.swarm, b.swarm),
      core: lerp(a.core, b.core),
      halo: lerp(a.halo, b.halo),
      glow: lerp(a.glow, b.glow),
      spin: lerp(a.spin, b.spin),
    };
  }

  /* ---------------------------------------------------------------------- */
  start() {
    if (this.raf || this.dead) return;
    this.clock.getDelta();
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this.frame();
    };
    loop();
  }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    const f = this.sampleFilm(this.p);

    /* -- pointer easing -- */
    this.ptr.x += (this.ptr.tx - this.ptr.x) * 0.045;
    this.ptr.y += (this.ptr.ty - this.ptr.y) * 0.045;

    /* -- camera: keyframe + parallax + a slow breathing drift -- */
    const px = this.ptr.x * (this.mobile ? 0.18 : 0.55);
    const py = -this.ptr.y * (this.mobile ? 0.10 : 0.30);
    // Framing offset: aiming the camera LEFT of the artifact pushes the
    // artifact to the right third of the frame, clear of the headline block.
    // It relaxes toward centre during the push-in chapter, where the aperture
    // has to fill the screen.
    const frameOff = this.mobile ? 0 : -1.55 * (1 - f.core * 0.85);
    // On a phone there is no room beside the artifact, so the frame splits
    // vertically instead: aiming BELOW the subject lifts it into the top half
    // and leaves the bottom half to the headline and the buttons.
    const frameOffY = this.mobile ? -1.15 * (1 - f.core * 0.6) : 0;
    this.camera.position.set(
      f.cam[0] + px + Math.sin(t * 0.13) * 0.10,
      f.cam[1] + py + Math.sin(t * 0.17 + 1.4) * 0.07,
      f.cam[2]
    );
    this.lookAt.set(f.look[0] + frameOff + px * 0.25, f.look[1] + frameOffY + py * 0.25, f.look[2]);
    this.camera.lookAt(this.lookAt);

    /* -- artifact: chapter spin + drag inertia -- */
    if (!this.drag.active) {
      this.drag.vx *= 0.94; this.drag.vy *= 0.94;
      this.drag.rotY += this.drag.vx;
      this.drag.rotX = THREE.MathUtils.clamp(this.drag.rotX + this.drag.vy, -0.7, 0.7);
      this.drag.rotX *= 0.985;                       // settle back to level
    }
    this.artifact.rotation.y = f.spin + this.drag.rotY + Math.sin(t * 0.21) * 0.10;
    this.artifact.rotation.x = this.drag.rotX + Math.sin(t * 0.16) * 0.035;
    // Staging. On a narrow screen the horizontal FOV can't hold a 2-unit
    // sidestep, so it is damped rather than dropped — the lift still reads.
    this.artifact.position.x = f.art[0] * (this.mobile ? 0.40 : 1);
    this.artifact.position.y = f.art[1] * (this.mobile ? 0.70 : 1) + Math.sin(t * 0.42) * 0.075;

    this.mono.gyro.rotation.z = t * 0.10;
    this.mono.gyro.rotation.y = -t * 0.06;
    this.mono.gyro.children[1].rotation.z = t * 0.15;
    // The rings are 1.9 units wide; at the close-up camera distance they would
    // slash across the frame. Tuck them in as the aperture takes over.
    const gs = 1 - 0.62 * f.core;
    this.mono.gyro.scale.setScalar(gs);

    /* -- shader state -- */
    this.sky.mat.uniforms.uTime.value = t;
    this.sky.mat.uniforms.uProg.value = this.p;
    this.ground.mat.uniforms.uTime.value = t;
    this.ground.mat.uniforms.uGlow.value = f.glow;
    this.mono.coreMat.uniforms.uTime.value = t;
    this.mono.coreMat.uniforms.uInt.value = f.core;
    this.mono.haloMat.uniforms.uTime.value = t;
    this.mono.haloMat.uniforms.uInt.value = f.halo;
    this.dust.mat.uniforms.uTime.value = t;

    /* -- ridge parallax -- */
    this.ridges.forEach(r => {
      r.mesh.position.x = -px * r.par * 6;
      r.mesh.position.y = r.base.y - py * r.par * 3;
    });

    /* -- orbs -- */
    this.orbs.orbs.forEach(({ mesh, spec }, i) => {
      const [ox, oy, oz] = spec.orbit, [sx, sy, sz] = spec.sp;
      mesh.position.set(
        Math.cos(t * sx + spec.ph) * ox + (spec.xOff || 0),
        Math.sin(t * sy + spec.ph * 1.7) * oy + 0.6,
        Math.sin(t * sz + spec.ph) * oz - 3.0 + (spec.zOff || 0)
      );
      mesh.rotation.y = t * 0.12 + i;
    });

    /* -- swarm: lerp each cube between scattered and assembled -- */
    const S = this.swarm;
    for (let i = 0; i < S.data.length; i++) {
      const d = S.data[i];
      // per-row delay so the column builds bottom-up
      const local = THREE.MathUtils.clamp((f.swarm - d.row * 0.35) / 0.65, 0, 1);
      const k = easeInOut(local);
      this._v.lerpVectors(d.from, d.to, k);
      this._v.y += Math.sin(t * 0.5 + d.phase * 24) * 0.09 * (1 - k * 0.7);
      // Rotation decays to zero as the cube seats itself. A lattice of
      // randomly-tumbled cubes reads as debris; an axis-aligned one reads as
      // something that was built.
      const tumble = 1 - k;
      this._e.set((t * d.spin + d.phase * 6.28) * tumble,
                  (t * d.spin * 0.7 + d.phase * 3.14) * tumble,
                  d.phase * 1.57 * tumble);
      this._q.setFromEuler(this._e);
      // A dormant swarm should be a hint of gold dust, not confetti — the
      // scale floor is deliberately low so chapter 1 stays clean.
      const sc = d.size * (0.16 + 0.84 * k);
      this._s.set(sc, sc, sc);
      this._m4.compose(this._v, this._q, this._s);
      S.mesh.setMatrixAt(i, this._m4);
    }
    S.mesh.instanceMatrix.needsUpdate = true;

    /* -- render -- */
    if (this.useBloom) {
      const r = this.renderer;
      r.setRenderTarget(this.rtScene);
      r.render(this.scene, this.camera);

      // bright pass → half res
      this.quad.material = this.matBright;
      this.matBright.uniforms.tDiffuse.value = this.rtScene.texture;
      r.setRenderTarget(this.rtA);
      r.render(this.quadScene, this.quadCam);

      // separable blur, 3 ping-pong rounds at widening radii
      this.quad.material = this.matBlur;
      const w = this.rtA.width, h = this.rtA.height;
      for (let i = 0; i < 3; i++) {
        const rad = 1.0 + i * 1.9;
        this.matBlur.uniforms.tDiffuse.value = this.rtA.texture;
        this.matBlur.uniforms.uDir.value.set(rad / w, 0);
        r.setRenderTarget(this.rtB);
        r.render(this.quadScene, this.quadCam);

        this.matBlur.uniforms.tDiffuse.value = this.rtB.texture;
        this.matBlur.uniforms.uDir.value.set(0, rad / h);
        r.setRenderTarget(this.rtA);
        r.render(this.quadScene, this.quadCam);
      }

      // composite
      this.quad.material = this.matComp;
      this.matComp.uniforms.tScene.value = this.rtScene.texture;
      this.matComp.uniforms.tBloom.value = this.rtA.texture;
      this.matComp.uniforms.uTime.value = t;
      // the film blooms hardest in the "core" chapter
      this.matComp.uniforms.uBloom.value = 0.26 + f.core * 0.20;
      this.matComp.uniforms.uCA.value = 0.010 + f.core * 0.016;
      r.setRenderTarget(null);
      r.render(this.quadScene, this.quadCam);
    } else {
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
    }
  }

  /* --- single failure path --------------------------------------------- */
  fail() {
    this.dead = true;
    this.stop();
    this.io?.disconnect();
    if (this.onResize) window.removeEventListener('resize', this.onResize);
    if (this.onScroll) window.removeEventListener('scroll', this.onScroll);
    if (this.onMove) window.removeEventListener('pointermove', this.onMove);
    if (this.onVis) document.removeEventListener('visibilitychange', this.onVis);
    if (this.renderer) {
      const c = this.renderer.domElement;
      try { this.renderer.dispose(); } catch (_) {}
      c.parentNode?.removeChild(c);
    }
    this.stage.classList.remove('vault-gl-on');
    this.stage.classList.add('vault-css-only');
  }
}

/* ==========================================================================
   BOOT — capability gate, then one Vault.

   Note the scroll-progress wiring lives OUTSIDE the gate: the chapter copy,
   the rail and the progress bar must animate on every device, WebGL or not.
   ========================================================================== */
(function boot() {
  // The cover is <header class="vault" id="top"> — match on the class so the
  // #top anchor stays free for the nav links.
  const stage = document.querySelector('.vault');
  if (!stage) return;

  /* --- chapter driver for the CSS-only cover (and the shared UI state) --- */
  const chapterEls = [...stage.querySelectorAll('[data-chapter]')];
  const railEls = [...stage.querySelectorAll('[data-rail-dot]')];
  const progressEl = stage.querySelector('[data-vault-progress]');
  let cssChapter = -1;
  const driveUI = () => {
    const r = stage.getBoundingClientRect();
    const total = Math.max(1, r.height - window.innerHeight);
    const p = Math.min(1, Math.max(0, -r.top / total));
    const idx = Math.min(chapterEls.length - 1, Math.max(0, Math.round(p * (chapterEls.length - 1))));
    if (progressEl) progressEl.style.setProperty('--vault-p', p.toFixed(4));
    if (idx !== cssChapter) {
      cssChapter = idx;
      chapterEls.forEach((el, k) => el.classList.toggle('is-live', k === idx));
      railEls.forEach((el, k) => {
        el.classList.toggle('is-live', k === idx);
        el.classList.toggle('is-past', k < idx);
      });
      stage.dataset.chapter = String(idx);
      // Anything that should fire on a beat of the film (the stat count-up,
      // for one) listens for this instead of guessing with a timer.
      window.dispatchEvent(new CustomEvent('vault:chapter', { detail: { index: idx } }));
    }
  };
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { driveUI(); ticking = false; });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  driveUI();
  chapterEls.forEach(el => el.classList.add('is-ready'));
  stage.classList.add('vault-ui-on');

  /* --- rail dots jump to their chapter --- */
  railEls.forEach((dot, k) => {
    dot.addEventListener('click', () => {
      const total = stage.offsetHeight - window.innerHeight;
      const y = stage.offsetTop + (total * k) / Math.max(1, railEls.length - 1);
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  /* --- capability gate for the 3D layer --- */
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowMemory = navigator.deviceMemory !== undefined && navigator.deviceMemory <= 2;
  const lowCores = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 2;
  if (reducedMotion || lowMemory || lowCores) return;

  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2') || probe.getContext('webgl');
  if (!gl) return;
  gl.getExtension('WEBGL_lose_context')?.loseContext();

  const go = () => { new Vault(stage); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go, { once: true });
  else go();
})();

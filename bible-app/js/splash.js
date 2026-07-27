/* LIVING WORD — Splash & Opening Experience
   WebGL volumetric god-rays + dust motes under a CSS-3D holographic Bible.
   Timeline (see docs/DESIGN.md §1.3): void → descending shaft → Bible rises →
   cover opens (39-frame curve) → upward bloom + title → light-gate dissolve.
   Entirely offline: shaders inline, zero network. Skippable after 1.5s.      */

'use strict';

const SPLASH_VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/* God-rays: a top-anchored volumetric shaft with animated dust, plus a
   late-phase upward bloom from the book (uBloom) and radial gate arcs
   for the exit transition (uGate). Warm white→gold only, per §1.2.     */
const SPLASH_FRAG = `
precision mediump float;
uniform vec2  uRes;
uniform float uTime;    // seconds since splash start
uniform float uShaft;   // 0..1 shaft intensity
uniform float uBloom;   // 0..1 upward bloom from opened book
uniform float uGate;    // 0..1 exit gate transition

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;          // 0..1, y up
  // Daybreak sky: warm horizon below, cool luminous heaven above. Kept
  // saturated enough that the brilliant shaft still reads AS a shaft.
  vec3 skyLow  = vec3(1.000, 0.933, 0.769);
  vec3 skyMid  = vec3(0.835, 0.902, 1.000);
  vec3 skyHigh = vec3(0.604, 0.769, 0.973);
  vec3 col = mix(mix(skyLow, skyMid, smoothstep(0.0, 0.55, uv.y)),
                 skyHigh, smoothstep(0.5, 1.0, uv.y));

  vec3 gold  = vec3(1.000, 0.878, 0.560);
  vec3 white = vec3(1.000, 0.992, 0.957);

  // ------- descending volumetric shaft (widens toward the floor)
  float cx = uv.x - 0.5;
  float halfW = mix(0.10, 0.34, 1.0 - uv.y);           // cone
  float core = 1.0 - smoothstep(0.0, halfW, abs(cx));
  // animated volumetric density: two drifting noise octaves
  float dens = 0.70
    + 0.30 * noise(vec2(uv.x * 6.0, uv.y * 3.0 - uTime * 0.12))
    * (0.6 + 0.4 * noise(vec2(uv.x * 14.0 + 7.0, uv.y * 7.0 - uTime * 0.3)));
  float fallY = smoothstep(0.0, 0.35, uv.y);           // fades near floor
  float shaft = core * core * dens * mix(0.55, 1.0, uv.y) * uShaft;
  col += shaft * mix(gold, white, uv.y) * 1.35;
  col += core * fallY * 0.24 * uShaft * gold;          // soft haze
  // broad glow spilling out of the beam, warming the whole sky
  col += (1.0 - smoothstep(0.0, 0.85, abs(cx))) * uShaft * gold * 0.14 * mix(0.4, 1.0, uv.y);

  // ------- dust motes drifting through the beam
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 gp = uv * (34.0 + fi * 21.0);
    gp.y += uTime * (0.9 + fi * 0.55);
    gp.x += sin(uTime * 0.4 + fi * 2.1) * 0.35;
    vec2 cell = floor(gp);
    vec2 p = fract(gp) - 0.5;
    float sparkle = smoothstep(0.09, 0.0, length(p + (vec2(hash(cell), hash(cell + 9.0)) - 0.5) * 0.6));
    col += sparkle * core * uShaft * white * (0.22 - fi * 0.05);
  }

  // ------- upward bloom from the opened book (light returns to source)
  vec2 bookP = vec2(0.5, 0.34);
  float d = distance(uv * vec2(uRes.x / uRes.y, 1.0), bookP * vec2(uRes.x / uRes.y, 1.0));
  float bloom = exp(-d * d * 7.0) * uBloom;
  float upBeam = (1.0 - smoothstep(0.0, 0.20, abs(cx))) * smoothstep(0.30, 0.95, uv.y) * uBloom;
  col += (bloom * 1.7 + upBeam * 0.85) * mix(gold, white, 0.6);

  // ------- exit: concentric luminous gate arcs (Rev 21:25)
  if (uGate > 0.001) {
    float rings = sin((d * 26.0 - uGate * 22.0)) * 0.5 + 0.5;
    float gate = smoothstep(0.0, 1.0, uGate) * rings * exp(-d * 2.2);
    col = mix(col, white, gate * 0.9 * uGate);
    col = mix(col, white, smoothstep(0.65, 1.0, uGate)); // final white-out
  }

  // barely-there vignette: keeps focus without dimming the sky
  float vig = smoothstep(1.35, 0.5, length(uv - vec2(0.5, 0.45)));
  col *= mix(0.95, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error('Shader compile failed: ' + gl.getShaderInfoLog(s));
  }
  return s;
}

/* Easing along the 39-frame opening curve shared with the reader engine.  */
import { FLIP_LUT_39, sampleLut } from './pageflip.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
/* phase(t, start, end) → 0..1 progress of a timeline beat */
const phase = (t, a, b) => clamp01((t - a) / (b - a));

export function runSplash(onDone) {
  const root = document.getElementById('splash');
  const canvas = document.getElementById('splash-gl');
  const bookEl = document.getElementById('splash-book');
  const coverEl = bookEl.querySelector('.cover');
  const fanEls = [...bookEl.querySelectorAll('.fan')];
  const titleEl = document.getElementById('splash-title');
  root.style.display = 'block';

  let gl = null, uni = {};
  try {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (gl) {
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, SPLASH_VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, SPLASH_FRAG));
      gl.linkProgram(prog);
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      for (const n of ['uRes','uTime','uShaft','uBloom','uGate']) {
        uni[n] = gl.getUniformLocation(prog, n);
      }
    }
  } catch (e) {
    gl = null; // CSS ambient-beam fallback still shows; splash degrades gracefully
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  addEventListener('resize', resize);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T_END = reduced ? 1.2 : 4.2;
  const t0 = performance.now();
  let skipped = false, finished = false;

  const skip = () => { if ((performance.now() - t0) / 1000 > 1.5) skipped = true; };
  root.addEventListener('pointerdown', skip);

  function finish() {
    if (finished) return;
    finished = true;
    removeEventListener('resize', resize);
    root.style.display = 'none';
    onDone();
  }

  function frame(now) {
    if (finished) return;
    let t = (now - t0) / 1000;
    if (skipped) t = Math.max(t, T_END - 0.45); // jump to the gate dissolve

    // Beat intensities per the visual script
    const shaft = smooth(phase(t, 0.0, 0.8));
    const rise  = smooth(phase(t, 0.8, 1.6));
    const open  = phase(t, 1.6, 2.8);              // fed through the 39-frame LUT
    const bloom = smooth(phase(t, 2.8, 3.4));
    const gate  = smooth(phase(t, 3.6, 4.2));

    if (gl) {
      gl.uniform2f(uni.uRes, canvas.width, canvas.height);
      gl.uniform1f(uni.uTime, t);
      gl.uniform1f(uni.uShaft, shaft * (1 - gate * 0.7));
      gl.uniform1f(uni.uBloom, bloom * (1 - gate));
      gl.uniform1f(uni.uGate, gate);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // ---- 3D holographic Bible rig (CSS 3D over the shader)
    const y = (1 - rise) * 46;                      // rises from beneath
    bookEl.style.opacity = String(rise);
    bookEl.style.transform =
      `translate(-50%, calc(-50% + ${y}vh)) rotateX(14deg) rotateY(${8 * rise}deg)`;

    // Cover opens along the shared page-turn curve; pages fan behind it.
    const eased = sampleLut(FLIP_LUT_39, clamp01(open));
    coverEl.style.transform = `rotateY(${-172 * eased}deg)`;
    coverEl.style.setProperty('--translucency', String(Math.sin(eased * Math.PI)));
    fanEls.forEach((el, i) => {
      const lag = clamp01(open * 1.35 - (i + 1) * 0.12);
      const e = sampleLut(FLIP_LUT_39, lag);
      el.style.transform = `rotateY(${-160 * e}deg)`;
      el.style.setProperty('--translucency', String(Math.sin(e * Math.PI) * 0.9));
    });
    bookEl.style.setProperty('--book-bloom', String(bloom));

    titleEl.style.opacity = String(smooth(phase(t, 2.9, 3.5)) * (1 - gate));
    titleEl.style.transform = `translateX(-50%) translateY(${(1 - smooth(phase(t, 2.9, 3.5))) * 14}px)`;

    if (t >= T_END) { finish(); return; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

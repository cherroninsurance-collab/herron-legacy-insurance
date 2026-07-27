/* LIVING WORD — 3D interactive page-flip engine
   Physics (DESIGN.md §3.2):
     spring  a = -k(p - target) - c·v   with  k = 170, c = 24
     (slightly under-damped: ζ = c / (2√k) ≈ 0.921 → one soft settle)
     integrated semi-implicit Euler at a fixed 60 Hz step.
   FLIP_LUT_39 is the canonical 39-frame interpolation map sampled from that
   exact spring (0 → 1), used for reduced-motion devices and to keep the
   splash-screen book opening on the identical curve.
   Light-through-paper: translucency = sin(p·π) — brightest mid-turn as the
   page crosses the beam; crease specular band follows the fold.            */

'use strict';

export const SPRING_K = 170;
export const SPRING_C = 24;
const DT = 1 / 60;

/* Deterministically sample the release spring from p=0 → target=1 for 39
   fixed steps. This IS the 39-frame interpolation map — generated from the
   physics so curve and LUT can never drift apart.                          */
function buildLut(frames) {
  const lut = new Float64Array(frames);
  let p = 0, v = 0;
  for (let i = 0; i < frames; i++) {
    const a = -SPRING_K * (p - 1) - SPRING_C * v;
    v += a * DT;
    p += v * DT;
    lut[i] = p;
  }
  lut[frames - 1] = 1; // pin the settle
  return lut;
}
export const FLIP_LUT_39 = buildLut(39);

/* Sample the LUT with linear interpolation; t in [0,1]. */
export function sampleLut(lut, t) {
  if (t <= 0) return 0;
  if (t >= 1) return lut[lut.length - 1];
  const x = t * (lut.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  return lut[i] * (1 - f) + lut[i + 1] * f;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * PageFlip — binds fluid page-turn gestures to a .book-stage element.
 *
 * options:
 *   stage      : HTMLElement (.book-stage) containing one .leaf
 *   canGo(dir) : boolean — is there a page in that direction (+1 fwd / -1 back)
 *   onCommit(dir) : called exactly once when a turn completes; swap content here
 *   grabZone   : fraction of width on each edge that starts a drag (default .38)
 */
export class PageFlip {
  constructor({ stage, canGo, onCommit, grabZone = 0.38 }) {
    this.stage = stage;
    this.leaf = stage.querySelector('.leaf');
    this.shadow = stage.querySelector('.page-shadow');
    this.canGo = canGo;
    this.onCommit = onCommit;
    this.grabZone = grabZone;

    this.p = 0;          // fold progress 0..1 (1 = fully turned)
    this.v = 0;
    this.dir = 0;        // +1 turning forward, -1 turning back
    this.target = 0;
    this.dragging = false;
    this.animating = false;
    this._acc = 0;
    this._lastT = 0;
    this._lastX = 0;
    this._velX = 0;

    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    stage.addEventListener('pointerdown', (e) => this._down(e));
    stage.addEventListener('pointermove', (e) => this._move(e));
    stage.addEventListener('pointerup',   (e) => this._up(e));
    stage.addEventListener('pointercancel', (e) => this._up(e));
  }

  /* ------------------------------------------------------------ gestures */
  _down(e) {
    const w = this.stage.clientWidth;
    const x = e.offsetX;
    const fromRight = x > w * (1 - this.grabZone);
    const fromLeft  = x < w * this.grabZone;
    if (!fromRight && !fromLeft && !this.animating) return;

    const dir = this.animating ? this.dir : (fromRight ? +1 : -1);
    if (!this.animating && !this.canGo(dir)) return;

    // Interruption-safe: capture the live spring state and hand it to the finger.
    this.dragging = true;
    this.animating = false;
    this.dir = dir;
    this._lastX = e.clientX;
    this._velX = 0;
    this._lastT = performance.now();
    this.stage.setPointerCapture(e.pointerId);
    if (this.dir === -1 && this.p === 0) this.p = 0; // back-turn starts folded from left
    this._render();
  }

  _move(e) {
    if (!this.dragging) return;
    const now = performance.now();
    const w = this.stage.clientWidth;
    const dx = e.clientX - this._lastX;
    const dt = Math.max((now - this._lastT) / 1000, 1e-4);
    this._velX = 0.8 * this._velX + 0.2 * (dx / w / dt);   // screen-widths/s, smoothed
    this._lastT = now;
    this._lastX = e.clientX;
    // forward turn: dragging left increases p; back turn: dragging right does
    this.p = clamp(this.p + (this.dir === 1 ? -dx : dx) / w, 0, 1);
    this._render();
  }

  _up(e) {
    if (!this.dragging) return;
    this.dragging = false;
    // Commit if past halfway OR flung ≥ 0.9 screen-widths/s in the turn direction.
    const fling = this.dir === 1 ? -this._velX : this._velX;
    this.target = (this.p > 0.5 || fling >= 0.9) ? 1 : 0;
    this.v = fling * (this.target === 1 ? 1 : -0.4); // carry finger momentum into the spring
    this._startSpring();
  }

  /* Edge-tap / button turn: full spring animation from rest. */
  turn(dir) {
    if (this.animating || this.dragging || !this.canGo(dir)) return;
    this.dir = dir;
    this.p = 0;
    this.v = 0;
    this.target = 1;
    if (this.reduced) return this._lutPlayback();
    this._startSpring();
  }

  /* ------------------------------------------------------------- physics */
  _startSpring() {
    this.animating = true;
    this._acc = 0;
    this._lastT = performance.now();
    requestAnimationFrame((t) => this._springFrame(t));
  }

  _springFrame(now) {
    if (this.dragging || !this.animating) return;
    this._acc += Math.min((now - this._lastT) / 1000, 0.05);
    this._lastT = now;
    // fixed-step integration keeps the curve identical across refresh rates
    while (this._acc >= DT) {
      const a = -SPRING_K * (this.p - this.target) - SPRING_C * this.v;
      this.v += a * DT;
      this.p += this.v * DT;
      this._acc -= DT;
    }
    const settled = Math.abs(this.p - this.target) < 0.0012 && Math.abs(this.v) < 0.02;
    if (settled) { this.p = this.target; this.v = 0; }
    this._render();
    if (settled) return this._finish();
    requestAnimationFrame((t) => this._springFrame(t));
  }

  /* Reduced-motion / low-GPU path: step through the canonical 39 frames. */
  _lutPlayback() {
    this.animating = true;
    let i = 0;
    const step = () => {
      if (this.dragging) return;
      this.p = FLIP_LUT_39[i++];
      this._render();
      if (i < FLIP_LUT_39.length) requestAnimationFrame(step);
      else this._finish();
    };
    requestAnimationFrame(step);
  }

  _finish() {
    this.animating = false;
    if (this.target === 1) this.onCommit(this.dir);
    this.p = 0;
    this.v = 0;
    this.dir = 0;
    this._render();
  }

  /* ------------------------------------------------------------ painting */
  _render() {
    const p = clamp(this.p, 0, 1);
    // cylinder-bend approximation: rotation eases slightly ahead of p at the
    // start (paper lifts before the whole leaf pivots)
    const angle = -180 * p;
    const lift = Math.sin(p * Math.PI) * 6;                 // px z-lift mid-turn
    const glow = Math.sin(p * Math.PI);                     // light through paper
    const leaf = this.leaf;

    if (this.dir >= 0) {
      leaf.style.transformOrigin = 'left center';
      leaf.style.transform = `translateZ(${lift}px) rotateY(${angle}deg)`;
    } else {
      leaf.style.transformOrigin = 'left center';
      leaf.style.transform = `translateZ(${lift}px) rotateY(${-180 + 180 * p}deg)`;
    }
    // backface luminance mix(0, .85, sin(pπ)) and crease specular position
    leaf.style.setProperty('--translucency', String(0.85 * glow));
    leaf.style.setProperty('--crease', `${(1 - p) * 100}%`);
    if (this.shadow) this.shadow.style.setProperty('--under-shadow', String(glow * 0.8));
  }
}

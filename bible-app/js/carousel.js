/* LIVING WORD — 3D carousel
   A ring of cards in real perspective: drag to spin with inertia, snap to
   the nearest card on release, tap the front card to open it. Used for
   browsing the 66 books of the Bible and the teachings of Jesus.
   Physics match the house style: momentum + friction, then a settle
   spring onto the snap angle — weighted and liturgical, never twitchy.  */

'use strict';

const FRICTION = 0.94;         // per-frame inertia decay
const SNAP_K = 130, SNAP_C = 22;   // settle spring (ζ≈0.96)
const STEP = 1 / 60;

export class Carousel3D {
  /**
   * @param {Object} o
   * @param {HTMLElement} o.mount        container (gets .car3d)
   * @param {Array}    o.items           anything; renderCard maps to DOM
   * @param {Function} o.renderCard      (item, i) => HTMLElement (.car3d-card content)
   * @param {Function} o.onSelect        (item, i) called on tap of the front card
   * @param {Function} [o.onFocus]       (item, i) called whenever the front card changes
   * @param {number}   [o.cardWidth=150]
   * @param {number}   [o.spacing=1.22]  ring circumference padding factor
   */
  constructor({ mount, items, renderCard, onSelect, onFocus, cardWidth = 150, spacing = 1.22 }) {
    this.items = items;
    this.onSelect = onSelect;
    this.onFocus = onFocus;
    this.n = items.length;
    this.theta = 360 / this.n;
    // ring radius from chord length: r = (w/2) / tan(π/n)
    this.radius = Math.max(
      (cardWidth * spacing) / 2 / Math.tan(Math.PI / this.n), cardWidth);

    this.rot = 0;            // current ring rotation (deg)
    this.vel = 0;            // deg/frame
    this.focused = 0;
    this.dragging = false;
    this.settleTarget = null;

    mount.classList.add('car3d');
    this.ring = document.createElement('div');
    this.ring.className = 'car3d-ring';
    items.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = 'car3d-card';
      card.style.width = cardWidth + 'px';
      card.style.transform =
        `rotateY(${i * this.theta}deg) translateZ(${this.radius}px)`;
      card.append(renderCard(item, i));
      card.dataset.i = i;
      this.ring.append(card);
    });
    mount.append(this.ring);
    // pull the ring back so the front card sits at the mount's face
    mount.style.setProperty('--car3d-radius', this.radius + 'px');

    let downX = 0, downRot = 0, moved = 0, lastX = 0, lastT = 0;
    mount.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.settleTarget = null;
      this.vel = 0;
      downX = lastX = e.clientX;
      downRot = this.rot;
      moved = 0;
      lastT = performance.now();
      mount.setPointerCapture(e.pointerId);
    });
    mount.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const now = performance.now();
      const dxTotal = e.clientX - downX;
      moved = Math.max(moved, Math.abs(dxTotal));
      // ~quarter turn per full-width swipe feels weighty, not slippery
      const degPerPx = 90 / Math.max(mount.clientWidth, 240);
      this.rot = downRot + dxTotal * degPerPx;
      const dt = Math.max((now - lastT) / 1000, 1e-4);
      this.vel = 0.8 * this.vel + 0.2 * ((e.clientX - lastX) * degPerPx * STEP / dt);
      lastX = e.clientX; lastT = now;
      this._paint();
    });
    const up = (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      if (moved < 6) {                       // a tap, not a drag
        const card = e.target.closest('.car3d-card');
        if (card) {
          const i = +card.dataset.i;
          if (i === this.focused) this.onSelect(this.items[i], i);
          else this.goTo(i);                 // side card: bring it to front
          return;
        }
      }
      this._coast();
    };
    mount.addEventListener('pointerup', up);
    mount.addEventListener('pointercancel', up);

    this._paint();
    this._notifyFocus();
  }

  /* front index for the current rotation */
  _frontIndex() {
    const i = Math.round(-this.rot / this.theta) % this.n;
    return (i + this.n) % this.n;
  }

  /* rotate so item i faces front (shortest way around the ring) */
  goTo(i) {
    let target = -i * this.theta;
    while (target - this.rot > 180) target -= 360;
    while (target - this.rot < -180) target += 360;
    this.settleTarget = target;
    this.vel = 0;
    this._animate();
  }

  _coast() {
    this._animate();
  }

  _animate() {
    if (this._raf) return;
    const step = () => {
      this._raf = null;
      if (this.dragging) return;
      if (this.settleTarget === null) {
        this.vel *= FRICTION;
        this.rot += this.vel;
        if (Math.abs(this.vel) < 0.06) {      // slow enough: snap-settle
          let t = Math.round(this.rot / this.theta) * this.theta;
          this.settleTarget = t;
        }
      } else {
        const a = -SNAP_K * ((this.rot - this.settleTarget) * Math.PI / 180) - SNAP_C * (this.vel / STEP) * Math.PI / 180;
        this.vel += a * STEP * STEP * 180 / Math.PI;
        this.rot += this.vel;
        if (Math.abs(this.rot - this.settleTarget) < 0.05 && Math.abs(this.vel) < 0.02) {
          this.rot = this.settleTarget;
          this.settleTarget = null;
          this._paint();
          this._notifyFocus();
          return;
        }
      }
      this._paint();
      this._notifyFocus();
      this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }

  _notifyFocus() {
    const f = this._frontIndex();
    if (f !== this.focused) {
      this.focused = f;
      if (this.onFocus) this.onFocus(this.items[f], f);
    }
    // depth styling: front card full, others recede
    [...this.ring.children].forEach((card, i) => {
      card.classList.toggle('front', i === f);
    });
  }

  _paint() {
    this.ring.style.transform =
      `translateZ(calc(-1 * var(--car3d-radius))) rotateY(${this.rot}deg)`;
  }
}

import { CAMERA_STOPS } from './camera-stops.js';

const PANEL_IDS = ['panel-care', 'panel-paycheck', 'panel-home', 'panel-legacy'];
const PANELS    = PANEL_IDS.map(id => document.getElementById(id));
const NAV_DOTS  = Array.from(document.querySelectorAll('.nav-dot'));
const HINT      = document.getElementById('scroll-hint');

let lastActive  = -1;
let countedSets = new Set();

// ── count-up animation ────────────────────────────────────────────────────────
function runCountUp(panel) {
  const counters = panel.querySelectorAll('.count');
  counters.forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    if (target === 0) { el.textContent = '0'; return; }
    const duration = 1100;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  // Animate bar fills
  panel.querySelectorAll('.stat-bar-fill').forEach(bar => {
    setTimeout(() => { bar.style.width = bar.dataset.fill + '%'; }, 120);
  });
}

// ── update visible panel ──────────────────────────────────────────────────────
export function updateUI(stopIndex) {
  if (stopIndex === lastActive) return;
  lastActive = stopIndex;

  PANELS.forEach((p, i) => {
    if (i === stopIndex) {
      p.classList.add('visible');
    } else {
      p.classList.remove('visible');
    }
  });

  NAV_DOTS.forEach((d, i) => d.classList.toggle('active', i === stopIndex));

  if (HINT) HINT.style.opacity = stopIndex === 0 ? '1' : '0';

  // Run count-up once per section
  if (!countedSets.has(stopIndex)) {
    countedSets.add(stopIndex);
    setTimeout(() => runCountUp(PANELS[stopIndex]), 300);
  }
}

// ── nav dot click → scroll ────────────────────────────────────────────────────
export function bindNavDots(scrollToStop) {
  NAV_DOTS.forEach((dot, i) => {
    dot.addEventListener('click', () => scrollToStop(i));
  });
}
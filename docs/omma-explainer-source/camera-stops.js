export const DEFAULT_FOV    = 42;
export const DEFAULT_EASING = 'easeInOutQuad';
export const DEFAULT_DWELL  = 0;
export const MAX_DWELL      = 0.9;

export const EASINGS = {
  linear:        (t) => t,
  easeOutQuad:   (t) => 1 - (1 - t) * (1 - t),
  easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeInOutCubic:(t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutCubic:  (t) => 1 - Math.pow(1 - t, 3),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2
};

export const CAMERA_STOPS = [
  { key: 'care',     position: [0,    1.6, 7.4], target: [0,    0.6, 0], fov: 42, easing: 'easeInOutSine',  dwell: 0.34 },
  { key: 'paycheck', position: [6.2,  1.9, 6.4], target: [5.6,  0.7, 0], fov: 36, easing: 'easeOutQuad',    dwell: 0.30 },
  { key: 'home',     position: [11.4, 2.2, 7.0], target: [11.2, 0.8, 0], fov: 44, easing: 'easeInOutCubic', dwell: 0.26 },
  { key: 'legacy',   position: [17.2, 1.8, 6.6], target: [16.8, 0.9, 0], fov: 52, easing: 'easeOutCubic',   dwell: 0.40 }
];

export const CAMERA_STOPS_BY_KEY = CAMERA_STOPS.reduce((m, s) => { m[s.key] = s; return m; }, {});

export const getCameraStop      = (key) => CAMERA_STOPS_BY_KEY[key] ?? CAMERA_STOPS[0];
export const getCameraStopIndex = (key) => { const i = CAMERA_STOPS.findIndex(s => s.key === key); return i === -1 ? 0 : i; };
export const getStopFov         = (stop) => (stop && typeof stop.fov === 'number') ? stop.fov : DEFAULT_FOV;
export const getStopEasing      = (stop) => { const n = (stop && stop.easing) ? stop.easing : DEFAULT_EASING; return EASINGS[n] ?? EASINGS[DEFAULT_EASING]; };
export const getStopDwell       = (stop) => { const r = (stop && typeof stop.dwell === 'number') ? stop.dwell : DEFAULT_DWELL; return Math.max(0, Math.min(MAX_DWELL, r)); };

export function applyDwell(stopA, t) {
  t = Math.max(0, Math.min(1, t));
  const d = getStopDwell(stopA);
  if (d <= 0) return t;
  if (t <= d) return 0;
  return (t - d) / (1 - d);
}

export const isDwelling    = (stopA, t) => applyDwell(stopA, t) === 0 && getStopDwell(stopA) > 0;
export const easeSegment   = (stopA, t) => getStopEasing(stopA)(applyDwell(stopA, t));
export const lerpStopFov   = (stopA, stopB, t) => { const a = getStopFov(stopA), b = getStopFov(stopB); return a + (b - a) * easeSegment(stopA, t); };
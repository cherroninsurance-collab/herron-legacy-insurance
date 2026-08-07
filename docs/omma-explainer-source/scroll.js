import { CAMERA_STOPS, easeSegment, lerpStopFov } from './camera-stops.js';
import * as THREE from 'three';

const N = CAMERA_STOPS.length;

// Returns { pos, target, fov, stopIndex, segFraction, dwelling }
export function getCameraState(rawFraction) {
  const total = Math.max(0, Math.min(1, rawFraction));
  const scaled = total * (N - 1);
  const i = Math.min(Math.floor(scaled), N - 2);
  const t = scaled - i;

  const stopA = CAMERA_STOPS[i];
  const stopB = CAMERA_STOPS[i + 1];
  const eased = easeSegment(stopA, t);

  const pos = new THREE.Vector3(
    stopA.position[0] + (stopB.position[0] - stopA.position[0]) * eased,
    stopA.position[1] + (stopB.position[1] - stopA.position[1]) * eased,
    stopA.position[2] + (stopB.position[2] - stopA.position[2]) * eased
  );
  const target = new THREE.Vector3(
    stopA.target[0] + (stopB.target[0] - stopA.target[0]) * eased,
    stopA.target[1] + (stopB.target[1] - stopA.target[1]) * eased,
    stopA.target[2] + (stopB.target[2] - stopA.target[2]) * eased
  );
  const fov = lerpStopFov(stopA, stopB, t);

  // Which stop index are we closest to (for panel visibility)
  const activeStop = t < 0.5 ? i : i + 1;

  return { pos, target, fov, stopIndex: activeStop, segFraction: t };
}

export function buildScrollController(trackEl) {
  let fraction = 0;
  const updateFraction = () => {
    const el   = trackEl;
    const max  = el.scrollHeight - el.clientHeight;
    fraction   = max > 0 ? el.scrollTop / max : 0;
  };
  trackEl.addEventListener('scroll', updateFraction, { passive: true });
  return {
    getFraction: () => fraction,
    scrollToStop: (index) => {
      const el  = trackEl;
      const max = el.scrollHeight - el.clientHeight;
      el.scrollTo({ top: (index / (N - 1)) * max, behavior: 'smooth' });
    }
  };
}
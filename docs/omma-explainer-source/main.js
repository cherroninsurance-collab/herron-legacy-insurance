import * as THREE from 'three';
import { buildLights }  from './lights.js';
import { buildCareDevice, buildPaycheckDevice, buildHomeDevice, buildLegacyDevice, buildGround, animateDevices } from './devices.js';
import { getCameraState, buildScrollController } from './scroll.js';
import { updateUI, bindNavDots } from './ui.js';
import { SURFACE_FOG } from './palette.js';

// ── renderer ──────────────────────────────────────────────────────────────────
const container = document.getElementById('canvas-layer');
const renderer  = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.outputColorSpace   = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

// ── scene ─────────────────────────────────────────────────────────────────────
const scene  = new THREE.Scene();
scene.background = new THREE.Color(SURFACE_FOG.color);
scene.fog        = new THREE.Fog(SURFACE_FOG.color, SURFACE_FOG.near, SURFACE_FOG.far);

// ── camera ────────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 80);
camera.position.set(0, 1.6, 7.4);
camera.lookAt(0, 0.6, 0);

// ── lights + ground ───────────────────────────────────────────────────────────
buildLights(scene);
buildGround(scene);

// ── devices ───────────────────────────────────────────────────────────────────
const devices = {
  care:     buildCareDevice(scene),
  paycheck: buildPaycheckDevice(scene),
  home:     buildHomeDevice(scene),
  legacy:   buildLegacyDevice(scene)
};

// ── scroll controller ─────────────────────────────────────────────────────────
const trackEl    = document.getElementById('scroll-track');
const scroller   = buildScrollController(trackEl);
bindNavDots(scroller.scrollToStop);

// ── camera target (smoothed) ──────────────────────────────────────────────────
const camPos    = new THREE.Vector3(0, 1.6, 7.4);
const camTarget = new THREE.Vector3(0, 0.6, 0);

// ── animation loop ────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let lastStop = -1;

function animate() {
  const t    = clock.getElapsedTime();
  const frac = scroller.getFraction();

  const state = getCameraState(frac);

  // Smooth camera
  camPos.lerp(state.pos, 0.065);
  camTarget.lerp(state.target, 0.065);
  camera.position.copy(camPos);
  camera.lookAt(camTarget);

  // FOV
  if (Math.abs(camera.fov - state.fov) > 0.05) {
    camera.fov += (state.fov - camera.fov) * 0.06;
    camera.updateProjectionMatrix();
  }

  // Device animations
  animateDevices(devices, t);

  // UI
  updateUI(state.stopIndex);

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// ── resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
import * as THREE from 'three';
import { PALETTE } from './palette.js';

// ── shared materials ──────────────────────────────────────────────────────────
const M = {
  navy: new THREE.MeshStandardMaterial({ color: 0x122544, roughness: 0.25, metalness: 0.55 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xC8A24A, roughness: 0.18, metalness: 0.72 }),
  goldDeep: new THREE.MeshStandardMaterial({ color: 0x9C7A2E, roughness: 0.28, metalness: 0.65 }),
  ivory: new THREE.MeshStandardMaterial({ color: 0xF7F4EC, roughness: 0.55, metalness: 0.05 }),
  ivoryDeep: new THREE.MeshStandardMaterial({ color: 0xEFE9DC, roughness: 0.60, metalness: 0.02 }),
  slate: new THREE.MeshStandardMaterial({ color: 0x5A6A82, roughness: 0.40, metalness: 0.30 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xD0E4F7, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.22 }),
  risk:  new THREE.MeshStandardMaterial({ color: 0xB4553C, roughness: 0.35, metalness: 0.20 }),
};

// Helper: rounded-rect extrude
function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo( w / 2 - r, -h / 2);
  s.quadraticCurveTo( w / 2, -h / 2,  w / 2, -h / 2 + r);
  s.lineTo( w / 2,  h / 2 - r);
  s.quadraticCurveTo( w / 2,  h / 2,  w / 2 - r,  h / 2);
  s.lineTo(-w / 2 + r,  h / 2);
  s.quadraticCurveTo(-w / 2,  h / 2, -w / 2,  h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

// ── 1. CARE SHIELD ── a shield-shaped triptych panel ─────────────────────────
export function buildCareDevice(scene) {
  const group = new THREE.Group();
  group.name = 'device-care';

  // Shield body
  const shieldShape = new THREE.Shape();
  shieldShape.moveTo(0, 2.2);
  shieldShape.lineTo( 1.6, 1.4);
  shieldShape.lineTo( 1.6, -0.4);
  shieldShape.quadraticCurveTo( 1.6, -2.0,  0, -2.6);
  shieldShape.quadraticCurveTo(-1.6, -2.0, -1.6, -0.4);
  shieldShape.lineTo(-1.6,  1.4);
  shieldShape.closePath();

  const extSettings = { depth: 0.28, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 4 };
  const shieldGeo  = new THREE.ExtrudeGeometry(shieldShape, extSettings);
  const shieldMesh = new THREE.Mesh(shieldGeo, M.navy);
  shieldMesh.name = 'care-shield-body';
  shieldMesh.castShadow = true;
  shieldMesh.position.set(0, 0, 0);
  group.add(shieldMesh);

  // Gold border ring (slightly larger, flat)
  const borderShape = new THREE.Shape();
  borderShape.moveTo(0, 2.44);
  borderShape.lineTo( 1.78, 1.54);
  borderShape.lineTo( 1.78, -0.44);
  borderShape.quadraticCurveTo( 1.78, -2.20,  0, -2.84);
  borderShape.quadraticCurveTo(-1.78, -2.20, -1.78, -0.44);
  borderShape.lineTo(-1.78,  1.54);
  borderShape.closePath();
  const borderHole = new THREE.Path();
  borderHole.moveTo(0, 2.2);
  borderHole.lineTo( 1.6, 1.4);
  borderHole.lineTo( 1.6, -0.4);
  borderHole.quadraticCurveTo( 1.6, -2.0,  0, -2.6);
  borderHole.quadraticCurveTo(-1.6, -2.0, -1.6, -0.4);
  borderHole.lineTo(-1.6,  1.4);
  borderHole.closePath();
  borderShape.holes.push(borderHole);
  const borderGeo  = new THREE.ExtrudeGeometry(borderShape, { depth: 0.06, bevelEnabled: false });
  const borderMesh = new THREE.Mesh(borderGeo, M.gold);
  borderMesh.name = 'care-shield-border';
  borderMesh.position.z = 0.25;
  group.add(borderMesh);

  // Three gold bars = three jobs
  [-0.55, 0, 0.55].forEach((y, i) => {
    const barGeo  = new THREE.BoxGeometry(1.8, 0.12, 0.12);
    const barMesh = new THREE.Mesh(barGeo, i === 1 ? M.gold : M.goldDeep);
    barMesh.name  = `care-bar-${i}`;
    barMesh.position.set(0, y, 0.36);
    group.add(barMesh);
  });

  // Ivory inner glow plane
  const glowGeo  = new THREE.PlaneGeometry(2.4, 3.8);
  const glowMat  = new THREE.MeshStandardMaterial({ color: 0xFFF8E8, roughness: 1, metalness: 0, transparent: true, opacity: 0.06 });
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  glowMesh.name  = 'care-glow';
  glowMesh.position.set(0, -0.2, 0.32);
  group.add(glowMesh);

  group.position.set(0, 0.3, 0);
  scene.add(group);
  return group;
}

// ── 2. PAYCHECK SHIELD ── stacked income bars / bar-chart device ──────────────
export function buildPaycheckDevice(scene) {
  const group = new THREE.Group();
  group.name = 'device-paycheck';

  // Base platform
  const baseGeo  = new THREE.BoxGeometry(4.0, 0.18, 1.4);
  const baseMesh = new THREE.Mesh(baseGeo, M.ivoryDeep);
  baseMesh.name  = 'paycheck-base';
  baseMesh.receiveShadow = true;
  baseMesh.position.set(0, -1.6, 0);
  group.add(baseMesh);

  // Income bars (earnings by month, one is struck — disability month)
  const barData = [
    { h: 1.8, mat: M.navy,    x: -1.5 },
    { h: 1.8, mat: M.navy,    x: -0.9 },
    { h: 1.8, mat: M.navy,    x: -0.3 },
    { h: 0.4, mat: M.risk,    x:  0.3 }, // the disabled month
    { h: 1.4, mat: M.gold,    x:  0.9 }, // recovery — partial
    { h: 1.8, mat: M.gold,    x:  1.5 }, // back to full
  ];

  barData.forEach((b, i) => {
    const geo  = new THREE.BoxGeometry(0.42, b.h, 0.9);
    const mesh = new THREE.Mesh(geo, b.mat);
    mesh.name  = `paycheck-bar-${i}`;
    mesh.castShadow = true;
    mesh.position.set(b.x, -1.6 + b.h / 2 + 0.09, 0);
    group.add(mesh);
  });

  // Diagonal "shield" slash over the gap bar
  const slashGeo  = new THREE.BoxGeometry(0.08, 1.1, 0.92);
  const slashMesh = new THREE.Mesh(slashGeo, M.gold);
  slashMesh.name  = 'paycheck-slash';
  slashMesh.rotation.z = Math.PI / 5;
  slashMesh.position.set(0.3, -1.1, 0);
  group.add(slashMesh);

  // Label rail
  const railGeo  = new THREE.BoxGeometry(4.0, 0.04, 0.08);
  const railMesh = new THREE.Mesh(railGeo, M.gold);
  railMesh.name  = 'paycheck-rail';
  railMesh.position.set(0, -1.52, 0.69);
  group.add(railMesh);

  group.position.set(6.2, 0.3, 0);
  scene.add(group);
  return group;
}

// ── 3. HOME SHIELD ── house silhouette with shield overlay ───────────────────
export function buildHomeDevice(scene) {
  const group = new THREE.Group();
  group.name = 'device-home';

  // House walls (box)
  const wallsGeo  = new THREE.BoxGeometry(2.6, 1.8, 1.2);
  const wallsMesh = new THREE.Mesh(wallsGeo, M.ivory);
  wallsMesh.name  = 'home-walls';
  wallsMesh.castShadow = true;
  wallsMesh.position.set(0, -0.5, 0);
  group.add(wallsMesh);

  // Roof (prism via CylinderGeometry r=0 top)
  const roofGeo  = new THREE.CylinderGeometry(0, 1.85, 1.2, 4, 1);
  const roofMesh = new THREE.Mesh(roofGeo, M.navy);
  roofMesh.name  = 'home-roof';
  roofMesh.castShadow = true;
  roofMesh.rotation.y = Math.PI / 4;
  roofMesh.position.set(0, 0.7, 0);
  group.add(roofMesh);

  // Door
  const doorGeo  = new THREE.BoxGeometry(0.42, 0.68, 0.08);
  const doorMesh = new THREE.Mesh(doorGeo, M.navyMid || M.slate);
  doorMesh.name  = 'home-door';
  doorMesh.position.set(0, -1.06, 0.64);
  group.add(doorMesh);

  // Window left
  const winL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.08), M.glass);
  winL.name  = 'home-win-left';
  winL.position.set(-0.72, -0.38, 0.64);
  group.add(winL);

  // Window right
  const winR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.08), M.glass);
  winR.name  = 'home-win-right';
  winR.position.set( 0.72, -0.38, 0.64);
  group.add(winR);

  // Shield overlay — semi-transparent gold
  const shieldShape = new THREE.Shape();
  shieldShape.moveTo(0, 1.5);
  shieldShape.lineTo( 1.1,  0.9);
  shieldShape.lineTo( 1.1, -0.2);
  shieldShape.quadraticCurveTo( 1.1, -1.4,  0, -1.8);
  shieldShape.quadraticCurveTo(-1.1, -1.4, -1.1, -0.2);
  shieldShape.lineTo(-1.1,  0.9);
  shieldShape.closePath();

  const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, { depth: 0.06, bevelEnabled: false });
  const shieldMat = new THREE.MeshStandardMaterial({ color: 0xC8A24A, roughness: 0.2, metalness: 0.6, transparent: true, opacity: 0.38 });
  const shieldMesh= new THREE.Mesh(shieldGeo, shieldMat);
  shieldMesh.name = 'home-shield-overlay';
  shieldMesh.position.set(-0.55, 0.0, 0.68);
  group.add(shieldMesh);

  // Check mark in shield
  const checkMat  = new THREE.MeshStandardMaterial({ color: 0xC8A24A, roughness: 0.2, metalness: 0.7 });
  const checkGeo  = new THREE.BoxGeometry(0.08, 0.55, 0.08);
  const checkStem = new THREE.Mesh(checkGeo, checkMat);
  checkStem.name  = 'home-check-stem';
  checkStem.rotation.z = -0.55;
  checkStem.position.set(-0.73, -0.3, 0.78);
  group.add(checkStem);

  const checkArmGeo  = new THREE.BoxGeometry(0.08, 0.9, 0.08);
  const checkArm     = new THREE.Mesh(checkArmGeo, checkMat);
  checkArm.name      = 'home-check-arm';
  checkArm.rotation.z = 0.62;
  checkArm.position.set(-0.45, -0.06, 0.78);
  group.add(checkArm);

  group.position.set(11.4, 0.3, 0);
  scene.add(group);
  return group;
}

// ── 4. LEGACY SHIELD ── tall monument / obelisk with orbiting ring ────────────
export function buildLegacyDevice(scene) {
  const group = new THREE.Group();
  group.name = 'device-legacy';

  // Pedestal
  const pedGeo  = new THREE.CylinderGeometry(1.0, 1.2, 0.28, 32);
  const pedMesh = new THREE.Mesh(pedGeo, M.ivoryDeep);
  pedMesh.name  = 'legacy-pedestal';
  pedMesh.receiveShadow = true;
  pedMesh.position.set(0, -1.7, 0);
  group.add(pedMesh);

  // Column shaft
  const colGeo  = new THREE.CylinderGeometry(0.38, 0.44, 3.2, 32);
  const colMesh = new THREE.Mesh(colGeo, M.navy);
  colMesh.name  = 'legacy-column';
  colMesh.castShadow = true;
  colMesh.position.set(0, 0, 0);
  group.add(colMesh);

  // Capital (top block)
  const capGeo  = new THREE.BoxGeometry(0.9, 0.22, 0.9);
  const capMesh = new THREE.Mesh(capGeo, M.gold);
  capMesh.name  = 'legacy-capital';
  capMesh.position.set(0, 1.71, 0);
  group.add(capMesh);

  // Apex pyramid
  const apexGeo  = new THREE.CylinderGeometry(0, 0.45, 0.7, 4, 1);
  const apexMesh = new THREE.Mesh(apexGeo, M.gold);
  apexMesh.name  = 'legacy-apex';
  apexMesh.castShadow = true;
  apexMesh.rotation.y = Math.PI / 4;
  apexMesh.position.set(0, 2.21, 0);
  group.add(apexMesh);

  // Orbiting ring
  const ringGeo  = new THREE.TorusGeometry(1.1, 0.055, 16, 80);
  const ringMesh = new THREE.Mesh(ringGeo, M.gold);
  ringMesh.name  = 'legacy-ring';
  ringMesh.rotation.x = Math.PI / 2.4;
  ringMesh.position.set(0, 0.2, 0);
  group.add(ringMesh);

  // Small gold orb on ring
  const orbGeo  = new THREE.SphereGeometry(0.12, 16, 16);
  const orbMesh = new THREE.Mesh(orbGeo, M.goldDeep);
  orbMesh.name  = 'legacy-orb';
  orbMesh.position.set(1.1, 0.2, 0);
  group.add(orbMesh);

  group.position.set(17.2, 0.3, 0);
  scene.add(group);
  return group;

}

// ── Ground plane ──────────────────────────────────────────────────────────────
export function buildGround(scene) {
  const geo  = new THREE.PlaneGeometry(60, 20);
  const mat  = new THREE.MeshStandardMaterial({ color: 0xEFE9DC, roughness: 0.85, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name  = 'ground';
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -1.72;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// ── Per-frame animation ───────────────────────────────────────────────────────
export function animateDevices(devices, t) {
  // Care Shield: gentle bob + slow rotate
  if (devices.care) {
    devices.care.rotation.y = Math.sin(t * 0.4) * 0.18;
    devices.care.position.y = 0.3 + Math.sin(t * 0.6) * 0.07;
  }
  // Paycheck: slight tilt — urgency
  if (devices.paycheck) {
    devices.paycheck.rotation.z = Math.sin(t * 0.5) * 0.025;
    devices.paycheck.rotation.y = Math.sin(t * 0.35) * 0.12;
  }
  // Home: slow proud sway
  if (devices.home) {
    devices.home.rotation.y = Math.sin(t * 0.3) * 0.14;
    devices.home.position.y = 0.3 + Math.sin(t * 0.5) * 0.05;
  }
  // Legacy: ring orbit + apex spin
  if (devices.legacy) {
    devices.legacy.rotation.y = t * 0.15;
    const ring = devices.legacy.getObjectByName('legacy-ring');
    const orb  = devices.legacy.getObjectByName('legacy-orb');
    if (ring) ring.rotation.z = t * 0.6;
    if (orb) {
      orb.position.x = Math.cos(t * 0.8) * 1.1;
      orb.position.z = Math.sin(t * 0.8) * 1.1;
      orb.position.y = 0.2 + Math.sin(t * 0.8) * 0.35;
    }
  }
}
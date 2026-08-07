import * as THREE from 'three';

export function buildLights(scene) {
  // Ambient — soft ivory fill
  const ambient = new THREE.AmbientLight(0xF7F4EC, 0.7);
  ambient.name = 'ambientLight';
  scene.add(ambient);

  // Primary directional — warm gold-white from upper-left
  const key = new THREE.DirectionalLight(0xFFF5DC, 1.6);
  key.name = 'keyLight';
  key.position.set(-6, 10, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far  = 60;
  key.shadow.camera.left   = -20;
  key.shadow.camera.right  =  20;
  key.shadow.camera.top    =  10;
  key.shadow.camera.bottom = -10;
  key.shadow.bias       = -0.001;
  key.shadow.normalBias =  0.02;
  scene.add(key);

  // Rim — cool navy blue from behind
  const rim = new THREE.DirectionalLight(0xC8D8F0, 0.5);
  rim.name = 'rimLight';
  rim.position.set(10, 4, -8);
  scene.add(rim);

  // Ground bounce — very subtle warm fill from below
  const bounce = new THREE.DirectionalLight(0xE3C476, 0.18);
  bounce.name = 'bounceLight';
  bounce.position.set(0, -6, 4);
  scene.add(bounce);

  return { ambient, key, rim, bounce };
}
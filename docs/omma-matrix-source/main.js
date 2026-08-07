import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { initUI, ptr } from './ui.js';
import { initChart } from './chart.js';

/* ============================================================
   PROCEDURAL ENVIRONMENT CUBE MAP (code-built, no assets)
   ============================================================ */
function buildEnvCube() {
  const S = 256;
  const faces = [];
  const cfg = [
    { top: '#FFF6E2', bot: '#E7D6AE', blob: ['#FFFFFF', 0.55, 0.30, 0.34] },
    { top: '#EAF1FB', bot: '#CFDCF0', blob: ['#FFFFFF', 0.40, 0.62, 0.22] },
    { top: '#FFFFFF', bot: '#FFF3D8', blob: ['#FFFDF4', 0.50, 0.50, 0.46] },
    { top: '#F0EDE4', bot: '#DAD5C6', blob: null },
    { top: '#FFF9EC', bot: '#EADFC2', blob: ['#FFFFFF', 0.62, 0.40, 0.26] },
    { top: '#EDF2FA', bot: '#D6E0F2', blob: null }
  ];
  for (const c of cfg) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const g = cv.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, S);
    grd.addColorStop(0, c.top);
    grd.addColorStop(1, c.bot);
    g.fillStyle = grd;
    g.fillRect(0, 0, S, S);
    if (c.blob) {
      const col = c.blob[0], cx = c.blob[1], cy = c.blob[2], r = c.blob[3];
      const rg = g.createRadialGradient(cx * S, cy * S, 0, cx * S, cy * S, r * S);
      rg.addColorStop(0, col);
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, S, S);
    }
    faces.push(cv);
  }
  const tex = new THREE.CubeTexture(faces);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/* ============================================================
   DISPERSIVE GLASS SHADER - 3-sample RGB IOR split
   ============================================================ */
const DispersionShader = {
  uniforms: {
    envMap: { value: null },
    iorR: { value: 1.44 },
    iorG: { value: 1.48 },
    iorB: { value: 1.53 },
    fresnelPow: { value: 3.0 },
    tint: { value: new THREE.Color(0xF7F2E4) }
  },
  vertexShader: `
    varying vec3 vWorldNormal;
    varying vec3 vViewDir;
    void main(){
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      vViewDir = normalize(wp.xyz - cameraPosition);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: `
    uniform samplerCube envMap;
    uniform float iorR;
    uniform float iorG;
    uniform float iorB;
    uniform float fresnelPow;
    uniform vec3 tint;
    varying vec3 vWorldNormal;
    varying vec3 vViewDir;
    void main(){
      vec3 N = normalize(vWorldNormal);
      vec3 V = normalize(vViewDir);
      vec3 rR = refract(V, N, 1.0 / iorR);
      vec3 rG = refract(V, N, 1.0 / iorG);
      vec3 rB = refract(V, N, 1.0 / iorB);
      float r = textureCube(envMap, rR).r;
      float g = textureCube(envMap, rG).g;
      float b = textureCube(envMap, rB).b;
      vec3 refr = vec3(r, g, b) * tint;
      vec3 refl = textureCube(envMap, reflect(V, N)).rgb;
      float f = pow(1.0 - max(dot(-V, N), 0.0), fresnelPow);
      vec3 col = mix(refr, refl, clamp(f * 1.35, 0.0, 1.0));
      col += vec3(1.0, 0.94, 0.80) * f * 0.55;
      gl_FragColor = vec4(col, 1.0);
    }`
};

/* edge-weighted chromatic aberration */
const EdgeCAShader = {
  uniforms: { tDiffuse: { value: null }, amount: { value: 0.0016 } },
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float amount;
    varying vec2 vUv;
    void main(){
      vec2 d = vUv - 0.5;
      float e = dot(d, d) * 2.2;
      vec2 off = d * amount * e * 60.0;
      float r = texture2D(tDiffuse, vUv + off).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - off).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }`
};

/* ============================================================
   HERO - glass shield, reflective floor, post chain
   ============================================================ */
function initHero(canvas) {
  const stage = canvas.parentElement;
  const W = () => stage.clientWidth || 800;
  const H = () => stage.clientHeight || 340;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(W(), H(), false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, W() / H(), 0.1, 100);
  camera.position.set(0, 1.15, 5.4);
  camera.name = 'heroCamera';

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 3.4;
  controls.maxDistance = 8;
  controls.maxPolarAngle = Math.PI * 0.56;
  controls.target.set(0, 0.85, 0);

  const envMap = buildEnvCube();
  scene.environment = envMap;

  scene.add(new THREE.HemisphereLight(0xFFF8E8, 0xDCD6C6, 1.5));
  const key = new THREE.DirectionalLight(0xFFF0D0, 2.1);
  key.position.set(3.2, 5.0, 3.4);
  key.name = 'heroKeyLight';
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xCFE0FF, 0.85);
  rim.position.set(-3.4, 2.0, -2.6);
  rim.name = 'heroRimLight';
  scene.add(rim);

  const sp = new THREE.Shape();
  sp.moveTo(0, 1.30);
  sp.bezierCurveTo(0.62, 1.24, 0.96, 1.06, 0.98, 0.86);
  sp.bezierCurveTo(1.00, 0.24, 0.86, -0.34, 0, -1.24);
  sp.bezierCurveTo(-0.86, -0.34, -1.00, 0.24, -0.98, 0.86);
  sp.bezierCurveTo(-0.96, 1.06, -0.62, 1.24, 0, 1.30);

  const shieldGeo = new THREE.ExtrudeGeometry(sp, {
    depth: 0.30, bevelEnabled: true, bevelThickness: 0.09,
    bevelSize: 0.09, bevelSegments: 6, curveSegments: 44
  });
  shieldGeo.center();
  shieldGeo.computeVertexNormals();

  const glassMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(DispersionShader.uniforms),
    vertexShader: DispersionShader.vertexShader,
    fragmentShader: DispersionShader.fragmentShader
  });
  glassMat.uniforms.envMap.value = envMap;

  const shield = new THREE.Mesh(shieldGeo, glassMat);
  shield.position.set(0, 0.95, 0);
  shield.name = 'glassShield';
  scene.add(shield);

  const coreMat = new THREE.MeshBasicMaterial({ color: 0xFFE9AE });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.20, 3), coreMat);
  core.position.copy(shield.position);
  core.name = 'shieldCore';
  scene.add(core);

  const ringMat = new THREE.MeshBasicMaterial({ color: 0xE8C87A });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.012, 8, 96), ringMat);
  ring.position.copy(shield.position);
  ring.rotation.x = Math.PI / 2.4;
  ring.name = 'shieldRing';
  scene.add(ring);

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xFDFAF2, roughness: 0.13, metalness: 0.42,
    envMap, envMapIntensity: 1.25
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 72), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.62;
  floor.name = 'reflectiveFloor';
  scene.add(floor);

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.75, 2.4, 80),
    new THREE.MeshBasicMaterial({ color: 0xE8D7A8, transparent: true, opacity: 0.30, side: THREE.DoubleSide })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.615;
  halo.name = 'floorHalo';
  scene.add(halo);

  const composer = new EffectComposer(renderer);
  composer.setSize(W(), H());
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(new THREE.Vector2(W(), H()), 0.62, 0.55, 0.92);
  composer.addPass(bloom);

  const bokeh = new BokehPass(scene, camera, { focus: 5.2, aperture: 0.00042, maxblur: 0.0075 });
  composer.addPass(bokeh);

  const ca = new ShaderPass(EdgeCAShader);
  composer.addPass(ca);
  composer.addPass(new OutputPass());

  let stress = 0;
  let stressTarget = 0;
  window.addEventListener('downturn', e => { stressTarget = e.detail ? 1 : 0; });

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();
    stress += (stressTarget - stress) * 0.05;

    shield.rotation.y = Math.sin(t * 0.32) * 0.42 + ptr.x * 0.30;
    shield.rotation.x = -0.06 + Math.sin(t * 0.24) * 0.06 - ptr.y * 0.14;
    shield.position.y = 0.95 + Math.sin(t * 0.7) * 0.045;

    core.position.y = shield.position.y;
    core.rotation.y = t * 0.5;
    ring.position.y = shield.position.y;
    ring.rotation.z = t * 0.35;

    glassMat.uniforms.iorR.value = 1.44 - stress * 0.05;
    glassMat.uniforms.iorB.value = 1.53 + stress * 0.07;
    coreMat.color.setHSL(0.11 - stress * 0.06, 0.85, 0.72);
    ca.uniforms.amount.value = 0.0016 + stress * 0.0022;

    controls.update();
    composer.render();
  });

  function resize() {
    const w = W();
    const h = H();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w, h);
  }
  window.addEventListener('resize', resize);
  resize();
}

/* ============================================================
   BOOT - each subsystem isolated
   ============================================================ */
try { initUI(); } catch (e) { console.error('UI init failed:', e); }

try {
  const canvas = document.getElementById('gl');
  if (canvas) initHero(canvas);
} catch (e) {
  console.error('Hero init failed:', e);
  const fb = document.getElementById('heroFallback');
  if (fb) fb.style.display = 'flex';
  const cv = document.getElementById('gl');
  if (cv) cv.style.display = 'none';
}

try {
  const host = document.getElementById('chartHost');
  if (host) initChart(host);
} catch (e) { console.error('Chart init failed:', e); }
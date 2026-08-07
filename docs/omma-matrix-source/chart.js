import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ptr } from './ui.js';

/* inline JSON data source */
const SERIES = [
  { year: 2005, index: 3.0, credit: 3.0 },
  { year: 2006, index: 13.6, credit: 10.0 },
  { year: 2007, index: 3.5, credit: 3.5 },
  { year: 2008, index: -38.5, credit: 0.0 },
  { year: 2009, index: 23.5, credit: 10.0 },
  { year: 2010, index: 12.8, credit: 10.0 },
  { year: 2011, index: 0.0, credit: 0.0 },
  { year: 2012, index: 13.4, credit: 10.0 },
  { year: 2013, index: 29.6, credit: 10.0 },
  { year: 2014, index: 11.4, credit: 10.0 },
  { year: 2015, index: -0.7, credit: 0.0 },
  { year: 2016, index: 9.5, credit: 9.5 },
  { year: 2017, index: 19.4, credit: 10.0 },
  { year: 2018, index: -6.2, credit: 0.0 },
  { year: 2019, index: 28.9, credit: 10.0 },
  { year: 2020, index: 16.3, credit: 10.0 },
  { year: 2021, index: 26.9, credit: 10.0 },
  { year: 2022, index: -19.4, credit: 0.0 },
  { year: 2023, index: 24.2, credit: 10.0 },
  { year: 2024, index: 23.3, credit: 10.0 }
];

const FILTERS = {
  all: d => d,
  down: d => d.filter(x => x.index < 0),
  up: d => d.filter(x => x.index > 0),
  recent: d => d.filter(x => x.year >= 2015)
};

export function initChart(host) {
  const W = () => host.clientWidth || 800;
  const H = () => host.clientHeight || 380;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(W(), H(), false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, W() / H(), 0.1, 200);
  camera.position.set(9.5, 8.2, 12.5);
  camera.name = 'chartCamera';

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 9;
  controls.maxDistance = 26;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.target.set(0, 0.6, 0);

  scene.add(new THREE.HemisphereLight(0xFFFBF0, 0xE4DECE, 1.35));
  const sun = new THREE.DirectionalLight(0xFFF3DA, 1.9);
  sun.position.set(7, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 14;
  sun.shadow.camera.bottom = -14;
  sun.shadow.bias = -0.001;
  sun.shadow.normalBias = 0.02;
  sun.name = 'chartSun';
  scene.add(sun);

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 18),
    new THREE.MeshLambertMaterial({ color: 0xFBF7EC })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  plane.name = 'chartPlane';
  scene.add(plane);

  const grid = new THREE.GridHelper(30, 30, 0xE0D8C4, 0xEFEADC);
  grid.position.y = 0.002;
  grid.name = 'chartGrid';
  scene.add(grid);

  /* extruded bar profile (rounded top) built from a Shape */
  const prof = new THREE.Shape();
  const bw = 0.34;
  const br = 0.07;
  prof.moveTo(-bw, 0);
  prof.lineTo(bw, 0);
  prof.lineTo(bw, 1 - br);
  prof.quadraticCurveTo(bw, 1, bw - br, 1);
  prof.lineTo(-bw + br, 1);
  prof.quadraticCurveTo(-bw, 1, -bw, 1 - br);
  prof.closePath();

  const barGeo = new THREE.ExtrudeGeometry(prof, {
    depth: 0.62, bevelEnabled: true, bevelThickness: 0.035,
    bevelSize: 0.035, bevelSegments: 2, curveSegments: 6
  });
  barGeo.translate(0, 0, -0.31);

  const matGold = new THREE.MeshStandardMaterial({ color: 0xB8912F, roughness: 0.34, metalness: 0.55 });
  const matGrey = new THREE.MeshStandardMaterial({ color: 0x98A2B8, roughness: 0.62, metalness: 0.10 });
  const matNeg = new THREE.MeshStandardMaterial({ color: 0xC4675C, roughness: 0.58, metalness: 0.10 });

  const field = new THREE.Group();
  field.name = 'barField';
  scene.add(field);

  let bars = [];

  function build(key) {
    while (field.children.length) {
      field.remove(field.children[0]);
    }
    bars = [];
    const data = (FILTERS[key] || FILTERS.all)(SERIES);
    const n = Math.max(data.length, 1);
    const step = Math.min(1.15, 22 / n);
    const x0 = -((n - 1) * step) / 2;

    data.forEach((d, i) => {
      const x = x0 + i * step;

      const a = new THREE.Mesh(barGeo, matGold);
      a.position.set(x, 0, -1.5);
      a.scale.set(step / 1.15, 0.001, 1);
      a.castShadow = true;
      a.name = 'barCredit' + d.year;
      a.userData.h = Math.max(d.credit, 0.12) * 0.28;
      field.add(a);
      bars.push(a);

      const neg = d.index < 0;
      const b = new THREE.Mesh(barGeo, neg ? matNeg : matGrey);
      b.position.set(x, 0, 1.5);
      b.scale.set(step / 1.15, 0.001, 1);
      b.castShadow = true;
      b.name = 'barIndex' + d.year;
      b.userData.h = Math.max(Math.abs(d.index), 0.12) * 0.28;
      b.userData.neg = neg;
      field.add(b);
      bars.push(b);
    });
  }

  let grow = 0;
  function rebuild(key) {
    build(key);
    grow = 0;
  }
  rebuild('all');

  const chips = Array.from(document.querySelectorAll('#filterBar .chip'));
  chips.forEach(c => c.addEventListener('click', () => {
    chips.forEach(x => x.classList.toggle('is-active', x === c));
    rebuild(c.dataset.filter);
  }));

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    grow = Math.min(1, grow + dt * 1.25);
    const e = 1 - Math.pow(1 - grow, 3);
    bars.forEach((b, i) => {
      const stagger = Math.min(1, Math.max(0, e * 1.5 - i * 0.012));
      const h = b.userData.h * stagger;
      b.scale.y = Math.max(h, 0.001);
      b.position.y = b.userData.neg ? -h : 0;
    });
    field.rotation.y = ptr.x * 0.12;
    controls.update();
    renderer.render(scene, camera);
  });

  function resize() {
    const w = W();
    const h = H();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('panelchange', () => setTimeout(resize, 60));
  resize();
}
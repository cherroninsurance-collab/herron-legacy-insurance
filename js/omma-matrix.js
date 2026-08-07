/* ============================================================================
   WEALTH SHIELD MATRIX — the bucket scene, in real 3D
   ----------------------------------------------------------------------------
   WHAT THIS REPLACES
   The flagship demonstration of the whole tool — a market downturn draining the
   unshielded bucket while the shielded one holds — shipped as an SVG rectangle
   whose height transitioned, captioned by three literal emoji (a storm cloud
   sequence) and a "-40%" with a downward-chart emoji. On a page arguing for a
   six-figure financial product that undercuts every word around it.

   This mounts the same device the homepage tool pane uses: two glass columns,
   a brass shield cage around the protected one, and a market line that dives
   through both. When the downturn runs, the unshielded column drains and the
   shielded one holds — the argument, shown rather than captioned.

   HOW IT STAYS SAFE
   The page's own logic is untouched. The original SVG and its elements stay in
   the DOM (hidden) so every existing line that pokes #unshielded-water,
   #storm-loss or #storm-caption keeps working exactly as written. This module
   only READS the state the page has already set — the same decoupled pattern
   the homepage uses against the estimate studio — so no number, caption or
   disclosure depends on it. If WebGL is unavailable the CSS fallback restores
   the original SVG and the tool behaves as it always did.
   ========================================================================== */
import * as THREE from '../vendor/three.module.min.js';

(function () {
  'use strict';

  var host = document.getElementById('ommaBucket');
  if (!host) return;

  var REDUCE = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var lowMem = navigator.deviceMemory && navigator.deviceMemory <= 2;
  if (REDUCE || lowMem) return;                    /* CSS keeps the SVG visible */

  try {
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
    document.documentElement.classList.add('omma-bucket-on');   /* hides the SVG */
  } catch (e) {
    return;                                        /* no context — SVG stays */
  }

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(42, 2, 0.1, 60);
  scene.add(new THREE.AmbientLight(0xFFFFFF, 1.1));
  scene.add(new THREE.HemisphereLight(0xFFFFFF, 0xD9E2F2, 0.85));
  var key = new THREE.DirectionalLight(0xFFF0D2, 2.1); key.position.set(4, 6, 6); scene.add(key);
  var fill = new THREE.DirectionalLight(0xD9E4FA, 1.1); fill.position.set(-5, -1, -4); scene.add(fill);
  var rig = new THREE.Group(); scene.add(rig);

  /* --- two columns of value ------------------------------------------- */
  var cols = [];
  [0, 1].forEach(function (i) {
    var g = new THREE.Group();
    var tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.86, 0.86, 3.6, 44, 1, true),
      new THREE.MeshPhysicalMaterial({
        color: 0xF6F8FC, roughness: 0.1, metalness: 0.08,
        transparent: true, opacity: 0.30, clearcoat: 1
      }));
    g.add(tube);
    /* rim rings, not EdgesGeometry — on an open cylinder that draws every
       facet seam and reads as a barcode */
    [-1.8, 1.8].forEach(function (y) {
      var rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.86, 0.019, 8, 60),
        new THREE.MeshBasicMaterial({ color: 0x0E1F3E, transparent: true, opacity: 0.42 }));
      rim.rotation.x = Math.PI / 2; rim.position.y = y; g.add(rim);
    });
    var fillMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.79, 0.79, 1, 44),
      new THREE.MeshStandardMaterial({
        color: i === 0 ? 0xE0BE79 : 0x9AA8C0,
        emissive: i === 0 ? 0xBE9235 : 0x64748B,
        emissiveIntensity: i === 0 ? 0.34 : 0.12,
        metalness: 0.16, roughness: 0.28
      }));
    g.add(fillMesh);
    g.position.x = i === 0 ? -1.55 : 1.55;
    rig.add(g);
    cols.push({ fill: fillMesh, level: 0.78, target: 0.78, shielded: i === 0 });
  });

  /* --- the shield cage over the protected column ----------------------- */
  var shield = new THREE.Group();
  for (var i = 0; i < 3; i++) {
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.14, 0.028, 8, 90),
      new THREE.MeshBasicMaterial({ color: 0xBE9235, transparent: true, opacity: 0.72 - i * 0.14 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.1 + i * 1.1;
    shield.add(ring);
  }
  shield.position.x = -1.55;
  rig.add(shield);

  /* --- the market line running behind both ----------------------------- */
  var PTS = 96;
  var lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PTS * 3), 3));
  var line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
    color: 0x4C7EE8, transparent: true, opacity: 0.55 }));
  line.position.z = -1.9;
  rig.add(line);

  /* --- read the page's own state; never write to it -------------------- */
  var lossEl = document.getElementById('storm-loss');
  function stormOn() {
    return !!lossEl && parseFloat(lossEl.getAttribute('opacity') || '0') > 0.5;
  }

  var crash = 0, W = 0, H = 0;
  function resize() {
    var w = host.clientWidth, h = host.clientHeight;
    if (w === W && h === H) return;
    W = w; H = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    /* frame from HALF-extents: the rig is ~5.4 wide and ~4 tall */
    var tan = Math.tan(42 * Math.PI / 360);
    camera.position.set(0, 0.9, Math.max(3.0 / (tan * camera.aspect), 2.3 / tan) + 0.6);
    camera.lookAt(0, 0, 0);
  }

  var visible = true;
  new IntersectionObserver(function (es) {
    es.forEach(function (e) { visible = e.isIntersecting; });
  }, { rootMargin: '120px' }).observe(host);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) visible = false;
  });

  var last = performance.now();
  (function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min((now - last) / 1000, 0.05), t = now / 1000;
    last = now;
    if (!visible || !host.clientWidth) return;
    resize();

    crash += ((stormOn() ? 1 : 0) - crash) * (1 - Math.exp(-2.6 * dt));

    cols.forEach(function (c) {
      /* the shielded column holds its floor; the other one drains */
      c.target = c.shielded ? 0.78 : 0.78 - crash * 0.52;
      c.level += (c.target - c.level) * (1 - Math.exp(-3.2 * dt));
      var h = Math.max(0.04, c.level * 3.4);
      c.fill.scale.y = h;
      c.fill.position.y = -1.8 + h / 2;
    });

    shield.rotation.y += dt * 0.5;
    shield.children.forEach(function (s, i) {
      s.material.opacity = (0.72 - i * 0.14) * (0.7 + 0.3 * Math.sin(t * 2 + i)) + crash * 0.24;
    });

    var arr = lineGeo.attributes.position.array;
    for (var i = 0; i < PTS; i++) {
      var ph = i / (PTS - 1);
      var x = -3.6 + ph * 7.2;
      var dip = (ph > 0.35 && ph < 0.78)
        ? Math.max(0, Math.sin((ph - 0.35) * Math.PI / 0.43)) : 0;
      arr[i * 3] = x;
      arr[i * 3 + 1] = 1.0 + Math.sin(ph * 15 + t * 0.7) * 0.12 + ph * 0.45 - dip * 2.1 * crash;
      arr[i * 3 + 2] = 0;
    }
    lineGeo.attributes.position.needsUpdate = true;

    rig.rotation.y = Math.sin(t * 0.13) * 0.10;
    renderer.render(scene, camera);
  })(last);
})();

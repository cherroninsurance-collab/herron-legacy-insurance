/* ============================================================================
   THE FLOOR FIELD — the FIA ratchet chart as a real 3D bar field
   ----------------------------------------------------------------------------
   WHAT THIS REPLACES
   The "your value never declines" argument — the centrepiece of the annuity
   tab — was a flat 380x240 SVG with two polylines. Accurate, and completely
   forgettable. This is the Omma bar-field technique from the third export
   (docs/omma-matrix-source/chart.js), rebuilt bright and put where it earns
   its keep: eleven year-pairs as extruded metal, the market row dipping red
   in down years while the shielded row ratchets and holds.

   WHAT IT KEEPS FROM THE EXPORT
     • one rounded-top profile, extruded once, shared by every bar
     • spacing computed from the row count, so filters re-spread the field
     • staggered scale-Y grow on every rebuild — geometry is never rebuilt
       per frame
   WHAT IT ADDS
     • filter chips (all / down / up years) in the page's own control language
     • hover: pointer x → year pair lifts, tooltip shows both values
     • drag to yaw the field a little — enough parallax to read the depth
     • the site's canvas-gradient environment cube, so the gold is metal
   WHAT IT REFUSES
     • OrbitControls (not vendored, and a free camera on a chart is noise)
     • shadow maps (the export ran one at 1024² for a soft blob — not worth
       a whole render pass on a page that already runs the bucket scene)
     • any number the SVG did not already show: same data, same indexing,
       same "hypothetical — not any actual index" status

   FALLBACK: the original SVG stays in the DOM and is only hidden after a
   context is created AND the first frame has actually rendered. No WebGL,
   reduced motion, low memory — the page is exactly what it was before.
   ========================================================================== */
import * as THREE from '../vendor/three.module.min.js';

(function () {
  'use strict';

  var host = document.getElementById('floorchart');
  if (!host) return;

  var REDUCE = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var MOBILE = matchMedia('(pointer:coarse)').matches;
  var lowMem = navigator.deviceMemory && navigator.deviceMemory <= (MOBILE ? 4 : 2);
  if (REDUCE || lowMem) return;

  /* the SVG renderer owns the data; wait for it (it runs in the page's IIFE
     after DOMContentLoaded, this module is an async module script) */
  function start() {
    var D = window.__floorData;
    if (!D) { setTimeout(start, 120); return; }
    build(D);
  }

  function build(D) {
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !MOBILE, alpha: true });
    } catch (e) { return; }
    renderer.setPixelRatio(MOBILE ? 1 : Math.min(devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    /* ------------------------------------------------------------- stage -- */
    var stage = document.createElement('div');
    stage.className = 'fld-stage';
    stage.style.cssText = 'position:relative;width:100%;aspect-ratio:38/24;cursor:grab';
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
    stage.appendChild(renderer.domElement);

    /* chips — the page's own segmented-control language */
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:6px;justify-content:center;margin:2px 0 10px';
    var CHIPS = [['all', 'All years'], ['down', 'Down years'], ['up', 'Up years']];
    var chipEls = CHIPS.map(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = c[1];
      b.dataset.k = c[0];
      b.className = 'fld-chip' + (i === 0 ? ' on' : '');
      bar.appendChild(b);
      return b;
    });

    var tip = document.createElement('div');
    tip.className = 'fld-tip';
    tip.style.display = 'none';
    stage.appendChild(tip);

    var css = document.createElement('style');
    css.textContent =
      '.fld-chip{border:1px solid rgba(14,31,62,.16);background:rgba(255,255,255,.7);' +
      'color:#5A6A8C;border-radius:999px;padding:5px 13px;font:600 11.5px Inter,sans-serif;' +
      'cursor:pointer;transition:.16s}' +
      '.fld-chip:hover{color:#0E1F3E;border-color:rgba(176,126,34,.5)}' +
      '.fld-chip.on{background:linear-gradient(135deg,#B07E22,#8A5F10);color:#fff;border-color:transparent}' +
      '.fld-tip{position:absolute;top:8px;left:50%;transform:translateX(-50%);pointer-events:none;' +
      'background:rgba(14,31,62,.92);color:#EAF0FA;border:1px solid rgba(224,190,121,.35);' +
      'border-radius:10px;padding:8px 12px;font:500 11.5px Inter,sans-serif;line-height:1.5;' +
      'white-space:nowrap;box-shadow:0 10px 30px rgba(14,31,62,.25)}' +
      '.fld-tip b{font-weight:700}' +
      '.omma-fchart-on #floorchart > svg, .omma-fchart-on #floorsvg{display:none}';
    document.head.appendChild(css);

    host.insertAdjacentElement('beforebegin', bar);
    host.appendChild(stage);

    /* ------------------------------------------------------------- scene -- */
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(34, 38 / 24, 0.1, 80);

    /* the canvas-gradient environment — same room as the rest of the site */
    (function env() {
      var S = 128, GAIN = 0.72;
      function dim(hex, k) {
        var n = parseInt(hex.slice(1), 16);
        return 'rgb(' + Math.round(((n >> 16) & 255) * k) + ',' +
          Math.round(((n >> 8) & 255) * k) + ',' + Math.round((n & 255) * k) + ')';
      }
      var cfg = [
        ['#FFF6E2', '#E7D6AE'], ['#EAF1FB', '#CFDCF0'], ['#FFFFFF', '#FFF3D8'],
        ['#F0EDE4', '#DAD5C6'], ['#FFF9EC', '#EADFC2'], ['#EDF2FA', '#D6E0F2']
      ];
      var faces = cfg.map(function (c) {
        var cv = document.createElement('canvas');
        cv.width = cv.height = S;
        var g = cv.getContext('2d');
        var gr = g.createLinearGradient(0, 0, 0, S);
        gr.addColorStop(0, dim(c[0], GAIN)); gr.addColorStop(1, dim(c[1], GAIN));
        g.fillStyle = gr; g.fillRect(0, 0, S, S);
        return cv;
      });
      var tex = new THREE.CubeTexture(faces);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      scene.environment = tex;
    })();

    scene.add(new THREE.AmbientLight(0xFFF7EA, 0.8));
    var key = new THREE.DirectionalLight(0xFFF0D2, 1.7); key.position.set(-5, 9, 7); scene.add(key);
    var rim = new THREE.DirectionalLight(0xC8D8F0, 0.6); rim.position.set(7, 4, -6); scene.add(rim);

    /* plate + hairline grid, drawn as geometry so it sits IN the scene */
    var plate = new THREE.Mesh(
      new THREE.BoxGeometry(13.6, 0.22, 5.6),
      new THREE.MeshStandardMaterial({ color: 0xF6F7FA, roughness: 0.55, metalness: 0.06 }));
    plate.position.y = -0.11;
    scene.add(plate);
    var rim2 = new THREE.Mesh(
      new THREE.BoxGeometry(13.6, 0.05, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xBE9235, roughness: 0.3, metalness: 0.7 }));
    rim2.position.set(0, 0.02, 2.82); scene.add(rim2);
    var rim3 = rim2.clone(); rim3.position.z = -2.82; scene.add(rim3);

    /* one rounded-top profile for every bar (the export's trick) */
    var bw = 0.34, br = 0.08;
    var prof = new THREE.Shape();
    prof.moveTo(-bw, 0); prof.lineTo(bw, 0); prof.lineTo(bw, 1 - br);
    prof.quadraticCurveTo(bw, 1, bw - br, 1); prof.lineTo(-bw + br, 1);
    prof.quadraticCurveTo(-bw, 1, -bw, 1 - br); prof.closePath();
    var barGeo = new THREE.ExtrudeGeometry(prof, {
      depth: 0.7, bevelEnabled: true, bevelThickness: 0.04,
      bevelSize: 0.04, bevelSegments: 2, curveSegments: 5
    });
    barGeo.translate(0, 0, -0.35);

    var M = {
      gold: new THREE.MeshStandardMaterial({ color: 0xBE9235, roughness: 0.22, metalness: 0.85 }),
      goldLit: new THREE.MeshStandardMaterial({ color: 0xE0BE79, emissive: 0xBE9235, emissiveIntensity: 0.18, roughness: 0.2, metalness: 0.8 }),
      slate: new THREE.MeshStandardMaterial({ color: 0x8494B0, roughness: 0.5, metalness: 0.3 }),
      risk: new THREE.MeshStandardMaterial({ color: 0xA85B43, roughness: 0.42, metalness: 0.25 })
    };

    var field = new THREE.Group();
    scene.add(field);

    /* value → height. Indexed levels run 85..185; floor the bars at the plate */
    var vh = function (v) { return (v - 82) * 0.030; };

    var bars = [], grow = 0, current = 'all';
    function rebuild(kind) {
      current = kind;
      while (field.children.length) field.remove(field.children[0]);
      bars = [];
      var idx = [];
      for (var i = 0; i < D.fia.length; i++) {
        var isDown = D.down.indexOf(i) !== -1;
        if (kind === 'down' && !isDown) continue;
        if (kind === 'up' && isDown) continue;
        idx.push(i);
      }
      var n = Math.max(idx.length, 1);
      var step = Math.min(1.18, 12.2 / n);
      var x0 = -((n - 1) * step) / 2;
      idx.forEach(function (yr, i) {
        var x = x0 + i * step;
        var down = D.down.indexOf(yr) !== -1;

        var a = new THREE.Mesh(barGeo, down ? M.goldLit : M.gold);
        a.position.set(x, 0, 1.05);
        a.scale.set(step / 1.18, 0.001, 1);
        a.userData = { h: vh(D.fia[yr]), yr: yr, row: 'fia' };
        field.add(a); bars.push(a);

        var b = new THREE.Mesh(barGeo, down ? M.risk : M.slate);
        b.position.set(x, 0, -1.05);
        b.scale.set(step / 1.18, 0.001, 1);
        b.userData = { h: vh(D.market[yr]), yr: yr, row: 'mkt' };
        field.add(b); bars.push(b);
      });
      grow = 0;
    }
    rebuild('all');

    chipEls.forEach(function (c) {
      c.addEventListener('click', function () {
        chipEls.forEach(function (x) { x.classList.toggle('on', x === c); });
        rebuild(c.dataset.k);
      });
    });

    /* ------------------------------------------------- pointer: yaw + tip -- */
    var yaw = 0, yawT = 0, dragging = false, dragX = 0, hovered = -1;
    stage.addEventListener('pointerdown', function (e) {
      dragging = true; dragX = e.clientX; stage.style.cursor = 'grabbing';
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointerup', function (e) {
      dragging = false; stage.style.cursor = 'grab';
      try { stage.releasePointerCapture(e.pointerId); } catch (err) {}
    });
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      if (dragging) {
        yawT += (e.clientX - dragX) * 0.005;
        yawT = Math.max(-0.55, Math.min(0.55, yawT));
        dragX = e.clientX;
        return;
      }
      /* hover: map x to the nearest year pair */
      var nx = (e.clientX - r.left) / r.width;
      var vis = bars.filter(function (b) { return b.userData.row === 'fia'; });
      if (!vis.length) return;
      var i = Math.max(0, Math.min(vis.length - 1, Math.floor(nx * vis.length)));
      var yr = vis[i].userData.yr;
      if (yr !== hovered) {
        hovered = yr;
        var down = D.down.indexOf(yr) !== -1;
        tip.style.display = '';
        tip.innerHTML = 'Year ' + (yr + 1) + (down ? ' · <b style="color:#F0B9A6">down market</b>' : '') +
          '<br><span style="color:#F0DCA6">■</span> Shielded <b>' + D.fia[yr] + '</b>' +
          ' &nbsp;<span style="color:#AABBD4">■</span> Market <b>' + D.market[yr] + '</b>' +
          '<br><span style="opacity:.65">indexed to 100 · hypothetical</span>';
      }
    });
    stage.addEventListener('pointerleave', function () {
      hovered = -1; tip.style.display = 'none';
    });

    /* -------------------------------------------------------------- loop -- */
    var W = 0, H = 0, vis2 = true, acc = 0, STEP = MOBILE ? 1 / 24 : 0;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { vis2 = e.isIntersecting; });
    }, { rootMargin: '140px' }).observe(stage);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) vis2 = false;
    });

    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h || (w === W && h === H)) return;
      W = w; H = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    var clock = new THREE.Clock(), painted = false;
    renderer.setAnimationLoop(function () {
      var dt = Math.min(clock.getDelta(), 0.05);
      if (!vis2) return;
      if (STEP) { acc += dt; if (acc < STEP) return; dt = Math.min(acc, 0.05); acc = 0; }
      var t = clock.elapsedTime;
      resize();

      grow = Math.min(1, grow + dt * 1.4);
      var e = 1 - Math.pow(1 - grow, 3);
      bars.forEach(function (b, i) {
        var st = Math.min(1, Math.max(0, e * 1.6 - i * 0.02));
        var lift = (b.userData.yr === hovered) ? 1.06 : 1;
        b.scale.y = Math.max(b.userData.h * st * lift, 0.001);
      });

      yaw += (yawT - yaw) * (1 - Math.exp(-6 * dt));
      field.rotation.y = yaw + Math.sin(t * 0.14) * 0.05;
      plate.rotation.y = rim2.rotation.y = rim3.rotation.y = field.rotation.y;

      /* frame the 13.6-wide plate with margin at any aspect: distance from the
         HALF-width against the horizontal half-FOV, plus headroom */
      var halfW = 7.6;
      var hFov = Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect);
      var dist = halfW / Math.tan(hFov) + 1.5;
      camera.position.set(Math.sin(yaw * 0.4) * 2, dist * 0.42, dist);
      camera.lookAt(0, 1.1, 0);
      renderer.render(scene, camera);

      if (!painted) {
        painted = true;
        /* only now is it safe to retire the SVG */
        document.documentElement.classList.add('omma-fchart-on');
      }
    });
  }

  if (document.readyState === 'loading') {
    addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

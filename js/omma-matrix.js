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

  /* the site's canvas-gradient environment — metals reflect a warm studio
     instead of resolving to black, and the glass shield below has a room to
     refract. Gain baked into the colours (r161 has no environmentIntensity). */
  var ENV = (function () {
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
    return tex;
  })();
  scene.environment = ENV;

  scene.add(new THREE.AmbientLight(0xFFFFFF, 0.85));
  scene.add(new THREE.HemisphereLight(0xFFFFFF, 0xD9E2F2, 0.7));
  var key = new THREE.DirectionalLight(0xFFF0D2, 2.0); key.position.set(4, 6, 6); scene.add(key);
  var fill = new THREE.DirectionalLight(0xD9E4FA, 1.0); fill.position.set(-5, -1, -4); scene.add(fill);
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
        emissiveIntensity: i === 0 ? 0.22 : 0.08,
        metalness: i === 0 ? 0.72 : 0.4, roughness: 0.24
      }));
    g.add(fillMesh);
    g.position.x = i === 0 ? -1.55 : 1.55;
    rig.add(g);
    cols.push({ fill: fillMesh, level: 0.78, target: 0.78, shielded: i === 0 });
  });

  /* --- the glass shield over the protected column -----------------------
     The third Omma export's dispersion shader on the site's own shield
     outline: refraction sampled at three indices, one per colour channel, so
     the edges fringe the way real glass does. This is the flagship device on
     the page arguing for the product — it should look like the argument.
     Two brass rings remain as the top/bottom bands; the cage of three is gone. */
  var DISP = {
    uniforms: {
      envMap: { value: ENV },
      iorR: { value: 1.44 }, iorG: { value: 1.48 }, iorB: { value: 1.53 },
      fresnelPow: { value: 3.0 },
      tint: { value: new THREE.Color(0xF3EEDF) }
    },
    vertexShader: [
      'varying vec3 vWorldNormal;',
      'varying vec3 vViewDir;',
      'void main(){',
      '  vec4 wp = modelMatrix * vec4(position, 1.0);',
      '  vWorldNormal = normalize(mat3(modelMatrix) * normal);',
      '  vViewDir = normalize(wp.xyz - cameraPosition);',
      '  gl_Position = projectionMatrix * viewMatrix * wp;',
      '}'].join('\n'),
    fragmentShader: [
      'uniform samplerCube envMap;',
      'uniform float iorR, iorG, iorB, fresnelPow;',
      'uniform vec3 tint;',
      'varying vec3 vWorldNormal;',
      'varying vec3 vViewDir;',
      'void main(){',
      '  vec3 N = normalize(vWorldNormal);',
      '  vec3 V = normalize(vViewDir);',
      '  vec3 refr = vec3(',
      '    textureCube(envMap, refract(V, N, 1.0 / iorR)).r,',
      '    textureCube(envMap, refract(V, N, 1.0 / iorG)).g,',
      '    textureCube(envMap, refract(V, N, 1.0 / iorB)).b',
      '  ) * tint;',
      '  vec3 refl = textureCube(envMap, reflect(V, N)).rgb;',
      '  float f = pow(1.0 - max(dot(-V, N), 0.0), fresnelPow);',
      '  vec3 col = mix(refr, refl, clamp(f * 1.35, 0.0, 1.0));',
      /* lift toward white so the pane reads as CRYSTAL on a bright page —
         at raw env brightness it reads as smoke */
      '  col = mix(col, vec3(1.0, 0.99, 0.96), 0.30);',
      '  col += vec3(1.0, 0.94, 0.80) * f * 0.55;',
      /* mostly transparent in the middle, present at the rim — the column
         behind must stay legible through it */
      '  gl_FragColor = vec4(col, 0.28 + f * 0.55);',
      '}'].join('\n')
  };

  /* The first version of this swayed the whole extrusion ±22° and hung two
     torus hoops off it — at any angle off-centre an extruded flat shield reads
     as a translucent cone with rings floating through it. What reads as a
     SHIELD is discipline: face the camera, hold still, and draw the boundary
     as real metal.
       - the emblem faces the viewer permanently (only a slow float remains)
       - the rim is a brass TUBE along the outline — a Line is one pixel at
         any distance, which is why the old edge disappeared
       - the hoops are gone
     The glass fill keeps the dispersion, calmer, and never occludes copy. */
  var shield = new THREE.Group();
  var sp = new THREE.Shape();
  sp.moveTo(0, 1.30);
  sp.bezierCurveTo(0.62, 1.24, 0.96, 1.06, 0.98, 0.86);
  sp.bezierCurveTo(1.00, 0.24, 0.86, -0.34, 0, -1.24);
  sp.bezierCurveTo(-0.86, -0.34, -1.00, 0.24, -0.98, 0.86);
  sp.bezierCurveTo(-0.96, 1.06, -0.62, 1.24, 0, 1.30);

  var glassGeo = new THREE.ExtrudeGeometry(sp, {
    depth: 0.10, bevelEnabled: true, bevelThickness: 0.04,
    bevelSize: 0.04, bevelSegments: 3, curveSegments: 40
  });
  glassGeo.center();
  var glassMat = new THREE.ShaderMaterial({
    uniforms: DISP.uniforms,
    vertexShader: DISP.vertexShader,
    fragmentShader: DISP.fragmentShader,
    transparent: true,
    depthWrite: false
  });
  var glass = new THREE.Mesh(glassGeo, glassMat);
  glass.renderOrder = 3;
  shield.add(glass);

  /* the rim: sweep a 0.045-radius brass tube along the outline */
  var rimPts = sp.getPoints(96).map(function (p) {
    return new THREE.Vector3(p.x, p.y, 0.06);
  });
  var rimCurve = new THREE.CatmullRomCurve3(rimPts, true);
  var rim2 = new THREE.Mesh(
    new THREE.TubeGeometry(rimCurve, 128, 0.045, 10, true),
    new THREE.MeshStandardMaterial({ color: 0xBE9235, metalness: 0.88, roughness: 0.2 }));
  shield.add(rim2);

  /* a slim brass chevron seats the mark — structure, not decoration */
  var chev = new THREE.Shape();
  chev.moveTo(-0.44, 0.16); chev.lineTo(0, -0.3); chev.lineTo(0.44, 0.16);
  chev.lineTo(0.44, 0.0); chev.lineTo(0, -0.46); chev.lineTo(-0.44, 0.0);
  chev.closePath();
  var chevMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(chev, { depth: 0.05, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: 0xBE9235, metalness: 0.8, roughness: 0.24 }));
  chevMesh.position.set(0, 0.15, 0.09);
  shield.add(chevMesh);

  shield.scale.setScalar(1.15);
  shield.position.set(-1.55, 0.1, 1.05);
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

    /* the shield HOLDS — that is the argument. It faces the viewer, floats
       a few pixels, and counter-rotates the rig's own sway so it never turns
       edge-on. Under the downturn the dispersion widens: the glass braces
       without moving. */
    shield.position.y = 0.1 + Math.sin(t * 0.7) * 0.05;
    shield.rotation.y = -rig.rotation.y;
    glassMat.uniforms.iorR.value = 1.44 - crash * 0.05;
    glassMat.uniforms.iorB.value = 1.53 + crash * 0.07;
    glassMat.uniforms.fresnelPow.value = 3.0 - crash * 0.9;

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

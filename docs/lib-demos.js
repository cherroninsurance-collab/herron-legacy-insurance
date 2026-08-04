/* ============================================================================
   EFFECTS LIBRARY — live demos
   ----------------------------------------------------------------------------
   Builds a working example inside each [data-demo] strip on effects-library.html
   using the real CSS from js/omma-3d.css, which the page imports below. The
   point is that the code in each snippet is demonstrably the code that runs —
   if a demo here breaks, the snippet above it is wrong.

   Demo-only file. Nothing on the site loads it.
   ========================================================================== */
(function () {
  'use strict';

  /* the library page borrows the real stylesheet rather than restating it */
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '../js/omma-3d.css';
  document.head.appendChild(link);

  var REDUCE = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var pick = function (name) { return document.querySelector('[data-demo="' + name + '"]'); };
  var set = function (name, html) { var el = pick(name); if (el) el.innerHTML = html; return el; };

  /* ---------------------------------------------------------------- cube -- */
  (function () {
    var el = set('cube',
      '<span class="d-label">Rotating step markers — the number stays readable at every angle</span>' +
      ['01', '02', '03'].map(function (n, i) {
        return '<div class="d-step"><span class="n" data-cube="' + i + '">' + n + '</span>' +
               '<div><b>' + ['Pick your time', 'Get a reminder', 'See your options'][i] + '</b>' +
               '<span>' + ['Any open slot.', 'Email confirmation.', 'Quotes side by side.'][i] + '</span></div></div>';
      }).join(''));
    if (!el || REDUCE) return;
    el.querySelectorAll('[data-cube]').forEach(function (n, i) {
      var num = n.textContent.trim();
      n.classList.add('omma-cube-slot');
      n.innerHTML = '<span class="omma-cube" style="animation-delay:' + (-i * 1.7) + 's">' +
        '<i class="f1">' + num + '</i><i class="f2">' + num + '</i>' +
        '<i class="f3">' + num + '</i><i class="f4">' + num + '</i>' +
        '<i class="f5"></i><i class="f6"></i></span>';
    });
  })();

  /* -------------------------------------------------------------- floats -- */
  (function () {
    var el = set('float',
      '<span class="d-label">Click into a field — the label rides up and a brass rule sweeps in</span>' +
      '<div class="cap-card" style="display:grid;gap:12px">' +
      '<input type="text" name="firstname" placeholder="First name">' +
      '<input type="email" name="email" placeholder="you@email.com">' +
      '</div>');
    if (!el) return;
    el.querySelectorAll('input[placeholder]').forEach(function (input) {
      var text = input.getAttribute('placeholder');
      var box = document.createElement('span');
      box.className = 'omma-float';
      input.parentNode.insertBefore(box, input);
      box.appendChild(input);
      var label = document.createElement('span');
      label.className = 'omma-float-label';
      label.setAttribute('aria-hidden', 'true');
      label.textContent = text;
      box.appendChild(label);
      input.setAttribute('placeholder', ' ');
      input.setAttribute('aria-label', text);
    });
  })();

  /* -------------------------------------------------------------- ticker -- */
  (function () {
    var words = ['MORTGAGE PROTECTION', 'INDEXED UNIVERSAL LIFE', 'HYBRID LONG-TERM CARE',
                 'FINAL EXPENSE', 'FIXED ANNUITIES', 'DISABILITY INCOME'];
    var row = words.map(function (w) {
      return '<span>' + w + '</span><i aria-hidden="true">&#9670;</i>';
    }).join('');
    set('ticker',
      '<span class="d-label">Hover to pause — the track holds the list twice so &minus;50% is one loop</span>' +
      '<div class="omma-ticker" style="width:100%"><div class="omma-ticker-track">' +
      row + row + '</div></div>');
  })();

  /* ---------------------------------------------------------------- bars -- */
  (function () {
    var el = set('bars',
      '<span class="d-label">Drag the slider — the proportions follow, and carry no numbers</span>' +
      '<div class="q-field" style="max-width:300px">' +
      '<input type="range" min="100000" max="2000000" step="50000" value="500000" aria-label="Amount">' +
      '</div>' +
      '<div class="q-out" style="max-width:300px"><div class="omma-bars">' +
      '<span class="omma-bars-cap">What\'s moving this estimate</span>' +
      ['Amount', 'Age', 'Options'].map(function (n) {
        return '<div class="omma-bar"><span>' + n + '</span><i></i></div>';
      }).join('') + '</div></div>');
    if (!el) return;
    var r = el.querySelector('input');
    var fills = el.querySelectorAll('.omma-bar i');
    function paint() {
      var f = (r.value - r.min) / (r.max - r.min);
      fills[0].style.width = Math.round(Math.max(0.06, f) * 100) + '%';
      fills[1].style.width = '46%';
      fills[2].style.width = '22%';
    }
    r.addEventListener('input', paint);
    paint();
  })();

  /* ---------------------------------------------------------------- keys -- */
  (function () {
    var el = set('keys',
      '<span class="d-label">Hover an option — the key inverts</span>' +
      '<div style="display:grid;gap:9px;width:100%">' +
      ['My home &amp; mortgage', 'My savings from long-term care costs',
       'My family from funeral costs'].map(function (t) {
        return '<button class="fit-opt" type="button">' + t + '</button>';
      }).join('') + '</div>');
    if (!el) return;
    el.querySelectorAll('.fit-opt').forEach(function (b, i) {
      var tag = document.createElement('i');
      tag.className = 'omma-opt-key';
      tag.setAttribute('aria-hidden', 'true');
      tag.textContent = String.fromCharCode(65 + i);
      b.insertBefore(tag, b.firstChild);
    });
  })();

  /* ---------------------------------------------------------------- lift -- */
  (function () {
    var el = set('lift',
      '<span class="d-label">Press replay to watch the stagger</span>' +
      '<button class="d-btn" type="button" data-replay>Replay</button>' +
      '<div class="omma-lift-set" style="display:grid;gap:9px;width:100%;margin-top:6px">' +
      ['Income, debts, who depends on you', 'Coverage type, amount, ballpark',
       'Live carrier offers on a call'].map(function (t, i) {
        return '<div class="omma-lift d-step" style="transition-delay:' + (i * 70) + 'ms">' +
               '<span class="n">0' + (i + 1) + '</span><div><b>' + t + '</b></div></div>';
      }).join('') + '</div>');
    if (!el) return;
    var items = el.querySelectorAll('.omma-lift');
    function play() {
      items.forEach(function (c) { c.classList.remove('in'); });
      setTimeout(function () { items.forEach(function (c) { c.classList.add('in'); }); }, 60);
    }
    el.querySelector('[data-replay]').addEventListener('click', play);
    play();
  })();

  /* --------------------------------------------------------------- thumb -- */
  set('thumb',
    '<span class="d-label">Hover the thumb — the halo grows</span>' +
    '<div class="q-field" style="max-width:340px">' +
    '<input type="range" min="18" max="70" value="35" aria-label="Age"></div>');

  /* -------------------------------------------------------------- magnet -- */
  (function () {
    var el = set('magnet',
      '<span class="d-label">Move across the button — it leans toward the cursor</span>' +
      '<button class="d-btn omma-magnet" type="button">Get my numbers — 15 min</button>');
    if (!el) return;
    var b = el.querySelector('button');
    b.addEventListener('pointermove', function (e) {
      var r = b.getBoundingClientRect();
      b.style.setProperty('--mgx', ((e.clientX - r.left - r.width / 2) / r.width * 8).toFixed(2) + 'px');
      b.style.setProperty('--mgy', ((e.clientY - r.top - r.height / 2) / r.height * 6).toFixed(2) + 'px');
    });
    b.addEventListener('pointerleave', function () {
      b.style.setProperty('--mgx', '0px'); b.style.setProperty('--mgy', '0px');
    });
  })();

  /* --------------------------------------------------------------- sheen -- */
  (function () {
    var el = set('sheen',
      '<span class="d-label">Move across the pane — light tracks the cursor, nothing transforms</span>' +
      '<div class="d-card omma-sheen"><h3>The Wealth Shield Matrix</h3>' +
      '<p>Crash the market on purpose and watch the shielded bucket hold.</p></div>');
    if (!el) return;
    var c = el.querySelector('.omma-sheen');
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty('--ogx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      c.style.setProperty('--ogy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  })();

  /* --------------------------------------------------------------- shake -- */
  (function () {
    var el = set('shake',
      '<span class="d-label">Submit empty to trigger it</span>' +
      '<div class="cap-card d-card" style="height:auto">' +
      '<input type="email" placeholder="you@email.com" aria-label="Email">' +
      '<button class="d-btn" type="button" style="margin-top:11px;padding:10px 18px;font-size:13.5px">Send</button>' +
      '</div>');
    if (!el) return;
    var card = el.querySelector('.cap-card');
    el.querySelector('button').addEventListener('click', function () {
      if (el.querySelector('input').value.trim()) return;
      card.classList.remove('omma-shake');
      void card.offsetWidth;                     /* restart the animation */
      card.classList.add('omma-shake');
    });
    card.addEventListener('animationend', function () { card.classList.remove('omma-shake'); });
  })();

  /* ------------------------------------------------------------- surface --
     The one WebGL demo: the real card shader, on the real renderer path.
     Loaded dynamically so a missing vendor copy degrades to a still card
     rather than throwing on page load. */
  (function () {
    var el = set('surface',
      '<span class="d-label">The live shader — move across the card</span>' +
      '<div class="d-card omma-card" id="demoCard"><h3>Mortgage Protection</h3>' +
      '<p>Pays off the house if you pass — and pays you if a critical illness stops your income.</p></div>' +
      '<div class="d-card omma-card" id="demoCard2"><h3>Indexed Universal Life</h3>' +
      '<p>Index-linked growth with a floor under it, and tax-advantaged access later.</p></div>');
    if (!el || REDUCE) return;

    import('../vendor/three.module.min.js').then(function (THREE) {
      var VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }';
      var FRAG = [
        'precision highp float; varying vec2 vUv;',
        'uniform float uTime, uHover, uVariant; uniform vec2 uMouse;',
        'mat2 rot(float a){ return mat2(cos(a),-sin(a),sin(a),cos(a)); }',
        'float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }',
        'float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);',
        '  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }',
        'float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }',
        'void main(){',
        '  vec2 uv=vUv; vec2 p=(uv-0.5)*vec2(1.7,1.0);',
        '  float t=uTime*(0.30+uHover*0.45); float f=0.0;',
        '  if(uVariant<0.5){',
        '    vec2 q=p*rot(0.52)*6.4; vec2 gv=abs(fract(q)-0.5);',
        '    f=smoothstep(0.45,0.5,max(gv.x,gv.y));',
        '    f*=0.55+0.45*sin(length(p)*5.5-t*1.4);',
        '  } else {',
        '    float y=sin(p.x*3.6+t)*0.17+fbm(vec2(p.x*2.0,t*0.22))*0.32;',
        '    f=smoothstep(0.045,0.0,abs(p.y-y));',
        '    f+=smoothstep(0.085,0.0,abs(p.y+0.26))*0.45;',
        '  }',
        '  float ml=smoothstep(0.62,0.0,length(uv-uMouse))*uHover;',
        '  vec3 col=mix(vec3(0.055,0.122,0.243),vec3(0.745,0.573,0.208),clamp(f*0.9+ml*0.5,0.0,1.0));',
        '  float vig=smoothstep(1.35,0.30,length((uv-0.5)*2.0));',
        '  float a=clamp(f*0.22+ml*0.18,0.0,1.0)*vig*(0.62+uHover*0.38);',
        '  gl_FragColor=vec4(col,a);',
        '}'
      ].join('\n');

      /* one renderer, both cards — the same rule the site runs on */
      var gl = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      gl.setPixelRatio(1);
      gl.setClearColor(0x000000, 0);
      gl.setScissorTest(true);
      var pr = Math.min(devicePixelRatio || 1, 2);
      var targets = [];

      [['demoCard', 0], ['demoCard2', 1]].forEach(function (pair) {
        var card = document.getElementById(pair[0]);
        if (!card) return;
        var canvas = document.createElement('canvas');
        canvas.className = 'omma-card-gl';
        card.insertBefore(canvas, card.firstChild);
        Array.prototype.forEach.call(card.children, function (c) {
          if (c !== canvas) { c.style.position = 'relative'; c.style.zIndex = 2; }
        });
        var u = {
          uTime: { value: Math.random() * 10 }, uHover: { value: 0 },
          uVariant: { value: pair[1] }, uMouse: { value: new THREE.Vector2(0.5, 0.5) }
        };
        var scene = new THREE.Scene();
        scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2),
          new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: u, transparent: true })));
        var cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        var hover = 0;
        card.addEventListener('pointerenter', function () { hover = 1; });
        card.addEventListener('pointerleave', function () { hover = 0; });
        card.addEventListener('pointermove', function (ev) {
          var r = card.getBoundingClientRect();
          u.uMouse.value.set((ev.clientX - r.left) / r.width, 1 - (ev.clientY - r.top) / r.height);
        });
        targets.push({ card: card, canvas: canvas, ctx: canvas.getContext('2d'),
                       scene: scene, cam: cam, u: u, hov: function () { return hover; } });
      });

      var last = performance.now();
      (function loop(now) {
        requestAnimationFrame(loop);
        var dt = Math.min((now - last) / 1000, 0.05); last = now;
        var bw = 1, bh = 1;
        targets.forEach(function (t) {
          t.dw = Math.max(1, Math.round(t.card.clientWidth * pr));
          t.dh = Math.max(1, Math.round(t.card.clientHeight * pr));
          if (t.canvas.width !== t.dw) { t.canvas.width = t.dw; t.canvas.height = t.dh; }
          bw = Math.max(bw, t.dw); bh = Math.max(bh, t.dh);
        });
        gl.setSize(bw, bh, false);
        targets.forEach(function (t) {
          t.u.uTime.value += dt;
          t.u.uHover.value += (t.hov() - t.u.uHover.value) * (1 - Math.exp(-5 * dt));
          gl.setViewport(0, bh - t.dh, t.dw, t.dh);
          gl.setScissor(0, bh - t.dh, t.dw, t.dh);
          gl.clear(true, true, true);
          gl.render(t.scene, t.cam);
          t.ctx.clearRect(0, 0, t.dw, t.dh);
          /* source y is 0, not bh - dh: the WebGL canvas is presented flipped */
          t.ctx.drawImage(gl.domElement, 0, 0, t.dw, t.dh, 0, 0, t.dw, t.dh);
        });
      })(last);
    }).catch(function () {
      /* no three.js copy reachable — the cards simply stay still */
    });
  })();
})();

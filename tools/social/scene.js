/* Herron Legacy — social render engine.
   Canvas-2D pseudo-3D: frosted glass, liquid gold, machined brass, dark navy void.
   Everything is a pure function of (spec, t) so frames are reproducible. */

(() => {
  const NAVY_0 = '#050A16', NAVY_1 = '#0E1F3E', NAVY_2 = '#081226';
  const GOLD_D = '#8A5F10', GOLD_M = '#C9973B', GOLD_L = '#E2B45C', GOLD_P = '#F6E0AC';
  const BLUE = '#4C7EE8';

  let W = 1080, H = 1350, ctx = null, bgBlur = null, bgFlat = null;
  let BG_OFF = 0;   // where the scene canvas sits inside the full frame

  /* ---------- deterministic noise ---------- */
  function prng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  /* ---------- camera / projection ---------- */
  const CAM = { f: 1500, z: 7.2, rotY: -0.40, rotX: 0.17, cy: 0.0, ox: 0, oy: 0 };
  // the artwork zone is shorter than a full frame — scale the lens to it
  function cam(o) {
    const c = Object.assign({}, CAM, o || {});
    c.f = (o && o.f ? o.f : CAM.f) * (H / 980);
    return c;
  }

  function proj(p, c) {
    const cy = Math.cos(c.rotY), sy = Math.sin(c.rotY);
    const x1 = p.x * cy + p.z * sy, z1 = -p.x * sy + p.z * cy;
    const cx = Math.cos(c.rotX), sx = Math.sin(c.rotX);
    const y1 = p.y * cx - z1 * sx, z2 = p.y * sx + z1 * cx;
    const zz = z2 + c.z;
    const s = c.f / Math.max(0.2, zz);
    return { x: W / 2 + c.ox + x1 * s, y: H / 2 + c.oy - (y1 - c.cy) * s, z: zz, s };
  }

  function boxVerts(cx, cy, cz, w, h, d) {
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, z0 = cz - d / 2, z1 = cz + d / 2;
    return [
      { x: x0, y: y0, z: z0 }, { x: x1, y: y0, z: z0 }, { x: x1, y: y1, z: z0 }, { x: x0, y: y1, z: z0 },
      { x: x0, y: y0, z: z1 }, { x: x1, y: y0, z: z1 }, { x: x1, y: y1, z: z1 }, { x: x0, y: y1, z: z1 },
    ];
  }
  const BOX_FACES = [
    { i: [0, 1, 2, 3], n: 'front', sh: 1.00 },
    { i: [5, 4, 7, 6], n: 'back', sh: 0.55 },
    { i: [4, 0, 3, 7], n: 'left', sh: 0.70 },
    { i: [1, 5, 6, 2], n: 'right', sh: 0.86 },
    { i: [4, 5, 1, 0], n: 'bottom', sh: 0.45 },
    { i: [3, 2, 6, 7], n: 'top', sh: 1.22 },
  ];

  function polyOf(v, idx, c) { return idx.map(i => proj(v[i], c)); }
  function meanZ(poly) { return poly.reduce((a, p) => a + p.z, 0) / poly.length; }
  function tracePoly(poly) {
    ctx.beginPath();
    poly.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
  }
  function bbox(poly) {
    let a = 1e9, b = 1e9, c2 = -1e9, d = -1e9;
    poly.forEach(p => { a = Math.min(a, p.x); b = Math.min(b, p.y); c2 = Math.max(c2, p.x); d = Math.max(d, p.y); });
    return { x: a, y: b, w: c2 - a, h: d - b };
  }

  /* ---------- materials ---------- */
  function matGlass(poly, sh, o) {
    o = o || {};
    const bb = bbox(poly);
    ctx.save(); tracePoly(poly); ctx.clip();
    if (bgBlur) {
      const sx = Math.max(0, Math.floor(bb.x) - 4), sy = Math.max(0, Math.floor(bb.y + BG_OFF) - 4);
      const sw = Math.min(bgBlur.width - sx, Math.ceil(bb.w) + 8), sh = Math.min(bgBlur.height - sy, Math.ceil(bb.h) + 8);
      if (sw > 0 && sh > 0) ctx.drawImage(bgBlur, sx, sy, sw, sh, sx, sy - BG_OFF, sw, sh);
    }
    const g = ctx.createLinearGradient(bb.x, bb.y, bb.x + bb.w * 0.4, bb.y + bb.h);
    const a = (o.alpha == null ? 0.085 : o.alpha) * sh;
    g.addColorStop(0, `rgba(238,246,255,${a * 3.1})`);
    g.addColorStop(0.42, `rgba(196,218,255,${a * 1.55})`);
    g.addColorStop(1, `rgba(104,146,214,${a * 1.1})`);
    ctx.fillStyle = g; ctx.fillRect(bb.x - 2, bb.y - 2, bb.w + 4, bb.h + 4);
    // sheen — a soft light wash across the pane so it reads as a solid, not an outline
    const sg = ctx.createRadialGradient(bb.x + bb.w * .3, bb.y + bb.h * .18, 4,
                                        bb.x + bb.w * .3, bb.y + bb.h * .18, Math.max(bb.w, bb.h) * .95);
    sg.addColorStop(0, `rgba(255,255,255,${0.13 * sh})`);
    sg.addColorStop(.55, `rgba(226,180,92,${0.045 * sh})`);
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(bb.x - 2, bb.y - 2, bb.w + 4, bb.h + 4);
    if (o.tint) { ctx.fillStyle = o.tint; ctx.fillRect(bb.x - 2, bb.y - 2, bb.w + 4, bb.h + 4); }
    ctx.restore();
    ctx.save();
    ctx.lineWidth = o.lw || 2.4;
    const eg = ctx.createLinearGradient(bb.x, bb.y, bb.x + bb.w, bb.y + bb.h);
    eg.addColorStop(0, `rgba(255,255,255,${0.72 * sh})`);
    eg.addColorStop(0.5, o.edge || `rgba(240,205,140,${0.6 * sh})`);
    eg.addColorStop(1, `rgba(170,200,245,${0.4 * sh})`);
    ctx.strokeStyle = eg;
    tracePoly(poly); ctx.stroke();
    ctx.globalAlpha = .3; ctx.lineWidth = (o.lw || 2.4) * 2.6;
    tracePoly(poly); ctx.stroke();
    ctx.restore();
  }

  function goldGrad(bb, phase, dark) {
    const g = ctx.createLinearGradient(bb.x, bb.y + bb.h, bb.x + bb.w, bb.y);
    const p = ((phase || 0) % 1 + 1) % 1;
    const st = [[0, GOLD_D], [0.28, GOLD_M], [0.46, GOLD_P], [0.6, GOLD_L], [0.82, GOLD_D], [1, GOLD_M]];
    st.forEach(([o, c]) => g.addColorStop(Math.min(1, Math.max(0, (o + p) % 1)), dark ? shade(c, 0.72) : c));
    // gradient stops must ascend; rebuild safely
    const g2 = ctx.createLinearGradient(bb.x, bb.y + bb.h, bb.x + bb.w, bb.y);
    const rot = st.map(([o, c]) => [((o + p) % 1), c]).sort((a, b) => a[0] - b[0]);
    rot.forEach(([o, c]) => g2.addColorStop(o, dark ? shade(c, 0.72) : c));
    g2.addColorStop(0, rot[rot.length - 1][1]); g2.addColorStop(1, rot[0][1]);
    return g2;
  }

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) * k) | 0, g = Math.min(255, ((n >> 8) & 255) * k) | 0, b = Math.min(255, (n & 255) * k) | 0;
    return `rgb(${r},${g},${b})`;
  }

  function matGold(poly, sh, phase) {
    const bb = bbox(poly);
    ctx.save(); tracePoly(poly); ctx.clip();
    ctx.fillStyle = goldGrad(bb, phase, sh < 0.8);
    ctx.fillRect(bb.x - 2, bb.y - 2, bb.w + 4, bb.h + 4);
    ctx.globalAlpha = 0.5 * sh;
    const sp = ctx.createLinearGradient(bb.x, bb.y, bb.x + bb.w * 0.6, bb.y + bb.h);
    sp.addColorStop(0, 'rgba(255,255,255,0)'); sp.addColorStop(0.5, 'rgba(255,248,225,.85)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sp; ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
    ctx.restore();
    ctx.save(); ctx.strokeStyle = `rgba(255,236,190,${0.5 * sh})`; ctx.lineWidth = 1.5; tracePoly(poly); ctx.stroke(); ctx.restore();
  }

  function matBrass(poly, sh) {
    const bb = bbox(poly);
    ctx.save(); tracePoly(poly); ctx.clip();
    const g = ctx.createLinearGradient(bb.x, bb.y, bb.x, bb.y + bb.h);
    g.addColorStop(0, shade(GOLD_P, 0.9 * sh)); g.addColorStop(0.35, shade(GOLD_M, 1.0 * sh));
    g.addColorStop(0.7, shade(GOLD_D, 1.0 * sh)); g.addColorStop(1, shade(GOLD_M, 0.8 * sh));
    ctx.fillStyle = g; ctx.fillRect(bb.x - 2, bb.y - 2, bb.w + 4, bb.h + 4);
    ctx.restore();
    ctx.save(); ctx.strokeStyle = `rgba(255,230,180,${0.45 * sh})`; ctx.lineWidth = 1.4; tracePoly(poly); ctx.stroke(); ctx.restore();
  }

  function matChrome(poly, sh) {
    const bb = bbox(poly);
    ctx.save(); tracePoly(poly); ctx.clip();
    const g = ctx.createLinearGradient(bb.x, bb.y, bb.x + bb.w * .3, bb.y + bb.h);
    g.addColorStop(0, shade('#1E3560', sh)); g.addColorStop(.4, shade('#0B1730', sh));
    g.addColorStop(.7, shade('#26406F', sh)); g.addColorStop(1, shade('#070E1D', sh));
    ctx.fillStyle = g; ctx.fillRect(bb.x - 2, bb.y - 2, bb.w + 4, bb.h + 4);
    ctx.restore();
    ctx.save(); ctx.strokeStyle = `rgba(150,190,255,${.3 * sh})`; ctx.lineWidth = 1.3; tracePoly(poly); ctx.stroke(); ctx.restore();
  }

  const MAT = { glass: matGlass, gold: matGold, brass: matBrass, chrome: matChrome };

  function groundShadow(c, cx, cy, cz, w, d, k) {
    const p = proj({ x: cx, y: cy, z: cz }, c);
    const rx = w * .62 * p.s, ry = Math.max(10, d * .22 * p.s);
    ctx.save();
    const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, rx);
    g.addColorStop(0, `rgba(2,5,12,${(k == null ? .62 : k)})`);
    g.addColorStop(.6, 'rgba(2,5,12,.22)');
    g.addColorStop(1, 'rgba(2,5,12,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, 0, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawBox(c, cx, cy, cz, w, h, d, mat, o) {
    o = o || {};
    if (o.ground !== false) groundShadow(c, cx, cy - h / 2 - .04, cz, w, d, o.groundK);
    const v = boxVerts(cx, cy, cz, w, h, d);
    const faces = BOX_FACES.map(f => ({ f, poly: polyOf(v, f.i, c) }));
    faces.sort((a, b) => meanZ(b.poly) - meanZ(a.poly));
    faces.forEach(({ f, poly }) => {
      if (o.skip && o.skip.indexOf(f.n) >= 0) return;
      const fn = MAT[mat] || matGlass;
      if (mat === 'gold') fn(poly, f.sh, (o.phase || 0) + (f.n === 'top' ? .12 : 0));
      else fn(poly, f.sh, o);
      if (o.onFace) o.onFace(f.n, poly, f.sh);
    });
    return { v, c };
  }

  function wireBox(c, cx, cy, cz, w, h, d, col, lw, glow) {
    const v = boxVerts(cx, cy, cz, w, h, d).map(p => proj(p, c));
    const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    ctx.save();
    ctx.shadowColor = glow || 'rgba(226,180,92,.8)'; ctx.shadowBlur = 22;
    ctx.strokeStyle = col || GOLD_L; ctx.lineWidth = lw || 2.4;
    E.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(v[a].x, v[a].y); ctx.lineTo(v[b].x, v[b].y); ctx.stroke(); });
    ctx.restore();
  }

  /* ---------- primitives in screen space ---------- */
  function sphere(x, y, r, o) {
    o = o || {};
    ctx.save();
    ctx.shadowColor = o.glow || 'rgba(226,180,92,.55)'; ctx.shadowBlur = o.glowR || 45;
    const g = ctx.createRadialGradient(x - r * .38, y - r * .45, r * .05, x, y, r);
    if (o.blue) { g.addColorStop(0, '#DCE8FF'); g.addColorStop(.3, '#7FA5F0'); g.addColorStop(.75, '#2F55A8'); g.addColorStop(1, '#12233F'); }
    else { g.addColorStop(0, '#FFF6DF'); g.addColorStop(.22, GOLD_P); g.addColorStop(.55, GOLD_L); g.addColorStop(.82, GOLD_M); g.addColorStop(1, shade(GOLD_D, .75)); }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.restore();
    ctx.save();
    const s = ctx.createRadialGradient(x - r * .4, y - r * .5, 0, x - r * .4, y - r * .5, r * .42);
    s.addColorStop(0, 'rgba(255,255,255,.95)'); s.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = s; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.restore();
  }

  function liquidTop(x, w, y, t, amp, seed) {
    const r = prng(seed || 7); const p1 = r() * 6, p2 = r() * 6;
    ctx.moveTo(x, y);
    for (let i = 0; i <= 32; i++) {
      const u = i / 32, px = x + u * w;
      const py = y + Math.sin(u * 5.4 + t * 1.9 + p1) * amp + Math.sin(u * 11.3 - t * 2.7 + p2) * amp * .45;
      ctx.lineTo(px, py);
    }
  }

  function fillLiquid(rect, level, t, phase, seed) {
    const { x, y, w, h } = rect;
    const top = y + h * (1 - Math.max(0, Math.min(1, level)));
    ctx.save();
    ctx.beginPath(); liquidTop(x, w, top, t, Math.max(3, h * .012), seed);
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath();
    ctx.clip();
    ctx.fillStyle = goldGrad({ x, y: top, w, h: y + h - top }, phase);
    ctx.fillRect(x - 2, top - 20, w + 4, h + 40);
    const gl = ctx.createLinearGradient(0, top, 0, top + h * .3);
    gl.addColorStop(0, 'rgba(255,246,223,.55)'); gl.addColorStop(1, 'rgba(255,246,223,0)');
    ctx.fillStyle = gl; ctx.fillRect(x - 2, top, w + 4, h * .3);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = 'rgba(255,246,223,.9)'; ctx.lineWidth = 2.4;
    ctx.shadowColor = 'rgba(226,180,92,.9)'; ctx.shadowBlur = 24;
    ctx.beginPath(); liquidTop(x, w, top, t, Math.max(3, h * .012), seed); ctx.stroke();
    ctx.restore();
    return top;
  }

  function crack(x, y, len, ang, seed, col, lw) {
    const r = prng(seed);
    ctx.save();
    ctx.strokeStyle = col || 'rgba(4,8,18,.92)'; ctx.lineWidth = lw || 4;
    ctx.shadowColor = 'rgba(76,126,232,.5)'; ctx.shadowBlur = 10;
    const walk = (px, py, a, l, d) => {
      ctx.beginPath(); ctx.moveTo(px, py);
      let cx2 = px, cy2 = py;
      const steps = 7;
      for (let i = 0; i < steps; i++) {
        a += (r() - .5) * .7; cx2 += Math.cos(a) * l / steps; cy2 += Math.sin(a) * l / steps;
        ctx.lineTo(cx2, cy2);
      }
      ctx.stroke();
      if (d > 0 && l > 40) { walk(cx2 - Math.cos(a) * l * .3, cy2 - Math.sin(a) * l * .3, a + (r() - .5) * 1.6, l * .45, d - 1); }
    };
    walk(x, y, ang, len, 2);
    ctx.restore();
  }

  function dust(t, n, seed, box) {
    const r = prng(seed); ctx.save(); ctx.shadowBlur = 0;
    for (let i = 0; i < n; i++) {
      const bx = box.x + r() * box.w, by = box.y + r() * box.h;
      const sp = .25 + r() * .9, ph = r() * 6.28;
      const y = by - ((t * sp * 60 + ph * 30) % (box.h + 80));
      const a = (.18 + r() * .5) * (0.4 + 0.6 * Math.sin(t * 2 + ph) * .5 + .5);
      const rad = .8 + r() * 2.4;
      ctx.globalAlpha = a * .35; ctx.fillStyle = GOLD_L;
      ctx.beginPath(); ctx.arc(bx, y, rad * 2.6, 0, 7); ctx.fill();
      ctx.globalAlpha = a; ctx.fillStyle = r() > .78 ? '#DCE8FF' : GOLD_P;
      ctx.beginPath(); ctx.arc(bx, y, rad, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  function label(x, y, txt, o) {
    o = o || {};
    ctx.save();
    ctx.font = `${o.weight || 600} ${o.size || 21}px "PlexMono", monospace`;
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'middle';
    const wd = ctx.measureText(txt).width, pad = o.size ? o.size * .7 : 15;
    const bx = o.align === 'center' ? x - wd / 2 - pad : o.align === 'right' ? x - wd - pad : x - pad;
    const bh = (o.size || 21) * 2.0;
    if (o.chip !== false) {
      ctx.save();
      ctx.fillStyle = o.chipFill || 'rgba(6,12,26,.72)';
      ctx.strokeStyle = o.chipEdge || 'rgba(226,180,92,.42)'; ctx.lineWidth = 1.2;
      const rr = bh / 2;
      ctx.beginPath();
      const bw = wd + pad * 2;
      ctx.moveTo(bx + rr, y - bh / 2); ctx.lineTo(bx + bw - rr, y - bh / 2);
      ctx.quadraticCurveTo(bx + bw, y - bh / 2, bx + bw, y - bh / 2 + rr);
      ctx.lineTo(bx + bw, y + bh / 2 - rr); ctx.quadraticCurveTo(bx + bw, y + bh / 2, bx + bw - rr, y + bh / 2);
      ctx.lineTo(bx + rr, y + bh / 2); ctx.quadraticCurveTo(bx, y + bh / 2, bx, y + bh / 2 - rr);
      ctx.lineTo(bx, y - bh / 2 + rr); ctx.quadraticCurveTo(bx, y - bh / 2, bx + rr, y - bh / 2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = o.col || GOLD_L;
    ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 6;
    ctx.fillText(txt, o.align === 'center' ? x : o.align === 'right' ? x : x, y);
    ctx.restore();
  }

  function arrowUp(x, y0, y1, col) {
    ctx.save(); ctx.strokeStyle = col || 'rgba(120,165,240,.85)'; ctx.lineWidth = 3;
    ctx.setLineDash([10, 9]); ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x, y1 - 2); ctx.lineTo(x - 11, y1 + 20); ctx.lineTo(x + 11, y1 + 20); ctx.closePath();
    ctx.fillStyle = col || 'rgba(120,165,240,.85)'; ctx.fill(); ctx.restore();
  }

  /* ---------- background ---------- */
  function background(seed, warm) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, NAVY_2); g.addColorStop(.45, NAVY_1); g.addColorStop(1, NAVY_0);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    let r = ctx.createRadialGradient(W * .78, H * .16, 10, W * .78, H * .16, W * .82);
    r.addColorStop(0, `rgba(226,180,92,${warm == null ? .17 : warm})`); r.addColorStop(1, 'rgba(226,180,92,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);

    r = ctx.createRadialGradient(W * .12, H * .74, 10, W * .12, H * .74, W * .8);
    r.addColorStop(0, 'rgba(76,126,232,.15)'); r.addColorStop(1, 'rgba(76,126,232,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);

    r = ctx.createLinearGradient(0, H * .62, 0, H);
    r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(2,5,12,.72)');
    ctx.fillStyle = r; ctx.fillRect(0, H * .6, W, H * .4);

    const v = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .78);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  function grain(seed) {
    const r = prng(seed || 99); ctx.save(); ctx.globalAlpha = .045;
    for (let i = 0; i < 5200; i++) {
      const x = r() * W, y = r() * H, s = r() > .5 ? 1 : 2;
      ctx.fillStyle = r() > .5 ? '#ffffff' : '#000000';
      ctx.fillRect(x, y, s, s);
    }
    ctx.restore();
  }

  /* =======================================================================
     SCENES — each takes (t, p) where p = scene params from the spec
     ======================================================================= */
  const S = {};

  /* frosted slab holding a gold sphere; behind it a cracked panel losing one */
  S.floor_slab = (t, p) => {
    // cracked panel — behind and to the right, losing its sphere through the fracture
    const c2 = cam({ rotY: -0.44, rotX: 0.21, ox: W * .19, oy: H * .06, z: 9.4 });
    const fall = (t * .5) % 1;
    let crackPoly = null;
    drawBox(c2, 0, -.5, 0, 2.0, .42, 1.4, 'glass', {
      alpha: .05, edge: 'rgba(76,126,232,.55)',
      onFace: (n, poly) => { if (n === 'top') crackPoly = poly; }
    });
    if (crackPoly) { const b = bbox(crackPoly); crack(b.x + b.w * .12, b.y + b.h * .35, b.w * .8, .28, 21); }
    const fp = proj({ x: 0, y: 1.5 - fall * 2.9, z: 0 }, c2);
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - fall * 1.25);
    sphere(fp.x, fp.y, 40, { glowR: 26 });
    ctx.restore();
    label(fp.x, proj({ x: 0, y: -1.35, z: 0 }, c2).y, p && p.l2 || 'INDEX −20%',
      { align: 'center', size: 18, col: '#9DBBF5', chipEdge: 'rgba(76,126,232,.5)' });

    // the intact slab, front-left, holding its sphere dead still
    const c = cam({ rotY: -0.46, rotX: 0.20, ox: -W * .13, oy: H * .10 });
    drawBox(c, 0, -.55, 0, 2.5, .62, 1.8, 'glass', { alpha: .13, lw: 2.8 });
    const sp = proj({ x: 0, y: -.32, z: 0 }, c);
    sphere(sp.x, sp.y - 74, 76, {});
    ctx.save(); ctx.globalAlpha = .22;
    sphere(sp.x, sp.y + 42, 54, { glowR: 8 });
    ctx.restore();
    dust(t, 52, 5, { x: 0, y: 0, w: W, h: H });
    label(sp.x, sp.y - 210, p && p.l1 || 'CREDIT 0.00%', { align: 'center', size: 20 });
  };

  /* column with rising gold, brass cap plate, spill-over */
  S.capped_column = (t, p) => {
    const c = cam({ rotY: -0.34, rotX: 0.10, oy: H * .02 });
    const lvl = p && p.level != null ? p.level : .55 + Math.sin(t * .9) * .12;
    let frontPoly = null;
    drawBox(c, 0, 0, 0, 1.7, 3.5, 1.5, 'glass', {
      alpha: .07, onFace: (n, poly) => { if (n === 'front') frontPoly = poly; }
    });
    if (frontPoly) {
      const bb = bbox(frontPoly);
      ctx.save(); tracePoly(frontPoly); ctx.clip();
      fillLiquid({ x: bb.x, y: bb.y, w: bb.w, h: bb.h }, lvl, t, t * .1, 3);
      ctx.restore();
    }
    // brass cap
    drawBox(c, 0, 1.92, 0, 2.15, .3, 1.9, 'brass', { ground: false });
    // spill
    if (!p || p.spill !== false) {
      const a = proj({ x: 1.07, y: 1.78, z: 0 }, c);
      ctx.save();
      const g = ctx.createLinearGradient(a.x, a.y, a.x + 60, a.y + 300);
      g.addColorStop(0, 'rgba(226,180,92,.95)'); g.addColorStop(.5, 'rgba(180,130,50,.55)'); g.addColorStop(1, 'rgba(120,90,40,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 16; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x, a.y);
      ctx.bezierCurveTo(a.x + 62, a.y + 34, a.x + 70, a.y + 150, a.x + 40, a.y + 250);
      ctx.stroke(); ctx.restore();
      label(a.x + 132, a.y + 168, p && p.l2 || 'CARRIER KEEPS', { align: 'center', col: 'rgba(226,180,92,.75)', size: 18 });
    }
    // floor slab
    drawBox(c, 0, -2.02, 0, 2.4, .34, 2.1, 'glass', { alpha: .15, edge: 'rgba(255,255,255,.5)' });
    dust(t, 46, 11, { x: W * .18, y: 0, w: W * .64, h: H });
    const cp = proj({ x: 0, y: 1.92, z: 0 }, c), fl = proj({ x: 0, y: -2.02, z: 0 }, c);
    label(cp.x + 268, cp.y - 10, p && p.lc || 'CAP', { align: 'center', size: 20 });
    label(fl.x - 268, fl.y + 6, p && p.lf || 'FLOOR', { align: 'center', size: 20 });
  };

  /* two columns: A drains, B holds on a floor */
  S.twin_columns = (t, p) => {
    const c = cam({ rotY: -0.38, rotX: 0.13, oy: H * .05 });
    const k = Math.min(1, t * .5);
    const la = (p && p.a != null ? p.a : .8) - (p && p.drain === false ? 0 : .2 * k);
    const lb = (p && p.b != null ? p.b : .8);
    [[-1.6, la, 'A', p && p.va || '$80,000', 'rgba(120,160,235,.6)'],
     [1.6, lb, 'B', p && p.vb || '$100,000', 'rgba(240,205,140,.6)']].forEach(([x, lv, tag, val, edge], i) => {
      let fp = null;
      drawBox(c, x, 0, 0, 1.35, 3.0, 1.25, 'glass', { alpha: i ? .10 : .075, edge,
        onFace: (n, poly) => { if (n === 'front') fp = poly; } });
      if (fp) { const bb = bbox(fp); ctx.save(); tracePoly(fp); ctx.clip();
        fillLiquid({ x: bb.x, y: bb.y, w: bb.w, h: bb.h }, lv, t, t * .08 + i * .3, 3 + i); ctx.restore(); }
      if (i === 1) drawBox(c, x, -1.72, 0, 1.9, .28, 1.6, 'glass', { alpha: .16, edge: 'rgba(255,255,255,.55)' });
      const pr = proj({ x, y: 1.62, z: 0 }, c);
      label(pr.x, pr.y - 46, tag, { align: 'center', size: 22, col: i ? GOLD_L : '#9DBBF5', chipEdge: edge });
      const pb = proj({ x, y: -1.72, z: 0 }, c);
      label(pb.x, Math.min(H - 34, pb.y + (i ? 96 : 62)), val,
        { align: 'center', size: 24, col: i ? GOLD_P : '#9DBBF5', chipEdge: edge });
    });
    dust(t, 40, 17, { x: 0, y: 0, w: W, h: H });
  };

  /* gold ingot in an open vault | faucet chamber dripping onto a disc stack */
  S.pile_vs_paycheck = (t) => {
    // left — the pile: an open vault with a solid ingot in it
    const c = cam({ rotY: -0.42, rotX: 0.18, ox: -W * .22, oy: H * .04, z: 7.8 });
    drawBox(c, 0, -1.22, 0, 2.7, .24, 2.0, 'glass', { alpha: .16 });
    drawBox(c, 0, .05, 0, 2.7, 2.2, 2.1, 'glass', { alpha: .07, skip: ['front'], ground: false });
    drawBox(c, 0, -.42, 0, 2.0, 1.05, 1.5, 'gold', { phase: t * .07, ground: false });
    label(proj({ x: 0, y: -1.22, z: 0 }, c).x, Math.min(H - 34, proj({ x: 0, y: -1.22, z: 0 }, c).y + 96),
      'PILE', { align: 'center', size: 22 });

    // right — the paycheck: a nearly empty chamber that still drips
    const c2 = cam({ rotY: -0.42, rotX: 0.18, ox: W * .24, oy: H * .04, z: 7.8 });
    let fp = null;
    drawBox(c2, 0, .78, 0, 1.9, 1.55, 1.5, 'glass', {
      alpha: .10, onFace: (n, poly) => { if (n === 'front') fp = poly; } });
    if (fp) { const bb = bbox(fp); ctx.save(); tracePoly(fp); ctx.clip();
      fillLiquid({ x: bb.x, y: bb.y, w: bb.w, h: bb.h }, .18, t, t * .1, 9); ctx.restore(); }
    drawBox(c2, .70, -.10, .78, 1.0, .30, .30, 'brass', { ground: false });
    const fa = proj({ x: 1.20, y: -.20, z: .78 }, c2);
    for (let i = 0; i < 4; i++) {
      const ph = ((t * .75 + i / 4) % 1), y = fa.y + ph * 120;
      ctx.save(); ctx.globalAlpha = 1 - ph * .25; sphere(fa.x + 3, y, 10, { glowR: 20 }); ctx.restore();
    }
    // the checks that have already stacked up under it
    const ty = fa.y + 132;
    ctx.save();
    for (let i = 0; i < 8; i++) {
      const yy = ty + 84 - i * 12;
      const g = ctx.createLinearGradient(fa.x - 74, yy, fa.x + 74, yy + 13);
      g.addColorStop(0, shade(GOLD_D, 1)); g.addColorStop(.45, GOLD_P); g.addColorStop(1, GOLD_M);
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(fa.x + 3, yy, 72, 13, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,205,.45)'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
    label(Math.min(W - 110, fa.x + 3), Math.min(H - 34, ty + 132), 'PAYCHECK', { align: 'center', size: 22 });
    dust(t, 44, 23, { x: 0, y: 0, w: W, h: H });
  };

  /* small solid cube (cash value) + big wireframe cube (benefit base) */
  S.wireframe_cube = (t, p) => {
    const c = cam({ rotY: -0.44, rotX: 0.19, oy: H * .04 });
    const bob = Math.sin(t * 1.1) * .07;
    wireBox(c, .95, .55 + bob, 1.0, 2.5, 2.5, 2.5, GOLD_L, 2.6);
    ctx.save(); ctx.globalAlpha = .1;
    const wb = proj({ x: .95, y: .55 + bob, z: 1.0 }, c);
    const rg = ctx.createRadialGradient(wb.x, wb.y, 5, wb.x, wb.y, 250);
    rg.addColorStop(0, 'rgba(226,180,92,.5)'); rg.addColorStop(1, 'rgba(226,180,92,0)');
    ctx.fillStyle = rg; ctx.fillRect(wb.x - 260, wb.y - 260, 520, 520); ctx.restore();
    drawBox(c, -1.25, -.85, -.6, 1.5, 1.5, 1.4, 'gold', { phase: t * .06 });
    drawBox(c, -1.25, -1.75, -.6, 2.3, .22, 2.0, 'glass', { alpha: .14 });
    const sb = proj({ x: -1.25, y: -.85, z: -.6 }, c);
    label(sb.x, sb.y + 190, p && p.l1 || 'CASH VALUE', { align: 'center' });
    label(wb.x, wb.y - 230, p && p.l2 || 'BENEFIT BASE', { align: 'center', col: GOLD_P });
    label(wb.x, wb.y + 240, p && p.l3 || 'NOT WITHDRAWABLE', { align: 'center', size: 18, col: 'rgba(226,180,92,.7)' });
    dust(t, 50, 31, { x: 0, y: 0, w: W, h: H });
  };

  /* glass staircase, gold river, one shattered tread */
  S.staircase = (t, p) => {
    const c = cam({ rotY: -0.40, rotX: 0.21, oy: H * .08, z: 7.6 });
    const broken = p && p.broken != null ? p.broken : 3;
    const N = 5, DX = 1.05, DY = .52;
    const px = i => -2.1 + i * DX, py = i => -1.35 + i * DY;
    for (let i = 0; i < N; i++) {
      const isB = i === broken;
      let topPoly = null;
      drawBox(c, px(i), py(i), 0, 1.25, .26, 1.35, 'glass', {
        alpha: isB ? .05 : .13, edge: isB ? 'rgba(120,160,235,.6)' : 'rgba(240,205,140,.55)',
        onFace: (n, poly) => { if (n === 'top') topPoly = poly; }
      });
      if (isB && topPoly) { const b = bbox(topPoly); crack(b.x + 8, b.y + b.h * .5, b.w * .92, .12, 41 + i); }
      // the gold river only reaches the break
      if (i < broken) drawBox(c, px(i), py(i) + .19, 0, 1.05, .13, 1.15, 'gold',
        { phase: t * .09 + i * .12, ground: false });
    }
    // the waterfall through the gap
    const bp = proj({ x: px(broken), y: py(broken), z: 0 }, c);
    ctx.save();
    const g2 = ctx.createLinearGradient(bp.x, bp.y, bp.x, H);
    g2.addColorStop(0, 'rgba(240,205,140,.95)');
    g2.addColorStop(.45, 'rgba(201,151,59,.5)');
    g2.addColorStop(1, 'rgba(120,90,40,0)');
    ctx.fillStyle = g2; ctx.shadowColor = 'rgba(226,180,92,.55)'; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.moveTo(bp.x - 44, bp.y + 4);
    ctx.bezierCurveTo(bp.x - 74, bp.y + 130, bp.x - 96, bp.y + 220, bp.x - 118, H);
    ctx.lineTo(bp.x + 96, H);
    ctx.bezierCurveTo(bp.x + 74, bp.y + 220, bp.x + 62, bp.y + 130, bp.x + 44, bp.y + 4);
    ctx.closePath(); ctx.fill(); ctx.restore();
    // where it was supposed to go
    ctx.save(); ctx.setLineDash([13, 12]); ctx.strokeStyle = 'rgba(120,165,240,.6)'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = broken; i < N; i++) {
      const q = proj({ x: px(i), y: py(i) + .30, z: 0 }, c);
      i === broken ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y);
    }
    ctx.stroke(); ctx.restore();
    dust(t, 40, 53, { x: 0, y: 0, w: W, h: H });
    label(W * .5, H - 34, p && p.l1 || '\u221220% NEEDS +25%', { align: 'center', size: 21 });
  };

  /* two vaults + conduit: sealed (top) or severed (bottom) */
  S.conduit = (t, p) => {
    const sev = p && p.severed;
    const c = cam({ rotY: -0.30, rotX: 0.15, oy: H * .04, z: 8.0 });
    [-2.3, 2.3].forEach((vx, vi) => {
      drawBox(c, vx, 0, 0, 1.9, 2.3, 1.7, 'glass', { alpha: .09, skip: ['front'] });
      drawBox(c, vx, -.74, 0, 1.55, .82, 1.25, 'gold', { phase: t * .05 + vi * .3, ground: false });
    });
    if (!sev) {
      drawBox(c, 0, 0, 0, 3.2, .62, .62, 'brass', { ground: false });
      // the flowing window in the middle of the run
      const m = proj({ x: 0, y: 0, z: -.31 }, c);
      const ww = 1.05 * m.s, hh = .40 * m.s;
      ctx.save();
      ctx.beginPath(); ctx.rect(m.x - ww / 2, m.y - hh / 2, ww, hh); ctx.clip();
      ctx.fillStyle = 'rgba(5,10,22,.7)'; ctx.fillRect(m.x - ww / 2, m.y - hh / 2, ww, hh);
      ctx.fillStyle = goldGrad({ x: m.x - ww / 2, y: m.y - hh / 2, w: ww, h: hh }, t * .55);
      ctx.fillRect(m.x - ww / 2, m.y - hh / 2, ww, hh);
      ctx.restore();
      ctx.save(); ctx.strokeStyle = 'rgba(255,240,205,.55)'; ctx.lineWidth = 2;
      ctx.strokeRect(m.x - ww / 2, m.y - hh / 2, ww, hh); ctx.restore();
      label(W / 2, m.y + 132, p && p.l1 || 'DIRECT \u00B7 TRUSTEE TO TRUSTEE', { align: 'center', size: 19 });
    } else {
      drawBox(c, -1.62, 0, 0, 1.5, .62, .62, 'brass', { ground: false });
      drawBox(c, 1.62, 0, 0, 1.5, .62, .62, 'brass', { ground: false });
      const a = proj({ x: -.8, y: 0, z: -.31 }, c), b = proj({ x: .8, y: 0, z: -.31 }, c);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      ctx.save();
      ctx.strokeStyle = goldGrad({ x: a.x, y: my - 60, w: b.x - a.x, h: 120 }, t * .4);
      ctx.lineWidth = 22; ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(226,180,92,.6)'; ctx.shadowBlur = 26;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx, my - 96, b.x, b.y); ctx.stroke();
      // the part that never arrives
      ctx.shadowBlur = 14; ctx.lineWidth = 11;
      ctx.strokeStyle = 'rgba(226,180,92,.6)';
      ctx.beginPath(); ctx.moveTo(mx, my - 48); ctx.quadraticCurveTo(mx + 70, my + 60, mx + 42, my + 168); ctx.stroke();
      ctx.restore();
      // the plain grey tray it lands in
      const c2 = cam({ rotY: -0.30, rotX: 0.15, oy: H * .04, z: 8.0 });
      drawBox(c2, .3, -1.42, 0, 1.5, .42, 1.1, 'chrome', {});
      label(mx + 214, my + 176, p && p.l2 || '20% WITHHELD',
        { align: 'center', size: 18, col: '#9DBBF5', chipEdge: 'rgba(120,160,235,.6)' });
      label(W / 2, Math.max(30, my - 172), p && p.l1 || '60-DAY CLOCK', { align: 'center', size: 19 });
    }
    dust(t, 34, 61, { x: 0, y: 0, w: W, h: H });
  };

  /* ring of 60 glass segments draining */
  S.ring60 = (t, p) => {
    const cx = W / 2, cy = H * .46, R = Math.min(W, H) * .27;
    const left = p && p.left != null ? p.left : Math.max(0, 1 - (t % 6) / 6);
    ctx.save();
    for (let i = 0; i < 60; i++) {
      const a0 = -Math.PI / 2 + i / 60 * 6.2832, a1 = a0 + 6.2832 / 60 * .72;
      const on = i / 60 < left;
      ctx.beginPath();
      ctx.arc(cx, cy, R, a0, a1); ctx.arc(cx, cy, R - 34, a1, a0, true); ctx.closePath();
      if (on) { ctx.fillStyle = 'rgba(226,180,92,.9)'; ctx.shadowColor = 'rgba(226,180,92,.8)'; ctx.shadowBlur = 16; }
      else { ctx.fillStyle = 'rgba(120,150,200,.13)'; ctx.shadowBlur = 0; }
      ctx.fill();
    }
    ctx.restore();
    // the cracked final segment
    ctx.save();
    const fa = -Math.PI / 2 + left * 6.2832;
    ctx.translate(cx + Math.cos(fa) * (R - 17), cy + Math.sin(fa) * (R - 17));
    ctx.fillStyle = '#FF6A4D'; ctx.shadowColor = '#FF6A4D'; ctx.shadowBlur = 26;
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, 7); ctx.fill(); ctx.restore();
    label(cx, cy, p && p.l1 || '60 DAYS', { align: 'center', size: 40, chip: false, col: GOLD_P });
    label(cx, cy + 62, p && p.l2 || 'THEN IT IS TAXABLE', { align: 'center', size: 18, col: 'rgba(226,180,92,.75)' });
    dust(t, 30, 71, { x: 0, y: 0, w: W, h: H });
  };

  /* 12-slot calendar ring, one gold */
  S.calendar_ring = (t, p) => {
    const cx = W / 2, cy = H * .44, R = Math.min(W * .34, H * .34);
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + i / 12 * 6.2832;
      const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      const on = i === 0, hw = on ? 40 : 34;
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - hw, y - hw, hw * 2, hw * 2, 14);
      else ctx.rect(x - hw, y - hw, hw * 2, hw * 2);
      if (on) { ctx.fillStyle = goldGrad({ x: x - hw, y: y - hw, w: hw * 2, h: hw * 2 }, t * .3); }
      else { ctx.fillStyle = 'rgba(150,180,235,.14)'; }
      ctx.fill();
      ctx.strokeStyle = on ? 'rgba(255,244,215,.95)' : 'rgba(170,200,245,.45)';
      ctx.lineWidth = on ? 3 : 1.8; ctx.stroke();
      if (on) {
        ctx.globalAlpha = .35; ctx.lineWidth = 12; ctx.stroke();
      } else {
        ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(140,170,225,.5)'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(x - 15, y - 15); ctx.lineTo(x + 15, y + 15);
        ctx.moveTo(x + 15, y - 15); ctx.lineTo(x - 15, y + 15); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.strokeStyle = 'rgba(226,180,92,.22)'; ctx.lineWidth = 2; ctx.setLineDash([8, 12]);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke(); ctx.restore();
    label(cx, cy, p && p.l1 || '1 PER 12 MONTHS', { align: 'center', size: 24, col: GOLD_P });
    dust(t, 26, 83, { x: 0, y: 0, w: W, h: H });
  };

  /* stack of fee slabs, wobbling — or one clean block */
  S.fee_stack = (t, p) => {
    const c = cam({ rotY: -0.38, rotX: 0.16, oy: H * .05 });
    if (p && p.clean) {
      drawBox(c, 0, -1.35, 0, 3.0, .24, 2.1, 'glass', { alpha: .16 });
      drawBox(c, 0, -.30, 0, 2.6, 1.5, 2.1, 'glass', { alpha: .11, skip: ['front'], ground: false });
      drawBox(c, 0, -.55, 0, 1.7, .55, 1.3, 'gold', { phase: t * .05, ground: false });
      drawBox(c, 0, -.30, 0, 2.6, 1.5, 2.1, 'glass', { alpha: .07, skip: ['back', 'left', 'right', 'bottom', 'top'], ground: false });
      label(W / 2, H - 40, p.l1 || 'NO EXPLICIT ANNUAL FEE', { align: 'center', size: 21 });
    } else {
      const labels = (p && p.labels) || ['RIDER', 'ADMIN', 'SUB-ACCOUNT', 'M&E'];
      labels.forEach((tx, i) => {
        const wob = Math.sin(t * 1.6 + i * .7) * (.06 + i * .05);
        drawBox(c, wob * 1.4, -1.5 + i * .62, 0, 2.4 - i * .12, .5, 1.9, 'glass', { alpha: .07, edge: 'rgba(76,126,232,.45)' });
        const pr = proj({ x: wob * 1.4 - 1.5, y: -1.5 + i * .62, z: 0 }, c);
        label(pr.x - 40, pr.y, tx, { align: 'right', size: 18, col: '#9DBBF5', chipEdge: 'rgba(76,126,232,.5)' });
      });
    }
    dust(t, 36, 97, { x: 0, y: 0, w: W, h: H });
  };

  /* brass mechanism ejecting checks */
  S.gear_mech = (t, p) => {
    const c = cam({ rotY: -0.36, rotX: 0.16, oy: H * .0 });
    drawBox(c, -.1, .1, 0, 2.5, 1.7, 1.9, 'brass', {});
    const m = proj({ x: -.1, y: .1, z: 0 }, c);
    // gears
    [[m.x - 60, m.y - 10, 54, 1], [m.x + 62, m.y + 26, 38, -1]].forEach(([x, y, r, d]) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * .9 * d);
      ctx.fillStyle = 'rgba(10,18,36,.85)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      ctx.strokeStyle = GOLD_P; ctx.lineWidth = 3;
      for (let i = 0; i < 10; i++) { const a = i / 10 * 6.2832; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (r - 12), Math.sin(a) * (r - 12)); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 0, r - 12, 0, 7); ctx.stroke(); ctx.restore();
    });
    // checks ejecting
    for (let i = 0; i < 5; i++) {
      const ph = ((t * .55 + i / 5) % 1);
      const x = m.x + 170 + ph * 260, y = m.y + 60 + ph * 120;
      ctx.save(); ctx.globalAlpha = Math.min(1, (1 - ph) * 2.2);
      ctx.translate(x, y); ctx.rotate(-.16 + ph * .2);
      ctx.fillStyle = 'rgba(246,224,172,.95)'; ctx.shadowColor = 'rgba(226,180,92,.7)'; ctx.shadowBlur = 18;
      ctx.fillRect(-56, -26, 112, 52);
      ctx.fillStyle = 'rgba(8,18,38,.75)'; ctx.fillRect(-42, -10, 60, 6); ctx.fillRect(-42, 4, 40, 5);
      ctx.restore();
    }
    label(m.x, m.y - 190, p && p.l1 || 'LIFETIME PAYOUT', { align: 'center' });
    label(m.x + 260, m.y + 250, p && p.l2 || 'FOR LIFE', { align: 'center', size: 20 });
    dust(t, 34, 103, { x: 0, y: 0, w: W, h: H });
  };

  /* two bars: +100% then −50% */
  S.bar_pair = (t, p) => {
    const c = cam({ rotY: -0.30, rotX: 0.12, oy: H * .06 });
    const g1 = p && p.h1 != null ? p.h1 : 3.0, g2 = p && p.h2 != null ? p.h2 : 1.5;
    [[-1.3, g1, p && p.t1 || 'YEAR 1  +100%'], [1.3, g2, p && p.t2 || 'YEAR 2  −50%']].forEach(([x, h, tx], i) => {
      drawBox(c, x, -2.0 + h / 2, 0, 1.35, h, 1.2, 'gold', { phase: t * .06 + i * .2 });
      const pr = proj({ x, y: -2.0 + h + .35, z: 0 }, c);
      label(pr.x, pr.y, tx, { align: 'center', size: 19 });
    });
    drawBox(c, 0, -2.2, 0, 5.2, .2, 2.0, 'glass', { alpha: .12 });
    if (p && p.avg) label(W / 2, H * .17, p.avg, { align: 'center', size: 26, col: '#9DBBF5', chipEdge: 'rgba(76,126,232,.5)' });
    dust(t, 34, 109, { x: 0, y: 0, w: W, h: H });
  };

  /* dead-flat gold line */
  S.flatline = (t, p) => {
    const c = cam({ rotY: -0.30, rotX: 0.12, oy: H * .04 });
    drawBox(c, 0, -1.6, 0, 5.4, .2, 2.2, 'glass', { alpha: .1 });
    const a = proj({ x: -2.6, y: -1.3, z: 0 }, c), b = proj({ x: 2.6, y: -1.3, z: 0 }, c);
    ctx.save();
    ctx.strokeStyle = goldGrad({ x: a.x, y: a.y - 20, w: b.x - a.x, h: 40 }, t * .25);
    ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(226,180,92,.8)'; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
    label(W / 2, a.y - 90, p && p.l1 || 'NET CHANGE  $0', { align: 'center', size: 26 });
    dust(t, 30, 113, { x: 0, y: 0, w: W, h: H });
  };

  /* two hourglasses: time left vs time gone */
  S.hourglass_pair = (t, p) => {
    const draw = (cx, cy, s, frac, blue) => {
      ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
      ctx.strokeStyle = blue ? 'rgba(140,175,235,.6)' : 'rgba(226,180,92,.6)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-90, -140); ctx.lineTo(90, -140); ctx.lineTo(10, 0); ctx.lineTo(90, 140); ctx.lineTo(-90, 140); ctx.lineTo(-10, 0); ctx.closePath(); ctx.stroke();
      ctx.save(); ctx.clip();
      const g = ctx.createLinearGradient(0, -140, 0, 140);
      g.addColorStop(0, blue ? '#9DBBF5' : GOLD_P); g.addColorStop(1, blue ? '#3F6BC4' : GOLD_M);
      ctx.fillStyle = g;
      ctx.fillRect(-95, -140, 190, 140 * frac);
      ctx.fillRect(-95, 140 - 140 * (1 - frac), 190, 140 * (1 - frac));
      ctx.restore();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 120); ctx.strokeStyle = blue ? 'rgba(157,187,245,.8)' : 'rgba(246,224,172,.9)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    };
    draw(W * .29, H * .44, Math.min(W, H) / 1350, .82, true);
    draw(W * .71, H * .44, Math.min(W, H) / 1350, .12, false);
    label(W * .29, H * .62, p && p.l1 || 'AGE 25', { align: 'center', size: 22, col: '#9DBBF5', chipEdge: 'rgba(76,126,232,.5)' });
    label(W * .71, H * .62, p && p.l2 || 'AGE 55', { align: 'center', size: 22 });
    dust(t, 30, 127, { x: 0, y: 0, w: W, h: H });
  };

  /* vault exit lined with teeth */
  S.vault_teeth = (t, p) => {
    const c = cam({ rotY: -0.34, rotX: 0.14, oy: H * .02 });
    drawBox(c, 0, 0, 0, 3.0, 2.6, 2.1, 'glass', { alpha: .06 });
    const a = proj({ x: -1.5, y: 0, z: -1.05 }, c), b = proj({ x: 1.5, y: 0, z: -1.05 }, c);
    const wgap = b.x - a.x;
    ctx.save();
    for (let i = 0; i < 12; i++) {
      const x = a.x + (i + .5) * wgap / 12;
      const bite = 18 + Math.sin(t * 2 + i) * 5;
      ctx.fillStyle = 'rgba(246,224,172,.92)'; ctx.shadowColor = 'rgba(226,180,92,.6)'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(x - 14, a.y - 130); ctx.lineTo(x + 14, a.y - 130); ctx.lineTo(x, a.y - 130 + bite + 22); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 14, a.y + 130); ctx.lineTo(x + 14, a.y + 130); ctx.lineTo(x, a.y + 130 - bite - 22); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    const ls = (p && p.labels) || ['SURRENDER', 'MVA', 'BONUS RECAPTURE'];
    ls.forEach((tx, i) => label(W / 2, H * .70 + i * 52, tx, { align: 'center', size: 19 }));
    dust(t, 30, 131, { x: 0, y: 0, w: W, h: H });
  };

  /* a single hero block with a headline value inside */
  S.value_block = (t, p) => {
    const c = cam({ rotY: -0.40, rotX: 0.17, oy: H * .06 });
    drawBox(c, 0, -1.35, 0, 3.0, .24, 2.0, 'glass', { alpha: .16 });
    drawBox(c, 0, 0, 0, 2.7, 1.6, 1.8, 'glass', { alpha: .095, ground: false });
    const m = proj({ x: 0, y: 0, z: -1.0 }, c);
    const size = (p && p.size) || 96, txt = (p && p.value) || '25%';
    const broke = p && p.crackAt != null && t > p.crackAt;

    ctx.save(); ctx.font = `800 ${size}px "Sora", sans-serif`;
    const TW = ctx.measureText(txt).width; ctx.restore();
    const HW = TW * .58;
    const fy = u => m.y + Math.sin(u * 8.4 + 1.3) * (size * .085);

    const paint = (dx, dy, clipTop, dim) => {
      ctx.save();
      if (clipTop !== null) {
        ctx.beginPath();
        ctx.moveTo(m.x - HW - 40, fy(0));
        for (let i = 0; i <= 12; i++) { const u = i / 12; ctx.lineTo(m.x - HW - 40 + u * (HW * 2 + 80), fy(u)); }
        ctx.lineTo(m.x + HW + 40, m.y + (clipTop ? -size * 1.5 : size * 1.5));
        ctx.lineTo(m.x - HW - 40, m.y + (clipTop ? -size * 1.5 : size * 1.5));
        ctx.closePath(); ctx.clip();
      }
      ctx.translate(dx, dy);
      ctx.font = `800 ${size}px "Sora", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = goldGrad({ x: m.x - size * 2, y: m.y - size * .7, w: size * 4, h: size * 1.4 }, t * .18);
      if (dim) { ctx.globalAlpha = .72; }
      ctx.shadowColor = 'rgba(226,180,92,.55)'; ctx.shadowBlur = 46;
      ctx.fillText(txt, m.x, m.y);
      ctx.restore();
    };

    if (!broke) paint(0, 0, null, false);
    else {
      paint(-4, -5, true, false);
      paint(11, 16, false, true);
      // the fracture itself
      ctx.save();
      ctx.strokeStyle = 'rgba(3,7,16,.95)'; ctx.lineWidth = 5;
      ctx.shadowColor = 'rgba(76,126,232,.55)'; ctx.shadowBlur = 12;
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const u = i / 12, x = m.x - HW - 14 + u * (HW * 2 + 28);
        i ? ctx.lineTo(x, fy(u)) : ctx.moveTo(x, fy(u));
      }
      ctx.stroke(); ctx.restore();
    }
    if (p && p.l1) label(W / 2, Math.min(H - 40, m.y + size * .95 + 60), p.l1, { align: 'center', size: 20 });
    dust(t, 34, 139, { x: 0, y: 0, w: W, h: H });
  };

  /* end card — heron mark */
  S.mark_end = (t, p) => {
    const img = window.__MARK;
    const cx = W / 2, cy = H * (p && p.cy || .42);
    ctx.save();
    const rg = ctx.createRadialGradient(cx, cy, 10, cx, cy, W * .5);
    rg.addColorStop(0, 'rgba(226,180,92,.20)'); rg.addColorStop(1, 'rgba(226,180,92,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    const pc = cam({ rotY: -0.36, rotX: 0.20, oy: -H * (p && p.cy || .42) + H * .5 });
    drawBox(pc, 0, -1.35, 0, 2.6, .26, 1.9, 'glass', { alpha: .15, edge: 'rgba(240,205,140,.6)' });
    if (img && img.complete && img.naturalWidth) {
      // draw the canonical artwork as-is — the blue underline and white eye stay
      const iw = (p && p.markW) || 244, ih = iw * img.naturalHeight / img.naturalWidth;
      ctx.save();
      ctx.shadowColor = 'rgba(226,180,92,.5)'; ctx.shadowBlur = 46;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, cx - iw / 2, cy - ih / 2, iw, ih);
      ctx.restore();
    }
    dust(t, 46, 149, { x: 0, y: 0, w: W, h: H });
  };

  /* pouring cube → split allocation */
  S.split_cube = (t, p) => {
    const c = cam({ rotY: -0.40, rotX: 0.17, oy: H * .05, z: 7.8 });
    const k = Math.max(.04, Math.min(.95, p && p.split != null ? p.split : .4));
    drawBox(c, 0, -1.30, 0, 5.2, .26, 2.1, 'glass', { alpha: .16 });
    // liquid half — stays yours
    const lw = 2.6 * (1 - k) + .5;
    drawBox(c, -1.35, -.42, 0, lw, 1.5, 1.5, 'gold', { phase: t * .06, ground: false });
    // income half — a glass block with the gold locked inside
    const rw = 2.6 * k + .5;
    let fp = null;
    drawBox(c, 1.5, -.42, 0, rw, 1.5, 1.5, 'glass', {
      alpha: .12, edge: 'rgba(240,205,140,.7)', ground: false,
      onFace: (n, poly) => { if (n === 'front') fp = poly; } });
    if (fp) { const bb = bbox(fp); ctx.save(); tracePoly(fp); ctx.clip();
      fillLiquid({ x: bb.x, y: bb.y, w: bb.w, h: bb.h }, .82, t, t * .09, 12); ctx.restore(); }
    // the divider
    const d = proj({ x: .08, y: -.42, z: 0 }, c);
    ctx.save(); ctx.strokeStyle = 'rgba(226,180,92,.45)'; ctx.lineWidth = 2; ctx.setLineDash([9, 10]);
    ctx.beginPath(); ctx.moveTo(d.x, d.y - 1.15 * d.s); ctx.lineTo(d.x, d.y + .95 * d.s); ctx.stroke(); ctx.restore();
    const a = proj({ x: -1.35, y: -1.30, z: 0 }, c), b = proj({ x: 1.5, y: -1.30, z: 0 }, c);
    label(a.x, Math.min(H - 34, a.y + 92), p && p.l1 || 'LIQUID', { align: 'center', size: 21 });
    if (!p || p.l2 !== '') label(b.x, Math.min(H - 34, b.y + 92), p && p.l2 || 'INCOME', { align: 'center', size: 21 });
    dust(t, 36, 151, { x: 0, y: 0, w: W, h: H });
  };

  /* --------------------------------------------------------------- */
  const CACHE = {};
  let SCENE_CV = null;
  function cached(key, w, h, paint) {
    const k = key + '_' + w + 'x' + h;
    if (CACHE[k]) return CACHE[k];
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const prevCtx = ctx, pw = W, ph = H;
    ctx = cv.getContext('2d'); W = w; H = h;
    paint();
    ctx = prevCtx; W = pw; H = ph;
    CACHE[k] = cv;
    return cv;
  }

  function render(spec, t) {
    const cv = document.getElementById('c');
    const FW = spec.w, FH = spec.h;
    cv.width = FW; cv.height = FH;
    const main = cv.getContext('2d');
    main.clearRect(0, 0, FW, FH);

    W = FW; H = FH; ctx = main; BG_OFF = 0;
    const seed = spec.seed || 1;

    // background + its blurred copy are static per (seed, size) — build once, reuse per frame
    const bg = cached('bg' + seed + (spec.warm || ''), FW, FH, () => background(seed, spec.warm));
    main.drawImage(bg, 0, 0);
    bgBlur = cached('bgb' + seed + (spec.warm || ''), FW, FH, () => {
      ctx.filter = 'blur(26px)'; ctx.drawImage(bg, 0, 0); ctx.filter = 'none';
    });

    // the artwork lives inside a zone so it can never collide with the type
    const z = spec.zone || [0.05, 0.55];
    const zt = Math.round(FH * z[0]), zh = Math.round(FH * z[1]);
    if (!SCENE_CV || SCENE_CV.width !== FW || SCENE_CV.height !== zh) {
      SCENE_CV = document.createElement('canvas'); SCENE_CV.width = FW; SCENE_CV.height = zh;
    }
    const sc = SCENE_CV;
    ctx = sc.getContext('2d'); ctx.clearRect(0, 0, FW, zh);
    W = FW; H = zh; BG_OFF = zt;
    const fn = S[spec.scene] || S.value_block;
    try { fn(t, spec.p || {}); } catch (e) { console.error('scene', spec.scene, e); }
    main.drawImage(sc, 0, zt);

    ctx = main; W = FW; H = FH; BG_OFF = 0;

    // crystal facets + grain: also static per (seed, size)
    const ov = cached('ov' + (spec.seed || 1), FW, FH, () => {
      ctx.save(); ctx.globalAlpha = .035; ctx.strokeStyle = '#DDE9FF'; ctx.lineWidth = 1;
      const r = prng(spec.seed || 1);
      for (let i = 0; i < 16; i++) {
        const x = r() * W, y = r() * H, a = r() * 6.28, l = 140 + r() * 420;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
      }
      ctx.restore();
      grain((spec.seed || 1) * 7 + 3);
    });
    main.drawImage(ov, 0, 0);
  }

  window.HXScene = { render, scenes: Object.keys(S) };
})();

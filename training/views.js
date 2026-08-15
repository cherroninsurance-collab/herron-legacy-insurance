/* Proprietary & Confidential
   Copyright © 2026 Connor Herron. All Rights Reserved.
   Unauthorized distribution or public hosting prohibited. */
/* Producer OS — view renderers.
   Each function returns an HTML string for one screen. All copy comes from
   window.POS_DATA (see data.js) — never hard-code script text here. */

(function () {
  'use strict';

  var D = window.POS_DATA;
  var V = D.views;

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function attr(s) { return esc(s); }
  function join(arr, fn) { return arr.map(fn).join(''); }

  function head(o) {
    return '<div class="vhead">' +
      (o.eyebrow ? '<div class="eyebrow">' + esc(o.eyebrow) + '</div>' : '') +
      '<h1 class="vtitle">' + esc(o.title) + '</h1>' +
      (o.sub ? '<p class="vsub">' + esc(o.sub) + '</p>' : '') +
      (o.pill ? '<div class="pill">' + esc(o.pill) + '</div>' : '') +
      '</div>';
  }

  function tabs(items, activeId, act) {
    return '<div class="tabs" role="tablist">' + join(items, function (t) {
      var on = String(t.id) === String(activeId);
      return '<button role="tab" aria-selected="' + on + '" data-act="' + attr(act) + '" data-id="' + attr(t.id) + '">' +
        esc(t.label) + '</button>';
    }) + '</div>';
  }

  function rail(items, activeIdx, act, label) {
    return (label ? '<div class="label">' + esc(label) + '</div>' : '') +
      '<div class="rail">' + join(items, function (it, i) {
        var on = i === activeIdx;
        return '<button class="rail__card" aria-pressed="' + on + '" data-act="' + attr(act) + '" data-i="' + i + '">' +
          '<span class="rail__num">' + esc(it.num) + '</span>' +
          '<span class="rail__title">' + esc(it.title) + '</span>' +
          '</button>';
      }) + '</div>';
  }

  function label(t) { return '<div class="label">' + esc(t) + '</div>'; }
  function guard(text) {
    return '<div class="guard"><div class="guard__label">' + esc(V.field.guardLabel) + '</div>' +
      '<div class="guard__body">' + esc(text) + '</div></div>';
  }
  function ring(pct, size, color) {
    var off = (188.4 * (1 - pct / 100)).toFixed(1);
    return '<svg class="ring" width="' + size + '" height="' + size + '" viewBox="0 0 68 68" aria-hidden="true">' +
      '<circle cx="34" cy="34" r="30" fill="none" stroke="rgba(148,163,184,.14)" stroke-width="6"></circle>' +
      '<circle cx="34" cy="34" r="30" fill="none" stroke="' + color + '" stroke-width="6" stroke-linecap="round"' +
      ' stroke-dasharray="188.4" stroke-dashoffset="' + off + '" transform="rotate(-90 34 34)"></circle></svg>';
  }

  /* ---------- 1 · Dashboard ---------- */
  function dash(S, prog) {
    var c = V.dash;
    return head({ eyebrow: c.eyebrow, title: c.title, pill: c.goal }) +

      '<div class="card"><div class="ring__wrap">' + ring(prog.pct, 92, '#0EA5E9') +
      '<div><div class="ring__val">' + prog.pct + '%</div>' +
      '<div class="card__title" style="font-size:15px">Your reps</div>' +
      '<div class="card__meta">' + prog.done + ' of ' + prog.total + ' drill items worked through on this device. Reveals, rep-circuit checks and phase advances all count.</div>' +
      '</div></div></div>' +

      '<div class="card">' + label(c.seqLabel) +
      '<div class="seq">' + join(D.nepq.stages, function (s) {
        return '<div class="seq__item"><span class="seq__dot" style="background:' + s.color + '"></span>' + esc(s.name) + '</div>';
      }) + '</div>' +
      '<div class="mono-note">' + esc(c.seqRule) + '</div></div>' +

      '<div class="section">' + label(c.mapLabel) +
      '<div class="grid2">' + join(D.scenarios, function (s) {
        var col = s.mastery >= 70 ? '#10B981' : s.mastery >= 50 ? '#0EA5E9' : '#F59E0B';
        return '<div class="card"><div class="rowsplit">' +
          '<div><div class="mono-note">' + esc(s.tag) + '</div>' +
          '<div class="card__title" style="font-size:15px;margin-top:4px">' + esc(s.title) + '</div></div>' +
          '<div style="position:relative;flex:none;text-align:center">' + ring(s.mastery, 54, col) +
          '<div class="mono-note" style="margin-top:-34px;color:' + col + '">' + s.mastery + '%</div></div>' +
          '</div>' +
          '<div class="card__meta"><b style="color:var(--t-body)">' + esc(s.primary) + '</b><br>Backup: ' + esc(s.backup) + '</div>' +
          '</div>';
      }) + '</div></div>' +

      '<div class="card"><div class="card__title" style="font-size:15px">Ready for the field?</div>' +
      '<div class="card__meta">Install this to your home screen and it works with no signal — every script, rebuttal and drill is cached on the phone. Only Alpha Coach needs a connection.</div></div>';
  }

  /* ---------- 2 · Product Matrix ---------- */
  function matrix() {
    var c = V.matrix, cols = c.cols;
    return head({ eyebrow: c.eyebrow, title: c.title }) +
      '<div class="stack">' + join(D.matrixRows, function (r) {
        return '<div class="card">' +
          '<h2 class="card__title">' + esc(r.product) + '</h2>' +
          '<div class="card--inset stack--tight" style="display:flex;flex-direction:column">' +
          '<div class="mono-note">' + esc(cols[1]) + '</div><div style="font-size:13px;line-height:1.55">' + esc(r.client) + '</div></div>' +
          '<div class="card--inset" style="display:flex;flex-direction:column;gap:4px">' +
          '<div class="mono-note">' + esc(cols[2]) + '</div><div style="font-size:13px;line-height:1.55">' + esc(r.intent) + '</div></div>' +
          '<div class="callout"><div class="callout__label">' + esc(cols[3]) + '</div>' +
          '<div class="callout__body">“' + esc(r.lever) + '”</div></div>' +
          '<div class="rowsplit"><span class="mono-note">' + esc(cols[4]) + '</span><span class="tag">' + esc(r.backup) + '</span></div>' +
          '</div>';
      }) + '</div>';
  }

  /* ---------- 3 · Phone & Appt Setting ---------- */
  function phone() {
    var c = V.phone;
    return head({ eyebrow: c.eyebrow, title: c.title }) +
      '<div class="stack">' + join(D.phoneSteps, function (p) {
        return '<div class="card">' +
          '<div class="rowsplit"><span class="chip-n">' + esc(p.n) + '</span>' +
          '<span class="card__title" style="flex:1;font-size:16px">' + esc(p.title) + '</span></div>' +
          '<div class="script">“' + esc(p.line) + '”</div>' +
          '<div class="mono-note">' + esc(p.note) + '</div></div>';
      }) + '</div>' +
      '<div class="callout callout--ok"><div class="callout__label">' + esc(c.doLabel) + '</div>' +
      join(c.do, function (l) { return '<div class="callout__body">· ' + esc(l) + '</div>'; }) + '</div>' +
      '<div class="callout callout--bad"><div class="callout__label">' + esc(c.dontLabel) + '</div>' +
      join(c.dont, function (l) { return '<div class="callout__body">· ' + esc(l) + '</div>'; }) + '</div>';
  }

  /* ---------- 4 · Field Pipeline ---------- */
  function field(S) {
    var c = V.field, phases = D.fieldPhases, i = Math.min(S.field.phase, phases.length - 1), p = phases[i];
    var body = S.field.lab ? fieldLab(S, p) : fieldArch(S, p, i, phases.length);
    return head({ eyebrow: c.eyebrow, title: c.title, sub: c.sub }) +
      tabs([{ id: 'arch', label: c.tabs[0] }, { id: 'lab', label: c.tabs[1] }], S.field.lab ? 'lab' : 'arch', 'field.mode') +
      body;
  }

  function fieldArch(S, p, i, n) {
    var c = V.field;
    var navItems = D.fieldPhases.map(function (ph, k) { return { num: '0' + (k + 1) + ' · PHASE', title: ph.title }; });
    var last = i === n - 1;
    return rail(navItems, i, 'field.phase', c.railLabel) +
      '<div class="card">' +
      '<div class="rowsplit divider" style="border-top:0;border-bottom:1px solid var(--hair);padding:0 0 12px">' +
      '<div><h2 class="card__title" style="font-size:19px">' + esc(p.title) + '</h2>' +
      '<div class="card__meta" style="margin-top:4px">' + esc(p.objective) + '</div></div>' +
      '<span class="pill pill--ok">' + esc(c.activePill) + '</span></div>' +
      label(c.pitchLabel) +
      '<div class="script">' + esc(p.script) + '</div>' +
      label(c.tipsLabel) +
      '<div class="stack--tight" style="display:flex;flex-direction:column;gap:8px">' +
      join(p.tips, function (t) { return '<div class="tip">' + esc(t) + '</div>'; }) + '</div>' +
      '</div>' +
      guard(p.guard) +
      '<div class="rowsplit">' +
      '<span class="mono-note">PHASE ' + (i + 1) + ' OF ' + n + '</span>' +
      '<button class="btn btn--go" data-act="field.advance">' + (last ? 'Run it in the Coach Lab →' : 'Advance phase →') + '</button>' +
      '</div>';
  }

  function fieldLab(S, p) {
    var c = V.field, per = c.persona, t = c.terminal, fb = S.field.feedback;
    var ready = S.field.input.trim().length > 0 && !S.field.busy;
    return '<div class="card">' +
      '<div class="rowsplit" style="justify-content:flex-start;gap:12px">' +
      '<div class="chip-n" style="width:46px;height:46px;border-radius:12px;background:rgba(245,158,11,.14);border-color:rgba(245,158,11,.4);color:var(--warn-text);font-family:var(--display);font-size:15px">' + esc(per.chip) + '</div>' +
      '<div><div class="card__title" style="font-size:15px">' + esc(per.name) + '</div>' +
      '<div class="mono-note" style="color:var(--warn);margin-top:3px">' + esc(per.tag) + '</div></div></div>' +
      '<div class="divider">' + label(per.stateLabel) +
      '<div class="quote" style="margin-top:8px">' + esc(per.quote) + '</div></div>' +
      '<div class="divider">' + label(per.phaseLabel) +
      '<div style="font-size:13.5px;font-weight:600;color:var(--accent-text);margin-top:6px">' + esc(p.title) + '</div></div>' +
      '</div>' +

      (fb ? '<div class="score">' + join([
        { label: 'TECHNICAL', val: fb.technical, color: '#34D399' },
        { label: 'TONE MOD', val: fb.tone, color: '#7DD3FC' },
        { label: 'OBJECTION', val: fb.objection, color: '#34D399' }
      ], function (s) {
        return '<div class="score__card"><div class="score__label">' + esc(s.label) + '</div>' +
          '<div class="score__val" style="color:' + s.color + '">' + esc(s.val) + '<span>/10</span></div></div>';
      }) + '</div>' : '') +

      '<div class="card">' +
      '<div class="rowsplit"><h2 class="card__title" style="font-size:16px">' + esc(t.title) + '</h2></div>' +
      '<textarea class="field" id="fieldInput" placeholder="' + attr(t.placeholder) + '">' + esc(S.field.input) + '</textarea>' +
      (S.field.err ? '<div class="callout callout--bad"><div class="callout__body">' + esc(S.field.err) + '</div></div>' : '') +
      (fb ? '<div class="callout"><div class="callout__label">' + esc(t.breakdown) + '</div>' +
        '<div class="callout__body">' + esc(fb.fix) + '</div></div>' +
        '<div class="callout callout--ok"><div class="callout__label">' + esc(t.nextMove) + '</div>' +
        '<div class="callout__body" style="font-style:italic">' + esc(fb.next) + '</div></div>' : '') +
      '<div class="rowsplit divider" style="justify-content:flex-end;gap:8px">' +
      '<button class="btn btn--ghost" data-act="field.clear">' + esc(t.clear) + '</button>' +
      '<button class="btn btn--go" data-act="field.grade"' + (ready ? '' : ' disabled') + '>' +
      esc(S.field.busy ? t.grading : t.grade) + '</button>' +
      '</div></div>';
  }

  /* ---------- 5 · Memory Vault ---------- */
  function mem(S) {
    var c = V.mem, tab = S.mem.tab;
    var out = head({ eyebrow: c.eyebrow, title: c.title, sub: c.sub }) + tabs(c.tabs, tab, 'mem.tab');
    if (tab === 'mind') return out + memMind();
    if (tab === 'drill') return out + memDrill(S);

    var prods = D.memProds, pi = 0;
    prods.forEach(function (p, i) { if (p.id === S.mem.prod) pi = i; });
    var cur = prods[pi];
    out += rail(prods.map(function (p) { return { num: p.who, title: p.label }; }), pi, 'mem.prod', c.railLabel);
    return out + (tab === 'reb' ? memReb(S, cur) : memAsk(cur));
  }

  function memAsk(cur) {
    var c = V.mem;
    return '<div class="card"><h2 class="card__title">' + esc(cur.label) + ' · Opening Questions</h2>' +
      '<div class="card__meta">' + esc(cur.frame) + '</div></div>' +
      '<div class="stack">' + join(cur.qs, function (q) {
        return '<div class="card">' +
          '<div style="display:flex;gap:13px;align-items:flex-start">' +
          '<span class="chip-n">' + esc(q.n) + '</span>' +
          '<div style="flex:1;display:flex;flex-direction:column;gap:9px">' +
          '<div class="reveal__q">' + esc(q.ask) + '</div>' +
          '<div class="kv"><span class="kv__k k-why">WHY</span><span class="kv__v" style="font-size:12.5px;color:var(--t-dim)">' + esc(q.why) + '</span></div>' +
          '<div class="kv"><span class="kv__k k-then">THEN</span><span class="kv__v" style="font-size:12.5px;color:var(--t-dim);font-style:italic">' + esc(q.follow) + '</span></div>' +
          '</div></div></div>';
      }) + '</div>' +
      '<div class="callout"><div class="callout__label">' + esc(c.askRuleLabel) + '</div>' +
      '<div class="callout__body">' + esc(c.askRule) + '</div></div>';
  }

  function memReb(S, cur) {
    var c = V.mem;
    var allOpen = cur.rebs.every(function (_, i) { return S.mem.reb[cur.id + i]; });
    return '<div class="card"><h2 class="card__title">' + esc(cur.label) + ' · Rebuttals</h2>' +
      '<div class="card__meta">' + esc(c.rebSub) + '</div>' +
      '<button class="btn btn--soft btn--wide" data-act="mem.reb.all">' + (allOpen ? 'Hide all answers' : 'Reveal all answers') + '</button></div>' +
      '<div class="stack">' + join(cur.rebs, function (r, i) {
        var open = !!S.mem.reb[cur.id + i];
        return '<button class="reveal" aria-expanded="' + open + '" data-act="mem.reb" data-k="' + attr(cur.id + i) + '">' +
          '<div class="rowsplit"><span class="kv__k k-they" style="width:auto">THEY SAY</span>' +
          '<span class="reveal__hint">' + esc(r.hint) + '</span></div>' +
          '<div class="reveal__q">“' + esc(r.obj) + '”</div>' +
          (open ? '<div class="divider" style="display:flex;flex-direction:column;gap:10px">' +
            '<div class="kv"><span class="kv__k k-say">YOU SAY</span><span class="kv__v" style="font-size:14.5px">' + esc(r.say) + '</span></div>' +
            '<div class="kv"><span class="kv__k k-move">MOVE</span><span class="kv__v" style="font-size:12.5px;color:var(--t-dim)">' + esc(r.move) + '</span></div>' +
            '</div>' : '<div class="mono-note">▾ TAP TO REVEAL</div>') +
          '</button>';
      }) + '</div>';
  }

  function memMind() {
    var c = V.mem;
    return '<div class="card" style="border-left:3px solid var(--success)">' +
      label(c.mindLabel) +
      '<div style="font-family:var(--display);font-weight:700;font-size:18px;line-height:1.4;color:var(--t-high)">' + esc(c.mindHero) + '</div>' +
      '<div class="card__meta">' + esc(c.mindBody) + '</div></div>' +
      '<div class="stack">' + join(D.memMind, function (m) {
        return '<div class="card">' +
          '<div class="rowsplit" style="justify-content:flex-start;gap:10px">' +
          '<span class="mono-note">' + esc(m.num) + '</span>' +
          '<span class="card__title" style="font-size:14.5px;color:var(--accent-text)">' + esc(m.rule) + '</span></div>' +
          '<div style="font-size:13px;line-height:1.6">' + esc(m.body) + '</div>' +
          '<div class="divider" style="font-size:12.5px;font-style:italic;line-height:1.6;color:var(--t-dim)">' + esc(m.say) + '</div>' +
          '</div>';
      }) + '</div>';
  }

  function memDrill(S) {
    var c = V.mem, steps = D.memDrill;
    var openN = steps.filter(function (_, i) { return S.mem.drill[i]; }).length;
    return '<div class="card"><h2 class="card__title">' + esc(c.drillTitle) + '</h2>' +
      '<div class="card__meta">' + esc(c.drillSub) + '</div>' +
      '<div class="rowsplit"><span class="mono-note">' + openN + ' / ' + steps.length + ' REVEALED</span></div>' +
      '<div class="bar"><div class="bar__fill" style="width:' + (openN / steps.length * 100) + '%"></div></div>' +
      '<button class="btn btn--soft btn--wide" data-act="mem.drill.all">' +
      (openN === steps.length ? 'Hide all lines' : 'Reveal all lines') + '</button></div>' +
      '<div class="stack">' + join(steps, function (d, i) {
        var open = !!S.mem.drill[i];
        return '<button class="reveal" aria-expanded="' + open + '" data-act="mem.drill" data-i="' + i + '">' +
          '<div class="rowsplit" style="align-items:flex-start">' +
          '<span class="chip-n' + (open ? '' : ' chip-n--off') + '" style="width:30px;height:30px">' + esc(d.n) + '</span>' +
          '<span class="card__title" style="flex:1;font-size:15px;margin-left:2px">' + esc(d.beat) + '</span>' +
          '<span class="reveal__hint">' + esc(d.state) + '</span></div>' +
          '<div class="card__meta">' + esc(d.cue) + '</div>' +
          (open ? '<div class="script">' + esc(d.line) + '</div>' : '<div class="mono-note">▾ TAP FOR THE LINE</div>') +
          '</button>';
      }) + '</div>';
  }

  /* ---------- 6 · Call Academy ---------- */
  function acad(S) {
    var c = V.acad, tab = S.acad.tab;
    var out = head({ eyebrow: c.eyebrow, title: c.title, pill: c.pill }) + tabs(c.tabs, tab, 'acad.tab');
    if (tab === 'prosp') return out + acadProsp();
    if (tab === 'close') return out + acadClose();
    if (tab === 'drill') return out + acadDrill(S);
    return out + acadFound(S);
  }

  function acadFound(S) {
    var c = V.acad;
    return '<div class="stack">' + join(c.layers, function (l) {
      return '<div class="card">' + label(l.tag) +
        '<h2 class="card__title">' + esc(l.name) + '</h2>' +
        '<div class="card__meta">' + esc(l.body) + ' <b style="color:var(--accent-text)">' + esc(l.q) + '</b></div></div>';
    }) + '</div>' +

      '<div class="section">' + label(c.vossLabel) +
      join(D.acad.vossTools, function (v, i) {
        var open = !!S.acad.voss[i];
        return '<button class="reveal" aria-expanded="' + open + '" data-act="acad.voss" data-i="' + i + '">' +
          '<div class="rowsplit"><span class="mono-note" style="color:var(--warn-text)">' + esc(v.tag) + '</span>' +
          '<span class="reveal__hint">' + (open ? '▲' : '▼') + '</span></div>' +
          '<div class="card__title" style="font-size:15px">' + esc(v.name) + '</div>' +
          '<div style="font-size:13px;line-height:1.6;color:var(--t-body)">' + esc(v.what) + '</div>' +
          (open ? '<div class="divider" style="display:flex;flex-direction:column;gap:9px">' +
            '<div class="script script--warn">' + esc(v.example) + '</div>' +
            '<div class="mono-note" style="color:var(--warn-text)">DRILL · ' + esc(v.drill) + '</div></div>' : '') +
          '</button>';
      }) + '</div>' +

      '<div class="card">' + label(c.funnelLabel) +
      '<div class="card__meta">' + esc(c.funnelSub) + '</div>' +
      '<div class="stack--tight" style="display:flex;flex-direction:column;gap:8px">' +
      join(D.acad.funnelQs, function (f) {
        return '<div class="card--inset" style="display:flex;flex-direction:column;gap:5px">' +
          '<div class="rowsplit"><span class="mono-note">' + esc(f.n) + '</span>' +
          '<span class="tag" style="color:' + (f.lvl === 'SURFACE' ? '#7DD3FC' : f.lvl === 'FINANCIAL' ? '#FBBF24' : '#F87171') + '">' + esc(f.lvl) + '</span></div>' +
          '<div style="font-size:13.5px;line-height:1.55;color:var(--t-body)">“' + esc(f.q) + '”</div></div>';
      }) + '</div>' +
      '<div class="mono-note" style="line-height:1.7"><b style="color:var(--accent-text)">' + esc(c.funnelRuleLabel) + '</b> ' + esc(c.funnelRule) + '</div>' +
      '</div>' +

      '<div class="card">' + label(c.contractLabel) +
      '<div class="script">' + esc(c.contract) + '</div>' +
      '<div class="mono-note" style="line-height:1.7">' + esc(c.contractNote) + '</div></div>' +

      '<div class="card">' + label(c.painLevelsLabel) +
      join(c.painLevels, function (p) {
        return '<div class="card--inset" style="display:flex;flex-direction:column;gap:5px;border-left:3px solid ' + p.color + '">' +
          '<span class="mono-note" style="color:' + p.color + '">' + esc(p.lvl) + '</span>' +
          '<span style="font-size:13.5px;line-height:1.55">' + esc(p.line) + '</span></div>';
      }) +
      '<div class="mono-note">' + esc(c.painLevelsNote) + '</div></div>';
  }

  function acadProsp() {
    var c = V.acad;
    return '<div class="section">' + label(c.fiveLabel) +
      join(D.acad.fiveSteps, function (s) {
        return '<div class="card"><div class="rowsplit" style="justify-content:flex-start;gap:10px">' +
          '<span class="chip-n">' + esc(s.n) + '</span>' +
          '<span class="card__title" style="font-size:15px">' + esc(s.title) + '</span></div>' +
          '<div class="script">“' + esc(s.line) + '”</div>' +
          '<div class="mono-note" style="line-height:1.7">' + esc(s.note) + '</div></div>';
      }) + '</div>' +

      '<div class="section">' + label(c.rboLabel) +
      join(D.acad.rboTypes, function (r) {
        var col = r.tag === 'REFLEX RESPONSE' ? '#F87171' : r.tag === 'BRUSH-OFF' ? '#FBBF24' : '#34D399';
        return '<div class="card" style="border-color:' + col + '55">' +
          '<span class="mono-note" style="color:' + col + '">' + esc(r.tag) + '</span>' +
          '<div class="reveal__q">“' + esc(r.q) + '”</div>' +
          '<div class="card__meta">' + esc(r.what) + '</div>' +
          '<div class="mono-note" style="color:' + col + '">▸ ' + esc(r.move) + '</div></div>';
      }) + '</div>' +

      '<div class="section">' + label(c.turnLabel) +
      '<div class="muted">' + esc(c.turnSub) + '</div>' +
      join(D.acad.turnRows, function (t) {
        return '<div class="card"><div class="reveal__q">“' + esc(t.obj) + '”</div>' +
          '<div class="divider" style="display:flex;flex-direction:column;gap:9px">' +
          '<div class="kv"><span class="kv__k k-move">LEDGE</span><span class="kv__v">' + esc(t.ledge) + '</span></div>' +
          '<div class="kv"><span class="kv__k k-why">DISRUPT</span><span class="kv__v">' + esc(t.disrupt) + '</span></div>' +
          '<div class="kv"><span class="kv__k k-say">ASK</span><span class="kv__v">' + esc(t.ask) + '</span></div>' +
          '</div></div>';
      }) +
      '<div class="mono-note" style="line-height:1.7"><b style="color:var(--accent-text)">' + esc(c.ledgeNoteLabel) + '</b> ' + esc(c.ledgeNote) + '</div></div>' +

      '<div class="section">' + label(c.lawsLabel) +
      join(D.acad.pipeLaws, function (p) {
        return '<div class="card"><div class="card__title" style="font-size:14.5px;color:var(--accent-text)">' + esc(p.name) + '</div>' +
          '<div style="font-size:13px;line-height:1.6">' + esc(p.what) + '</div></div>';
      }) + '</div>';
  }

  function acadClose() {
    var c = V.acad;
    return '<div class="guard"><div class="guard__label">' + esc(c.guardLabel) + '</div>' +
      '<div class="guard__body">' + esc(c.guard) + '</div></div>' +
      '<div class="section">' + label(c.galleryLabel) +
      join(D.acad.masterCloses, function (m) {
        return '<div class="card"><div class="rowsplit">' +
          '<span class="card__title" style="font-size:15px">' + esc(m.name) + '</span>' +
          '<span class="tag">' + esc(m.master) + '</span></div>' +
          '<div class="mono-note">WHEN · ' + esc(m.when) + '</div>' +
          '<div class="script">“' + esc(m.script) + '”</div>' +
          '<div class="card__meta">' + esc(m.why) + '</div></div>';
      }) + '</div>' +
      '<div class="card"><div class="rowsplit" style="justify-content:flex-start;gap:12px">' +
      '<span class="chip-n" style="width:38px;height:38px;font-size:16px;font-family:var(--display)">6</span>' +
      '<span class="card__title">' + esc(c.sixTitle) + '</span></div>' +
      '<div style="font-size:13px;line-height:1.65">' + esc(c.sixBody) + '</div></div>';
  }

  function acadDrill(S) {
    var c = V.acad, list = D.acad.drills;
    var done = list.filter(function (_, i) { return S.acad.drills[i]; }).length;
    return '<div class="card">' + label(c.circuitLabel) +
      '<div class="card__meta">' + esc(c.circuitSub) + '</div>' +
      '<div class="rowsplit"><span class="mono-note">' + done + ' / ' + list.length + '</span>' +
      '<button class="btn btn--ghost" style="min-height:38px;padding:8px 14px;font-size:12px" data-act="acad.drill.reset">' + esc(c.circuitReset) + '</button></div>' +
      '<div class="bar"><div class="bar__fill" style="width:' + (done / list.length * 100) + '%"></div></div></div>' +
      '<div class="stack--tight" style="display:flex;flex-direction:column;gap:8px">' +
      join(list, function (d, i) {
        var on = !!S.acad.drills[i];
        return '<button class="reveal" role="checkbox" aria-checked="' + on + '" data-act="acad.drill" data-i="' + i + '"' +
          ' style="flex-direction:row;align-items:flex-start;gap:11px;background:' + (on ? 'rgba(16,185,129,.08)' : 'var(--inset)') +
          ';border-color:' + (on ? 'rgba(16,185,129,.4)' : 'var(--bd-card)') + '">' +
          '<span style="font-family:var(--mono);font-size:15px;line-height:1.2;color:' + (on ? '#34D399' : '#475569') + '">' + (on ? '✓' : '·') + '</span>' +
          '<span style="flex:1"><span style="display:block;font-size:14px;font-weight:600;color:var(--t-high)">' + esc(d.name) + '</span>' +
          '<span style="display:block;font-size:12.5px;line-height:1.55;color:var(--t-subtle);margin-top:3px">' + esc(d.how) + '</span></span>' +
          '</button>';
      }) + '</div>';
  }

  /* ---------- 7 · Sales Blueprint ---------- */
  function blue(S) {
    var c = V.blue, t = S.blue.tab, B = D.blue;
    var out = head({ eyebrow: c.eyebrow, title: c.title, pill: c.pill }) +
      tabs(B.tabs.map(function (l, i) { return { id: i + 1, label: l }; }), t, 'blue.tab');

    if (t === 1) {
      out += join(B.p1Scripts, function (ch) {
        return '<div class="card"><div class="rowsplit">' +
          '<span class="mono-note">' + esc(ch.tag) + '</span>' +
          '<span class="card__title" style="font-size:16px">' + esc(ch.title) + '</span></div>' +
          join(ch.stages, function (s) {
            return '<div class="divider" style="display:flex;flex-direction:column;gap:9px">' +
              label(s.label) +
              '<div class="script">' + esc(s.script) + '</div>' +
              '<div class="mono-note" style="line-height:1.7">▸ ' + esc(s.note) + '</div></div>';
          }) + '</div>';
      });
    } else if (t === 2) {
      out += join(B.p2Banks, function (b) {
        return '<div class="section"><div class="card">' +
          '<h2 class="card__title" style="font-size:15px;color:' + esc(b.color || '#F1F5F9') + '">' + esc(b.name) + '</h2>' +
          '<div class="card__meta">' + esc(b.intro) + '</div></div>' +
          join(b.qs, function (q) {
            return '<div class="card"><div class="reveal__q">“' + esc(q.q) + '”</div>' +
              '<div class="divider card__meta">' + esc(q.why) + '</div></div>';
          }) + '</div>';
      });
    } else if (t === 3) {
      out += '<div class="section">' + label(c.p3TransLabel) +
        join(B.p3Trans, function (x) {
          return '<div class="card"><span class="mono-note" style="color:var(--accent-text)">' + esc(x.tag) + '</span>' +
            '<div class="script">' + esc(x.line) + '</div></div>';
        }) + '</div>' +
        '<div class="card">' + label(c.coiLabel) +
        '<div class="card__meta">' + esc(c.coiSub) + '</div>' +
        join(B.coiSteps, function (s) {
          return '<div class="card--inset" style="display:flex;flex-direction:column;gap:6px">' +
            '<div class="rowsplit" style="justify-content:flex-start;gap:9px"><span class="mono-note">' + esc(s.n) + '</span>' +
            '<span class="mono-note" style="color:var(--accent-text)">' + esc(s.name) + '</span></div>' +
            '<div style="font-size:13.5px;line-height:1.6">“' + esc(s.text) + '”</div></div>';
        }) + '</div>' +
        '<div class="section">' + label(c.analogyLabel) +
        join(B.p3Analogies, function (a) {
          return '<div class="card"><div class="rowsplit">' +
            '<span class="tag">' + esc(a.product) + '</span>' +
            '<span class="card__title" style="font-size:15px">' + esc(a.title) + '</span></div>' +
            '<div class="script">“' + esc(a.text) + '”</div></div>';
        }) + '</div>';
    } else if (t === 4) {
      out += '<div class="section">' + label(c.objLabel) +
        join(B.p4Objections, function (o, i) {
          var open = !!S.blue.obj[i];
          return '<button class="reveal" aria-expanded="' + open + '" data-act="blue.obj" data-i="' + i + '">' +
            '<div class="rowsplit"><span class="mono-note" style="color:var(--danger-text)">' + esc(o.n) + '</span>' +
            '<span class="reveal__hint">' + (open ? '▲ CLOSE' : '▼ OPEN THE PLAY') + '</span></div>' +
            '<div class="reveal__q">“' + esc(o.obj) + '”</div>' +
            (open ? '<div class="divider" style="display:flex;flex-direction:column;gap:11px">' +
              '<div><div class="mono-note">' + esc(c.objSteps[0]) + '</div><div class="callout__body">“' + esc(o.ack) + '”</div></div>' +
              '<div><div class="mono-note">' + esc(c.objSteps[1]) + '</div><div class="callout__body">“' + esc(o.iso) + '”</div></div>' +
              '<div><div class="mono-note">' + esc(c.objSteps[2]) + '</div><div class="callout__body">“' + esc(o.pivot) + '”</div></div>' +
              '<div class="script script--ok"><span class="mono-note" style="color:var(--success-text);display:block;margin-bottom:7px">' + esc(c.killLabel) + '</span>“' + esc(o.kill) + '”</div>' +
              '<div class="mono-note" style="line-height:1.7">▸ ' + esc(o.psych) + '</div></div>' : '') +
            '</button>';
        }) + '</div>';
    } else if (t === 5) {
      out += join(B.p5Closes, function (x) {
        return '<div class="card"><span class="mono-note" style="color:var(--accent-text)">' + esc(x.tag) + '</span>' +
          '<h2 class="card__title" style="font-size:16px">' + esc(x.name) + '</h2>' +
          '<div class="script">' + esc(x.script) + '</div>' +
          '<div class="mono-note" style="line-height:1.7">▸ ' + esc(x.why) + '</div></div>';
      }) +
        '<div class="section">' + label(c.tieLabel) +
        join(B.p5TieDowns, function (x) {
          return '<div class="card--inset" style="display:flex;flex-direction:column;gap:6px">' +
            '<span class="mono-note" style="color:var(--accent-text)">' + esc(x.when) + '</span>' +
            '<span style="font-size:13.5px;line-height:1.6">“' + esc(x.line) + '”</span></div>';
        }) + '</div>' +
        '<div class="card">' + label(c.appLabel) +
        '<div class="script">' + esc(B.appTransition) + '</div>' +
        '<div class="mono-note" style="line-height:1.7">▸ ' + esc(B.appTransNote) + '</div></div>';
    } else {
      out += '<div class="section">' + label(c.mapLabel) +
        join(B.p6Map, function (m) {
          return '<div class="card"><div class="rowsplit">' +
            '<span class="card__title" style="font-size:15px">' + esc(m.feature) + '</span>' +
            '<button class="btn btn--soft" style="min-height:36px;padding:7px 12px;font-size:11.5px" data-act="go" data-id="' + attr(m.view) + '">OPEN →</button></div>' +
            '<div style="font-size:13px;line-height:1.6">' + esc(m.content) + '</div>' +
            '<div class="mono-note" style="line-height:1.7">▸ ' + esc(m.how) + '</div></div>';
        }) + '</div>';
    }
    return out;
  }

  /* ---------- 8 · Script Playbooks ---------- */
  function scripts(S) {
    var c = V.scripts, list = D.scripts;
    var cur = list.filter(function (s) { return s.id === S.scripts.tab; })[0] || list[0];
    var out = head({ eyebrow: c.eyebrow, title: c.title }) +
      tabs(list.map(function (s) { return { id: s.id, label: s.label }; }), cur.id, 'scripts.tab') +
      '<div class="card"><h2 class="card__title">' + esc(cur.label) + '</h2>' +
      '<div class="card__meta">' + esc(cur.tagline) + '</div>' +
      '<div class="mono-note" style="line-height:1.7">' + esc(c.flow) + '</div></div>' +
      '<div class="stack">' + join(cur.stages, function (q, i) {
        var st = D.nepq.stages[i], alt = (cur.alts || [])[i] || '';
        return '<div class="card">' +
          '<div class="rowsplit"><span class="mono-note">STAGE ' + esc(st.n) + '</span>' +
          '<span class="tag" style="color:' + st.color + ';border-color:' + st.color + '55">' + esc(st.name) + '</span></div>' +
          '<div class="script" style="border-left-color:' + st.color + '">“' + esc(q) + '”</div>' +
          (alt ? '<div class="kv"><span class="kv__k k-move">ALT</span><span class="kv__v" style="font-size:13px;color:var(--t-dim)">“' + esc(alt) + '”</span></div>' : '') +
          '<div class="mono-note" style="line-height:1.7">▸ ' + esc(st.hint) + '</div></div>';
      }) + '</div>';

    if (cur.id === 'iul') out += iulBlock(S);
    return out;
  }

  function iulBlock(S) {
    var c = V.scripts.iul, laser = S.scripts.iul === 'laser', m = laser ? c.laser : c.trad;
    return '<div class="card">' + label(c.label) +
      '<div class="card__meta">' + esc(c.sub) + '</div>' +
      tabs([{ id: 'trad', label: c.modes[0] }, { id: 'laser', label: c.modes[1] }], laser ? 'laser' : 'trad', 'scripts.iulmode') +
      '<div class="card--inset" style="display:flex;flex-direction:column;gap:9px">' +
      '<div class="rowsplit"><span class="mono-note">' + m.insPct + '% BUYS INSURANCE</span>' +
      '<span class="mono-note" style="color:var(--success-text)">' + m.cashPct + '% BUILDS CASH</span></div>' +
      '<div class="bar" style="height:14px;display:flex">' +
      '<div style="width:' + m.insPct + '%;background:rgba(148,163,184,.35)"></div>' +
      '<div style="width:' + m.cashPct + '%;background:linear-gradient(90deg,#0EA5E9,#10B981)"></div></div></div>' +
      '<div class="card--inset" style="display:flex;flex-direction:column;gap:4px">' +
      '<span class="mono-note">' + esc(c.rows[0]) + '</span>' +
      '<span style="font-family:var(--display);font-weight:700;font-size:19px;color:var(--t-high)">' + esc(m.db) + '</span>' +
      '<span class="muted">' + esc(m.dbNote) + '</span></div>' +
      '<div class="card--inset" style="display:flex;flex-direction:column;gap:4px">' +
      '<span class="mono-note">' + esc(c.rows[1]) + '</span>' +
      '<span style="font-family:var(--display);font-weight:700;font-size:19px;color:' + m.cashColor + '">' + esc(m.cash) + '</span>' +
      '<span class="muted">' + esc(m.cashNote) + '</span></div>' +
      '<div class="card--inset" style="display:flex;flex-direction:column;gap:4px">' +
      '<span class="mono-note">' + esc(c.rows[2]) + '</span>' +
      '<span style="font-family:var(--display);font-weight:700;font-size:17px;color:var(--t-high)">' + esc(m.tax) + '</span>' +
      '<span class="muted">' + esc(m.taxNote) + '</span></div>' +
      '<div class="callout"><div class="callout__label">' + esc(c.ruleLabel) + '</div>' +
      '<div class="callout__body">' + esc(c.rule) + '</div></div></div>' +

      '<div class="section">' + label(c.stackLabel) +
      join(c.riders, function (r) {
        return '<div class="card"><span class="mono-note" style="color:var(--accent-text)">' + esc(r.tag) + '</span>' +
          '<h2 class="card__title" style="font-size:16px">' + esc(r.name) + '</h2>' +
          '<div style="font-size:13px;line-height:1.65">' + esc(r.body) + '</div>' +
          join(r.facts, function (f) { return '<div class="mono-note">· ' + esc(f) + '</div>'; }) +
          '<div class="script">' + esc(r.quote) + '</div>' +
          '<div class="mono-note" style="line-height:1.7">' + esc(r.note) + '</div></div>';
      }) + '</div>';
  }

  /* ---------- 9 · Live Role-Play Arena ---------- */
  function arena(S) {
    var c = V.arena, a = S.arena;
    var painCount = c.pains.filter(function (_, i) { return a.pains[i]; }).length;
    var counting = typeof a.count === 'number', isGo = a.count === 'GO';
    return head({ eyebrow: c.eyebrow, title: c.title, pill: c.pill }) +
      '<div class="card">' +
      '<span class="mono-note" style="color:var(--danger-text)">' + esc(c.scenarioTag) + '</span>' +
      '<h2 class="card__title">' + esc(c.scenarioName) + '</h2>' +
      '<div class="card__meta">' + esc(c.scenario) + '</div>' +
      '<div class="divider callout"><div class="callout__label">' + esc(c.objectiveLabel) + '</div>' +
      '<div class="callout__body">' + esc(c.objective) + '</div></div></div>' +

      '<div class="card">' + label(c.trackerLabel) +
      '<div class="rowsplit"><span class="mono-note">' + painCount + ' / ' + c.painGoal + ' UNCOVERED</span></div>' +
      '<div class="bar"><div class="bar__fill" style="width:' + Math.min(100, painCount / c.painGoal * 100) + '%"></div></div>' +
      '<div class="stack--tight" style="display:flex;flex-direction:column;gap:8px">' +
      join(c.pains, function (p, i) {
        var on = !!a.pains[i];
        return '<button class="reveal" role="checkbox" aria-checked="' + on + '" data-act="arena.pain" data-i="' + i + '"' +
          ' style="flex-direction:row;align-items:center;gap:10px;background:' + (on ? 'rgba(16,185,129,.14)' : 'var(--inset)') +
          ';border-color:' + (on ? 'rgba(16,185,129,.5)' : 'rgba(148,163,184,.18)') + '">' +
          '<span style="font-family:var(--mono);color:' + (on ? '#34D399' : '#94A3B8') + '">' + (on ? '✓' : '+') + '</span>' +
          '<span style="font-size:13.5px;color:' + (on ? '#34D399' : '#94A3B8') + '">' + esc(p) + '</span></button>';
      }) + '</div>' +
      '<div class="rowsplit" style="gap:8px">' +
      '<button class="btn btn--go" style="flex:1" data-act="arena.pitch">' + esc(c.attempt) + '</button>' +
      '<button class="btn btn--ghost" data-act="arena.reset">' + esc(c.reset) + '</button></div>' +
      (a.pitch === 'kill' ? '<div class="callout callout--bad"><div class="callout__label">' + esc(c.killLabel) + '</div>' +
        '<div class="callout__body">You pitched with ' + painCount + '/' + c.painGoal + ' pain points uncovered. The prospect owes you nothing yet — back to Problem Awareness.</div></div>' : '') +
      (a.pitch === 'clear' ? '<div class="callout callout--ok"><div class="callout__label">' + esc(c.clearLabel) + '</div>' +
        '<div class="callout__body">' + painCount + ' pains confirmed. Transition to Solution Awareness — let them ask for the solution.</div></div>' : '') +
      '</div>' +

      '<div class="card">' + label(c.silenceLabel) +
      '<div style="display:flex;align-items:center;gap:14px">' +
      '<div style="width:66px;height:66px;flex:none;border-radius:50%;display:grid;place-items:center;border:2px solid ' +
      (isGo ? 'rgba(16,185,129,.7)' : counting ? 'rgba(245,158,11,.7)' : 'rgba(148,163,184,.25)') + ';font-family:var(--display);font-weight:700;font-size:22px;color:' +
      (isGo ? '#34D399' : counting ? '#FBBF24' : '#475569') + '">' + esc(a.count === null ? '—' : a.count) + '</div>' +
      '<div class="card__meta" style="flex:1">' + esc(c.silenceCopy) + '</div></div>' +
      '<button class="btn btn--soft btn--wide" data-act="arena.timer">' + esc(c.silenceBtn) + '</button></div>' +

      '<div class="card">' + label(c.toneLabel) +
      tabs(c.tones ? Object.keys(c.tones).map(function (k) { return { id: k, label: k }; }) : [], a.tone, 'arena.tone') +
      '<div class="card__meta">' + esc(c.tones[a.tone]) + '</div></div>' +

      '<div class="card">' + label(c.rulesLabel) +
      join(c.rules, function (r, i) {
        return '<div class="rowsplit" style="justify-content:flex-start;gap:10px">' +
          '<span class="mono-note">0' + (i + 1) + '</span><span style="font-size:13px;line-height:1.55">' + esc(r) + '</span></div>';
      }) + '</div>' +

      '<div class="vhead" style="margin-top:6px">' +
      '<div class="eyebrow">' + esc(c.objEyebrow) + '</div>' +
      '<h2 class="vtitle" style="font-size:20px">' + esc(c.objTitle) + '</h2></div>' +
      '<div class="stack">' + join(D.objections, function (o, i) {
        var open = !!a.flip[i];
        return '<button class="reveal" aria-expanded="' + open + '" data-act="arena.flip" data-i="' + i + '">' +
          '<div class="rowsplit"><span class="mono-note">OBJECTION 0' + (i + 1) + ' · ' + esc(o.tag) + '</span></div>' +
          '<div class="reveal__q">“' + esc(o.q) + '”</div>' +
          (open ? '<div class="divider" style="display:flex;flex-direction:column;gap:10px">' +
            '<div><div class="mono-note" style="color:var(--accent-text)">CLARIFY</div><div class="callout__body">' + esc(o.clarify) + '</div></div>' +
            '<div><div class="mono-note" style="color:var(--warn-text)">DISCUSS</div><div class="callout__body">' + esc(o.discuss) + '</div></div>' +
            '<div><div class="mono-note" style="color:var(--success-text)">DIFFUSE</div><div class="callout__body">' + esc(o.diffuse) + '</div></div>' +
            '<div class="mono-note">' + esc(c.flipBack) + '</div></div>'
            : '<div class="mono-note">' + esc(c.flipHint) + '</div>') +
          '</button>';
      }) + '</div>';
  }

  /* ---------- 10 · The Closing Room ---------- */
  function closeRoom() {
    var c = V.close;
    return head({ eyebrow: c.eyebrow, title: c.title, pill: c.pill }) +
      '<div class="section">' + label(c.seqLabel) +
      join(c.seq, function (s) {
        return '<div class="card"><div class="rowsplit" style="justify-content:flex-start;gap:10px">' +
          '<span class="chip-n">' + esc(s.n) + '</span>' +
          '<span class="card__title" style="font-size:15px">' + esc(s.name) + '</span></div>' +
          '<div class="script">' + esc(s.line) + '</div>' +
          '<div class="mono-note" style="line-height:1.7">' + esc(s.note) + '</div></div>';
      }) + '</div>' +
      '<div class="card">' + label(c.autopsyLabel) +
      '<div class="script">' + esc(c.autopsyLine) + '</div>' +
      join(c.autopsy, function (a) {
        return '<div class="card--inset" style="display:flex;flex-direction:column;gap:5px">' +
          '<span class="mono-note" style="color:var(--accent-text)">' + esc(a.tag) + '</span>' +
          '<span style="font-size:13px;line-height:1.6">' + esc(a.body) + '</span></div>';
      }) + '</div>' +
      '<div class="card"><div class="rowsplit">' + label(c.silenceLabel) +
      '<span style="font-family:var(--display);font-weight:700;font-size:20px;color:var(--warn-text)">' + esc(c.silenceValue) + '</span></div>' +
      '<div style="font-size:13px;line-height:1.65">' + esc(c.silenceBody) + '</div></div>' +
      '<div class="section">' + label(c.linesLabel) +
      join(c.lines, function (l) {
        return '<div class="card"><span class="mono-note" style="color:var(--accent-text)">' + esc(l.tag) + '</span>' +
          '<div class="script">' + esc(l.line) + '</div>' +
          '<div class="card__meta">' + esc(l.why) + '</div></div>';
      }) + '</div>';
  }

  /* ---------- 11 · Alpha Coach ---------- */
  function coach(S) {
    var c = V.coach, k = S.coach;
    var out = head({ eyebrow: c.eyebrow, title: c.title });
    if (!k.started) {
      out += '<div class="card">' +
        '<div class="rowsplit" style="justify-content:flex-start;gap:12px">' +
        '<span class="chip-n" style="width:40px;height:40px;font-size:18px;font-family:var(--display)">α</span>' +
        '<span class="card__title" style="font-size:15px">' + esc(c.introTitle) + '</span></div>' +
        '<div class="card__meta">' + esc(c.intro) + '</div></div>' +
        '<div class="section">' + label(c.modLabel) +
        join(D.coachModules, function (m) {
          var on = k.mod === m.n;
          return '<button class="reveal" aria-pressed="' + on + '" data-act="coach.mod" data-i="' + m.n + '"' +
            ' style="border-color:' + (on ? 'rgba(14,165,233,.55)' : 'var(--bd-card)') + '">' +
            '<div class="rowsplit"><span class="mono-note" style="color:' + (on ? 'var(--accent-text)' : 'var(--t-label)') + '">MODULE ' + m.n + '</span></div>' +
            '<div class="card__title" style="font-size:15px">' + esc(m.name) + '</div>' +
            '<div class="card__meta">' + esc(m.focus) + '</div></button>';
        }) + '</div>' +
        '<div class="card">' + label(c.demoLabel) +
        '<textarea class="field" id="coachDemo" placeholder="e.g. 46-year-old owner-operator, two kids, group coverage only, wife wants a care plan for her mother.">' + esc(k.demo) + '</textarea>' +
        (k.err ? '<div class="callout callout--bad"><div class="callout__body">' + esc(k.err) + '</div></div>' : '') +
        '<button class="btn btn--go btn--wide" data-act="coach.start">' + esc(c.launch) + '</button></div>';
      return out;
    }

    out += '<div class="card">' +
      '<div class="rowsplit">' + label(c.activeLabel) +
      '<button class="btn btn--ghost" style="min-height:36px;padding:7px 12px;font-size:11.5px" data-act="coach.end">' + esc(c.end) + '</button></div>' +
      '<div class="card__title" style="font-size:15px">Module ' + k.mod + ' · ' + esc(modName(k.mod)) + '</div>' +
      '<div class="card__meta">' + esc(modFocus(k.mod)) + '</div>' +
      '<div class="divider">' + label(c.prospectLabel) +
      '<div class="card__meta" style="margin-top:6px">' + esc(k.demo) + '</div></div></div>';

    out += '<div class="chat" id="chatFeed">' + join(feed(k.msgs), function (m) {
      return '<div class="msg msg--' + m.kind + '"><span class="msg__tag" style="color:' + m.color + '">' + esc(m.tag) + '</span>' +
        '<div class="msg__body">' + esc(m.text) + '</div></div>';
    }) + (k.busy ? '<div class="mono-note">' + esc(c.busy) + '</div>' : '') + '</div>';

    if (k.err) out += '<div class="callout callout--bad"><div class="callout__body">' + esc(k.err) + '</div></div>';

    out += '<div class="composer">' +
      '<textarea class="field" id="coachDraft" rows="1" placeholder="Your line…">' + esc(k.draft) + '</textarea>' +
      '<button class="btn btn--go" data-act="coach.send"' + (k.busy ? ' disabled' : '') + '>' + esc(c.send) + '</button></div>' +
      '<div class="card">' + label(c.rulesLabel) +
      join(c.rules, function (r) { return '<div class="card__meta">· ' + esc(r) + '</div>'; }) + '</div>';
    return out;
  }

  function modName(n) { var m = D.coachModules.filter(function (x) { return x.n === n; })[0]; return m ? m.name : ''; }
  function modFocus(n) { var m = D.coachModules.filter(function (x) { return x.n === n; })[0]; return m ? m.focus : ''; }

  /* splits assistant turns into SCENE / PROSPECT / COACH cards, same as the prototype */
  function feed(msgs) {
    var out = [];
    msgs.slice(1).forEach(function (m) {
      if (m.role === 'user') {
        out.push({ kind: 'you', tag: 'YOU · AGENT', color: '#7DD3FC', text: m.content });
        return;
      }
      var prospect = [], scene = [], coachLines = [];
      m.content.split('\n').forEach(function (line) {
        var t = line.trim();
        if (t.indexOf('COACH:') === 0) coachLines.push(t.slice(6).trim());
        else if (t.indexOf('SCENE:') === 0) scene.push(t.slice(6).trim());
        else if (t) prospect.push(line);
      });
      if (scene.length) out.push({ kind: 'scene', tag: 'SCENE', color: '#7C8BA5', text: scene.join('\n') });
      if (prospect.length) out.push({ kind: 'prospect', tag: 'PROSPECT', color: '#94A3B8', text: prospect.join('\n') });
      if (coachLines.length) out.push({ kind: 'coach', tag: '⚠ ALPHA COACH', color: '#FBBF24', text: coachLines.join('\n') });
    });
    return out;
  }

  /* ---------- 12 · Master Resources ---------- */
  function res(S) {
    var c = V.res;
    return head({ eyebrow: c.eyebrow, title: c.title }) +
      '<div class="stack">' + join(D.resources, function (r, i) {
        var open = !!S.res.open[i];
        return '<button class="reveal" aria-expanded="' + open + '" data-act="res.open" data-i="' + i + '">' +
          '<div style="height:8px;border-radius:4px;background:repeating-linear-gradient(-45deg,rgba(14,165,233,.35) 0 6px,rgba(14,165,233,.08) 6px 12px)"></div>' +
          '<div class="rowsplit"><span class="card__title" style="font-size:15px">' + esc(r.title) + '</span>' +
          '<span class="tag" style="color:var(--accent-text);border-color:rgba(14,165,233,.35)">' + esc(r.kind) + '</span></div>' +
          '<div class="card__meta">' + esc(r.desc) + '</div>' +
          (open ? '<div class="divider" style="display:flex;flex-direction:column;gap:7px">' +
            join(r.items, function (it) { return '<div class="mono-note" style="font-size:10.5px;line-height:1.55;color:var(--t-dim)">' + esc(it) + '</div>'; }) +
            '</div><div class="mono-note">▴ TAP TO COLLAPSE</div>'
            : '<div class="mono-note">▾ TAP TO VIEW CONTENTS</div>') +
          '</button>';
      }) + '</div>';
  }

  window.POS_VIEWS = {
    dash: dash, matrix: matrix, phone: phone, field: field, mem: mem, acad: acad,
    blue: blue, scripts: scripts, arena: arena, close: closeRoom, coach: coach, res: res,
    esc: esc
  };
})();

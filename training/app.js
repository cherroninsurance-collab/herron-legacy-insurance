/* Proprietary & Confidential
   Copyright © 2026 Connor Herron. All Rights Reserved.
   Unauthorized distribution or public hosting prohibited. */
/* Producer OS — app shell: state, routing, persistence, search, AI calls.
   Plain ES5-ish vanilla JS, no build step, same as the rest of this repo. */

(function () {
  'use strict';

  var D = window.POS_DATA;
  var VIEWS = window.POS_VIEWS;
  var esc = VIEWS.esc;
  var STORE = 'pos:v1';
  var API = '/.netlify/functions/coach';

  var NAV = [
    { id: 'dash', label: 'Dashboard', icon: 'grid', primary: true },
    { id: 'matrix', label: 'Product Matrix', icon: 'dots' },
    { id: 'phone', label: 'Phone & Appt Setting', icon: 'target' },
    { id: 'field', label: 'Field Pipeline', icon: 'bars', primary: true },
    { id: 'mem', label: 'Memory Vault', icon: 'heart', primary: true },
    { id: 'acad', label: 'Call Academy', icon: 'cap' },
    { id: 'blue', label: 'Sales Blueprint', icon: 'clock' },
    { id: 'scripts', label: 'Script Playbooks', icon: 'play' },
    { id: 'arena', label: 'Live Role-Play Arena', icon: 'star' },
    { id: 'close', label: 'The Closing Room', icon: 'diamond' },
    { id: 'coach', label: 'Alpha Coach AI', icon: 'spark', primary: true },
    { id: 'res', label: 'Master Resources', icon: 'stack' }
  ];

  var ICONS = {
    grid: '<rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".45"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".45"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor"/>',
    dots: '<circle cx="3" cy="4" r="2" fill="currentColor"/><circle cx="8" cy="4" r="2" fill="currentColor" opacity=".45"/><circle cx="13" cy="4" r="2" fill="currentColor"/><circle cx="3" cy="12" r="2" fill="currentColor" opacity=".45"/><circle cx="8" cy="12" r="2" fill="currentColor"/><circle cx="13" cy="12" r="2" fill="currentColor" opacity=".45"/>',
    target: '<circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="8" cy="8" r="2.2" fill="currentColor"/>',
    bars: '<rect x="1" y="2" width="14" height="2.2" rx="1.1" fill="currentColor"/><rect x="3" y="6.4" width="10" height="2.2" rx="1.1" fill="currentColor" opacity=".7"/><rect x="5.5" y="10.8" width="5" height="2.2" rx="1.1" fill="currentColor" opacity=".45"/>',
    heart: '<path d="M8 2.2C6.9 1.3 5.4 1.3 4.4 2.3C3.3 3.4 3.3 5.1 4.4 6.2L8 9.8L11.6 6.2C12.7 5.1 12.7 3.4 11.6 2.3C10.6 1.3 9.1 1.3 8 2.2Z" fill="currentColor"/><rect x="4" y="12" width="8" height="2.2" rx="1.1" fill="currentColor" opacity=".5"/>',
    cap: '<path d="M8 1.5L15 5L8 8.5L1 5Z" fill="currentColor"/><path d="M3.5 6.8V10.5C3.5 10.5 5.5 12.5 8 12.5C10.5 12.5 12.5 10.5 12.5 10.5V6.8L8 9L3.5 6.8Z" fill="currentColor" opacity=".55"/>',
    clock: '<circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M8 4V8L10.5 10.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>',
    play: '<path d="M4 2.5L13 8L4 13.5Z" fill="currentColor"/>',
    star: '<path d="M8 1.4L9.9 5.7L14.6 6.2L11.1 9.4L12.1 14L8 11.6L3.9 14L4.9 9.4L1.4 6.2L6.1 5.7Z" fill="currentColor"/>',
    diamond: '<path d="M8 1.2L14.8 8L8 14.8L1.2 8Z" fill="currentColor"/>',
    spark: '<path d="M8 1L9.6 6.4L15 8L9.6 9.6L8 15L6.4 9.6L1 8L6.4 6.4Z" fill="currentColor"/>',
    stack: '<path d="M8 1.5L15 5L8 8.5L1 5Z" fill="currentColor"/><path d="M1 8L8 11.5L15 8" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".6"/><path d="M1 11L8 14.5L15 11" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".35"/>'
  };
  function svg(name, size) {
    return '<svg viewBox="0 0 16 16" width="' + (size || 17) + '" height="' + (size || 17) + '" aria-hidden="true">' + ICONS[name] + '</svg>';
  }

  /* ---------- state ---------- */
  var S = {
    view: 'dash',
    field: { phase: 0, lab: false, input: '', feedback: null, busy: false, err: '' },
    mem: { tab: 'ask', prod: 'mp', reb: {}, drill: {} },
    acad: { tab: 'found', drills: {}, voss: {} },
    blue: { tab: 1, obj: {} },
    scripts: { tab: 'mortgage', iul: 'trad' },
    arena: { flip: {}, pains: {}, pitch: null, count: null, tone: 'Neutral' },
    res: { open: {} },
    coach: { mod: 2, demo: '', msgs: [], busy: false, started: false, draft: '', err: '' }
  };

  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        field: { phase: S.field.phase },
        mem: { tab: S.mem.tab, prod: S.mem.prod, reb: S.mem.reb, drill: S.mem.drill },
        acad: { tab: S.acad.tab, drills: S.acad.drills, voss: S.acad.voss },
        blue: { tab: S.blue.tab },
        scripts: S.scripts,
        coach: { mod: S.coach.mod, demo: S.coach.demo }
      }));
    } catch (e) { /* private mode — progress just won't persist */ }
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (!raw) return;
      var p = JSON.parse(raw);
      if (p.field) S.field.phase = p.field.phase || 0;
      if (p.mem) { S.mem.tab = p.mem.tab || 'ask'; S.mem.prod = p.mem.prod || 'mp'; S.mem.reb = p.mem.reb || {}; S.mem.drill = p.mem.drill || {}; }
      if (p.acad) { S.acad.tab = p.acad.tab || 'found'; S.acad.drills = p.acad.drills || {}; S.acad.voss = p.acad.voss || {}; }
      if (p.blue) S.blue.tab = p.blue.tab || 1;
      if (p.scripts) S.scripts = p.scripts;
      if (p.coach) { S.coach.mod = p.coach.mod || 2; S.coach.demo = p.coach.demo || ''; }
    } catch (e) { /* corrupt payload — start fresh */ }
  }

  /* real, device-local progress: everything the agent can actually tick off */
  function progress() {
    var total = 0, done = 0;
    D.memProds.forEach(function (p) {
      p.rebs.forEach(function (_, i) { total++; if (S.mem.reb[p.id + i]) done++; });
    });
    D.memDrill.forEach(function (_, i) { total++; if (S.mem.drill[i]) done++; });
    D.acad.drills.forEach(function (_, i) { total++; if (S.acad.drills[i]) done++; });
    D.acad.vossTools.forEach(function (_, i) { total++; if (S.acad.voss[i]) done++; });
    total += D.fieldPhases.length;
    done += Math.min(S.field.phase + 1, D.fieldPhases.length);
    return { total: total, done: done, pct: Math.round(done / total * 100) };
  }

  /* ---------- routing ---------- */
  function parseHash() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var id = h.split('?')[0];
    return NAV.some(function (n) { return n.id === id; }) ? id : 'dash';
  }
  function go(id, replace) {
    if (S.view === id && parseHash() === id) return;
    S.view = id;
    if (replace) location.replace('#/' + id); else location.hash = '#/' + id;
    render(true);
  }

  /* ---------- render ---------- */
  var appEl, barTitle;
  function render(scrollTop) {
    var fn = VIEWS[S.view] || VIEWS.dash;
    appEl.innerHTML = '<div class="view">' + fn(S, progress()) + '</div>';
    var nav = NAV.filter(function (n) { return n.id === S.view; })[0];
    barTitle.textContent = nav ? nav.label : 'Producer OS';
    document.title = (nav ? nav.label : 'Producer OS') + ' — Producer OS';
    paintNav();
    if (scrollTop) window.scrollTo(0, 0);
    if (S.view === 'coach' && S.coach.started) {
      var feed = document.getElementById('chatFeed');
      if (feed) window.scrollTo(0, document.body.scrollHeight);
    }
  }

  function paintNav() {
    var primary = NAV.filter(function (n) { return n.primary; });
    var inPrimary = primary.some(function (n) { return n.id === S.view; });
    document.getElementById('tabbar').innerHTML =
      primary.map(function (n) {
        return '<button data-act="go" data-id="' + n.id + '"' + (S.view === n.id ? ' aria-current="page"' : '') + '>' +
          svg(n.icon, 20) + '<span>' + esc(shortLabel(n.label)) + '</span></button>';
      }).join('') +
      '<button data-act="menu"' + (inPrimary ? '' : ' aria-current="page"') + '>' +
      '<svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true"><circle cx="3" cy="8" r="1.6" fill="currentColor"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/><circle cx="13" cy="8" r="1.6" fill="currentColor"/></svg>' +
      '<span>More</span></button>';

    document.getElementById('navList').innerHTML = NAV.map(function (n) {
      return '<button data-act="go" data-id="' + n.id + '"' + (S.view === n.id ? ' aria-current="page"' : '') + '>' +
        svg(n.icon) + esc(n.label) + '</button>';
    }).join('');
  }
  function shortLabel(l) {
    return { 'Dashboard': 'Home', 'Field Pipeline': 'Field', 'Memory Vault': 'Vault', 'Alpha Coach AI': 'Coach' }[l] || l;
  }

  /* ---------- sheets ---------- */
  function sheet(id, open) {
    var el = document.getElementById(id);
    el.setAttribute('data-open', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open && id === 'searchSheet') {
      var i = document.getElementById('searchInput');
      i.value = ''; runSearch(''); setTimeout(function () { i.focus(); }, 40);
    }
  }

  /* ---------- search ---------- */
  var INDEX = null;
  function buildIndex() {
    if (INDEX) return INDEX;
    INDEX = [];
    var map = {
      fieldPhases: 'field', scripts: 'scripts', objections: 'arena', memProds: 'mem', memMind: 'mem',
      memDrill: 'mem', coachModules: 'coach', resources: 'res', matrixRows: 'matrix', phoneSteps: 'phone',
      scenarios: 'dash', acad: 'acad', blue: 'blue', views: null, nepq: null, brand: null
    };
    Object.keys(D).forEach(function (top) {
      if (top === 'views') {
        // static screen copy is keyed by view id already
        Object.keys(D.views).forEach(function (v) { walk(D.views[v], v, labelFor(v)); });
        return;
      }
      var view = map[top];
      if (!view) return;
      walk(D[top], view, labelFor(view));
    });
    return INDEX;

    function labelFor(v) {
      var n = NAV.filter(function (x) { return x.id === v; })[0];
      return n ? n.label : v;
    }
    function walk(node, view, where) {
      if (typeof node === 'string') {
        if (node.length > 24) INDEX.push({ view: view, where: where, text: node });
        return;
      }
      if (Array.isArray(node)) { node.forEach(function (n) { walk(n, view, where); }); return; }
      if (node && typeof node === 'object') {
        Object.keys(node).forEach(function (k) { walk(node[k], view, where); });
      }
    }
  }

  function runSearch(q) {
    var box = document.getElementById('searchResults');
    q = (q || '').trim();
    if (q.length < 2) {
      box.innerHTML = '<div class="empty">Type at least two letters. Searches every script, question, rebuttal, close and guardrail in the app — works offline.</div>';
      return;
    }
    var needle = q.toLowerCase();
    var hits = buildIndex().filter(function (r) { return r.text.toLowerCase().indexOf(needle) > -1; }).slice(0, 60);
    if (!hits.length) { box.innerHTML = '<div class="empty">Nothing matches “' + esc(q) + '”.</div>'; return; }
    box.innerHTML = hits.map(function (r) {
      var i = r.text.toLowerCase().indexOf(needle);
      var start = Math.max(0, i - 60), end = Math.min(r.text.length, i + needle.length + 90);
      var snippet = (start ? '…' : '') + r.text.slice(start, i) + '\u0001' + r.text.slice(i, i + needle.length) + '\u0002' +
        r.text.slice(i + needle.length, end) + (end < r.text.length ? '…' : '');
      return '<button class="result" data-act="go" data-id="' + r.view + '">' +
        '<span class="result__where">' + esc(r.where) + '</span>' +
        '<span class="result__text">' + esc(snippet).replace('\u0001', '<mark>').replace('\u0002', '</mark>') + '</span></button>';
    }).join('');
  }

  /* ---------- AI ---------- */
  function post(payload) {
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error === 'not_configured'
          ? 'Coach is not configured yet — ANTHROPIC_API_KEY is missing on the site.'
          : 'Coach unavailable (' + r.status + ').');
        return j;
      });
    });
  }

  function callCoach() {
    var k = S.coach;
    k.busy = true; k.err = ''; render();
    var msgs = k.msgs.length ? k.msgs : [{ role: 'user', content: 'Begin the role-play now.' }];
    post({ mode: 'roleplay', module: k.mod, demo: k.demo, messages: msgs })
      .then(function (j) {
        k.msgs = msgs.concat([{ role: 'assistant', content: j.reply }]);
        k.busy = false; render();
      })
      .catch(function (e) {
        k.busy = false;
        k.err = navigator.onLine ? ('Coach unavailable — ' + e.message) : 'You are offline. Alpha Coach needs a connection — everything else in the app still works.';
        render();
      });
  }

  function gradeRep() {
    var f = S.field;
    if (!f.input.trim() || f.busy) return;
    f.busy = true; f.err = ''; render();
    post({ mode: 'grade', phase: D.fieldPhases[Math.min(f.phase, D.fieldPhases.length - 1)].title, delivery: f.input })
      .then(function (j) {
        f.busy = false; f.feedback = j.feedback; render();
      })
      .catch(function (e) {
        f.busy = false;
        f.err = navigator.onLine ? ('Scoring unavailable — ' + e.message) : 'You are offline. Scoring needs a connection — the script and the guardrail are still here.';
        render();
      });
  }

  /* ---------- actions ---------- */
  var timer = null;
  var ACTS = {
    'go': function (el) { sheet('navSheet', false); sheet('searchSheet', false); go(el.getAttribute('data-id')); },
    'menu': function () { sheet('navSheet', true); },

    'field.mode': function (el) { S.field.lab = el.getAttribute('data-id') === 'lab'; render(); },
    'field.phase': function (el) { S.field.phase = +el.getAttribute('data-i'); S.field.feedback = null; save(); render(); },
    'field.advance': function () {
      if (S.field.phase >= D.fieldPhases.length - 1) S.field.lab = true;
      else { S.field.phase++; S.field.feedback = null; }
      save(); render(true);
    },
    'field.clear': function () { S.field.input = ''; S.field.feedback = null; S.field.err = ''; render(); },
    'field.grade': gradeRep,

    'mem.tab': function (el) { S.mem.tab = el.getAttribute('data-id'); save(); render(true); },
    'mem.prod': function (el) { S.mem.prod = D.memProds[+el.getAttribute('data-i')].id; save(); render(); },
    'mem.reb': function (el) { var k = el.getAttribute('data-k'); S.mem.reb[k] = !S.mem.reb[k]; save(); render(); },
    'mem.reb.all': function () {
      var cur = D.memProds.filter(function (p) { return p.id === S.mem.prod; })[0];
      var all = cur.rebs.every(function (_, i) { return S.mem.reb[cur.id + i]; });
      cur.rebs.forEach(function (_, i) { S.mem.reb[cur.id + i] = !all; });
      save(); render();
    },
    'mem.drill': function (el) { var i = +el.getAttribute('data-i'); S.mem.drill[i] = !S.mem.drill[i]; save(); render(); },
    'mem.drill.all': function () {
      var all = D.memDrill.every(function (_, i) { return S.mem.drill[i]; });
      D.memDrill.forEach(function (_, i) { S.mem.drill[i] = !all; });
      save(); render();
    },

    'acad.tab': function (el) { S.acad.tab = el.getAttribute('data-id'); save(); render(true); },
    'acad.voss': function (el) { var i = +el.getAttribute('data-i'); S.acad.voss[i] = !S.acad.voss[i]; save(); render(); },
    'acad.drill': function (el) { var i = +el.getAttribute('data-i'); S.acad.drills[i] = !S.acad.drills[i]; save(); render(); },
    'acad.drill.reset': function () { S.acad.drills = {}; save(); render(); },

    'blue.tab': function (el) { S.blue.tab = +el.getAttribute('data-id'); save(); render(true); },
    'blue.obj': function (el) { var i = +el.getAttribute('data-i'); S.blue.obj[i] = !S.blue.obj[i]; render(); },

    'scripts.tab': function (el) { S.scripts.tab = el.getAttribute('data-id'); save(); render(true); },
    'scripts.iulmode': function (el) { S.scripts.iul = el.getAttribute('data-id'); save(); render(); },

    'arena.pain': function (el) { var i = +el.getAttribute('data-i'); S.arena.pains[i] = !S.arena.pains[i]; S.arena.pitch = null; render(); },
    'arena.pitch': function () {
      var c = D.views.arena;
      var n = c.pains.filter(function (_, i) { return S.arena.pains[i]; }).length;
      S.arena.pitch = n >= c.painGoal ? 'clear' : 'kill';
      render();
    },
    'arena.reset': function () { clearInterval(timer); S.arena.pains = {}; S.arena.pitch = null; S.arena.count = null; render(); },
    'arena.timer': function () {
      clearInterval(timer);
      S.arena.count = 3; render();
      timer = setInterval(function () {
        if (S.arena.count === 1) { S.arena.count = 'GO'; clearInterval(timer); }
        else S.arena.count = S.arena.count - 1;
        render();
      }, 1000);
    },
    'arena.tone': function (el) { S.arena.tone = el.getAttribute('data-id'); render(); },
    'arena.flip': function (el) { var i = +el.getAttribute('data-i'); S.arena.flip[i] = !S.arena.flip[i]; render(); },

    'res.open': function (el) { var i = +el.getAttribute('data-i'); S.res.open[i] = !S.res.open[i]; render(); },

    'coach.mod': function (el) { S.coach.mod = +el.getAttribute('data-i'); save(); render(); },
    'coach.start': function () {
      if (!S.coach.demo.trim()) { S.coach.err = D.views.coach.noDemo; render(); return; }
      save();
      S.coach.started = true; S.coach.msgs = []; S.coach.err = '';
      callCoach();
    },
    'coach.end': function () { S.coach.started = false; S.coach.msgs = []; S.coach.draft = ''; S.coach.err = ''; render(true); },
    'coach.send': function () {
      var d = S.coach.draft.trim();
      if (!d || S.coach.busy) return;
      S.coach.msgs = S.coach.msgs.concat([{ role: 'user', content: d }]);
      S.coach.draft = '';
      callCoach();
    }
  };

  /* ---------- wiring ---------- */
  function init() {
    appEl = document.getElementById('app');
    barTitle = document.getElementById('barTitle');
    load();
    S.view = parseHash();
    if (!location.hash) location.replace('#/' + S.view);
    render();

    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-act]');
      if (!el) return;
      var fn = ACTS[el.getAttribute('data-act')];
      if (!fn) return;
      e.preventDefault();
      fn(el);
    });

    document.addEventListener('input', function (e) {
      var t = e.target;
      if (t.id === 'fieldInput') {
        S.field.input = t.value;
        var btn = document.querySelector('[data-act="field.grade"]');
        if (btn) btn.disabled = !t.value.trim() || S.field.busy;
      } else if (t.id === 'coachDraft') {
        S.coach.draft = t.value;
      } else if (t.id === 'coachDemo') {
        S.coach.demo = t.value;
      } else if (t.id === 'searchInput') {
        runSearch(t.value);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { sheet('navSheet', false); sheet('searchSheet', false); }
      if (e.key === 'Enter' && e.target.id === 'coachDraft' && !e.shiftKey) {
        e.preventDefault(); ACTS['coach.send']();
      }
    });

    document.getElementById('btnMenu').addEventListener('click', function () { sheet('navSheet', true); });
    document.getElementById('btnSearch').addEventListener('click', function () { sheet('searchSheet', true); });
    document.getElementById('searchClose').addEventListener('click', function () { sheet('searchSheet', false); });
    ['navSheet', 'searchSheet'].forEach(function (id) {
      document.getElementById(id).addEventListener('click', function (e) {
        if (e.target.id === id) sheet(id, false);
      });
    });

    window.addEventListener('hashchange', function () {
      // a sheet must never survive a navigation — including back/forward
      sheet('navSheet', false); sheet('searchSheet', false);
      var v = parseHash();
      if (v !== S.view) { S.view = v; render(true); }
    });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () { /* offline cache is a bonus, not a requirement */ });
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

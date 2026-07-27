/* LIVING WORD — interactive learning mechanics (Module 4)
   Track A: Verse Builder, The Great Timeline, Shepherd's Path.
   Track B: cross-reference constellation + DBS reflection journal.
   Design rules: no timers, no failure buzzers, no loot, no leaderboards.
   Wrong answers re-read the Word; completion lights a lamp (Ps 119:105).  */

'use strict';

import * as db from './db.js';

/* Deterministic-feeling gentle shuffle (Fisher–Yates). */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function celebration(container, message) {
  const c = el('div', 'game-celebrate glass halo');
  c.append(el('div', 'lamp-glyph', '🕯️'), el('p', null, message));
  container.append(c);
  requestAnimationFrame(() => c.classList.add('shown'));
}

/* =============================================================== Track A */

/**
 * 1. VERSE BUILDER — the memory verse appears as luminous glass word-tiles
 * scattered in the beam; the child taps them in order. A correct tile
 * "sets" into the verse line with a soft glow; a wrong tile pulses gently
 * and the assembled-so-far text is re-read aloud via speechSynthesis.
 */
export function verseBuilder(container, { lessonId, refLabel, verseText, onComplete }) {
  container.innerHTML = '';
  const words = verseText.split(/\s+/);
  let next = 0;

  container.append(el('h3', 'game-title ca-heading', 'Verse Builder'));
  container.append(el('p', 'game-sub', refLabel));
  const line = el('div', 'vb-line scripture');
  const pool = el('div', 'vb-pool');
  container.append(line, pool);

  function accept(tile, w) {
    tile.disabled = true;
    tile.classList.add('vb-set');
    const set = el('span', 'vb-word', (next ? ' ' : '') + w);
    line.append(set);
    requestAnimationFrame(() => set.classList.add('lit'));
    next++;
    if (next === words.length) {
      line.classList.add('vb-complete');
      db.setGameProgress(lessonId, 'verse-builder', 1);
      celebration(container, 'The whole verse shines as one. Say it out loud!');
      if (onComplete) onComplete();
    }
  }

  shuffle(words.map((w, i) => ({ w, i }))).forEach(({ w, i }) => {
    const tile = el('button', 'vb-tile glass', w);
    tile.addEventListener('click', () => {
      // Accept an exact-position match OR an identical duplicate word —
      // children shouldn't be penalized for indistinguishable tiles.
      if (i === next || w === words[next]) {
        accept(tile, w);
      } else {
        tile.classList.remove('vb-nudge');
        void tile.offsetWidth;              // restart the gentle pulse
        tile.classList.add('vb-nudge');
        readAloud(words.slice(0, next).join(' '));
      }
    });
    pool.append(tile);
  });
}

/**
 * 2. THE GREAT TIMELINE — redemptive-history events are placed onto an
 * illuminated river flowing left→right. The child taps the event that
 * comes next; each correct placement lights that segment of the river,
 * visually building the one story that leads to Christ.
 */
export function greatTimeline(container, { lessonId, events, onComplete }) {
  container.innerHTML = '';
  const ordered = events.slice().sort((a, b) => a.order - b.order);
  let next = 0;

  container.append(el('h3', 'game-title ca-heading', 'The Great Timeline'));
  container.append(el('p', 'game-sub', 'One story, from the garden to the nations. What happened first?'));

  const river = el('div', 'tl-river');
  ordered.forEach(() => river.append(el('div', 'tl-segment')));
  const slots = el('div', 'tl-slots');
  const pool = el('div', 'tl-pool');
  container.append(river, slots, pool);

  shuffle(ordered).forEach((ev) => {
    const card = el('button', 'tl-card glass', '');
    card.append(el('strong', null, ev.label), el('small', null, ev.ref));
    card.addEventListener('click', () => {
      if (ev.order === ordered[next].order) {
        card.disabled = true;
        card.classList.add('tl-placed');
        slots.append(card);
        river.children[next].classList.add('lit');
        next++;
        if (next === ordered.length) {
          db.setGameProgress(lessonId, 'great-timeline', 1);
          celebration(container,
            'The river of light runs from Creation all the way to Christ and His church — one story!');
          if (onComplete) onComplete();
        }
      } else {
        card.classList.remove('vb-nudge');
        void card.offsetWidth;
        card.classList.add('vb-nudge');
      }
    });
    pool.append(card);
  });
}

/**
 * 3. SHEPHERD'S PATH — a guided quest through Psalm 23 / Luke 15.
 * The child leads a lamb scene by scene by answering comprehension
 * choices drawn from the text. A wrong answer gently re-reads the verse —
 * never a penalty. Ends at the Shepherd who leaves the ninety-nine.
 */
const SHEPHERD_SCENES = [
  {
    art: '🌿', verse: 'He maketh me to lie down in green pastures: he leadeth me beside the still waters. (Psalm 23:2)',
    q: 'Where does the Shepherd lead his sheep to rest?',
    choices: ['Green pastures and still waters', 'A busy city', 'A dry desert'], answer: 0,
  },
  {
    art: '🌑', verse: 'Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me. (Psalm 23:4)',
    q: 'Why does the sheep not need to be afraid in the dark valley?',
    choices: ['Because the valley is short', 'Because the Shepherd is WITH him', 'Because sheep can see in the dark'], answer: 1,
  },
  {
    art: '🐑', verse: 'What man of you, having an hundred sheep, if he lose one of them, doth not leave the ninety and nine... and go after that which is lost, until he find it? (Luke 15:4)',
    q: 'What does the shepherd do when ONE sheep is lost?',
    choices: ['Waits for it to come back', 'Says ninety-nine is enough', 'Goes after it until he finds it'], answer: 2,
  },
  {
    art: '🎉', verse: 'And when he hath found it, he layeth it on his shoulders, rejoicing. (Luke 15:5)',
    q: 'How does the shepherd carry the found sheep home?',
    choices: ['On his shoulders, rejoicing', 'He makes it walk behind him', 'He sends another sheep to get it'], answer: 0,
  },
];

export function shepherdPath(container, { lessonId, onComplete }) {
  container.innerHTML = '';
  let scene = 0;

  container.append(el('h3', 'game-title ca-heading', "Shepherd's Path"));
  const stage = el('div', 'sp-stage glass');
  const path = el('div', 'sp-path');
  SHEPHERD_SCENES.forEach(() => path.append(el('span', 'sp-step', '·')));
  container.append(stage, path);

  function render() {
    const s = SHEPHERD_SCENES[scene];
    stage.innerHTML = '';
    stage.append(el('div', 'sp-art', s.art));
    stage.append(el('p', 'scripture sp-verse', s.verse));
    stage.append(el('p', 'sp-q', s.q));
    s.choices.forEach((c, i) => {
      const b = el('button', 'btn sp-choice', c);
      b.addEventListener('click', () => {
        if (i === s.answer) {
          path.children[scene].classList.add('lit');
          scene++;
          if (scene === SHEPHERD_SCENES.length) {
            stage.innerHTML = '';
            stage.append(el('div', 'sp-art', '✨🐑✨'));
            stage.append(el('p', 'scripture sp-verse',
              'Likewise joy shall be in heaven over one sinner that repenteth. (Luke 15:7)'));
            db.setGameProgress(lessonId, 'shepherd-path', 1);
            celebration(container, 'The Shepherd carried the lamb all the way home. He is Jesus — and He came looking for you.');
            if (onComplete) onComplete();
          } else {
            render();
          }
        } else {
          // wrong answers re-read the verse rather than penalize
          stage.querySelector('.sp-verse').classList.remove('vb-nudge');
          void stage.offsetWidth;
          stage.querySelector('.sp-verse').classList.add('vb-nudge');
          readAloud(s.verse);
        }
      });
      stage.append(b);
    });
  }
  render();
}

/* =============================================================== Track B */

/**
 * CROSS-REFERENCE CONSTELLATION — the current verse is a star; its
 * cross-references are connected stars across both testaments. Themes
 * (lamb, light, word, shepherd, salvation, mission) render as constellations.
 */
export async function constellation(canvas, focusRef /* [b,c,v] or null */) {
  const refs = await db.getAllCrossRefs();
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  // Collect unique nodes; x = canonical position (book), y = theme band.
  const themes = [...new Set(refs.map((r) => r.theme))];
  const nodes = new Map();
  const nodeKey = (a) => a.join('.');
  for (const r of refs) {
    for (const p of [r.from, r.to]) {
      const k = nodeKey(p);
      if (!nodes.has(k)) {
        const themeIdx = themes.indexOf(r.theme);
        nodes.set(k, {
          p,
          x: 30 + (p[0] / 66) * (W - 60),
          y: 40 + (themeIdx / Math.max(themes.length - 1, 1)) * (H - 90)
             + Math.sin(p[0] * 3.7 + p[1]) * 14,
        });
      }
    }
  }

  ctx.clearRect(0, 0, W, H);
  // night ground
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#070b14'); bg.addColorStop(1, '#101a30');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // OT|NT meridian
  const mx = 30 + (39.5 / 66) * (W - 60);
  ctx.strokeStyle = 'rgba(246,215,138,.12)';
  ctx.setLineDash([3, 7]); ctx.beginPath();
  ctx.moveTo(mx, 16); ctx.lineTo(mx, H - 16); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(244,239,228,.4)'; ctx.font = '10px sans-serif';
  ctx.fillText('OLD TESTAMENT', 30, 14);
  ctx.fillText('NEW TESTAMENT', mx + 10, 14);

  const focusKey = focusRef ? focusRef.join('.') : null;
  // edges
  for (const r of refs) {
    const a = nodes.get(nodeKey(r.from)), b = nodes.get(nodeKey(r.to));
    const hot = focusKey && (nodeKey(r.from) === focusKey || nodeKey(r.to) === focusKey);
    ctx.strokeStyle = hot ? 'rgba(255,233,184,.85)' : 'rgba(246,215,138,.28)';
    ctx.lineWidth = hot ? 1.6 : 0.8;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // stars
  for (const [k, n] of nodes) {
    const hot = k === focusKey;
    const r = hot ? 5 : 2.6;
    const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4);
    glow.addColorStop(0, hot ? 'rgba(255,247,230,.95)' : 'rgba(246,215,138,.8)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(n.x, n.y, r * 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = hot ? '#fff7e6' : '#f6d78a';
    ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
  }
  return nodes; // caller may hit-test taps against these positions
}

/**
 * DBS REFLECTION — Discovery Bible Study prompt set with a private,
 * on-device journal. Nothing is uploaded anywhere, ever.
 */
export function reflection(container, { studyId, passageRef, prompts }) {
  container.innerHTML = '';
  container.append(el('h3', 'game-title ca-heading', 'Discovery & Obedience'));
  container.append(el('p', 'game-sub', passageRef));
  const form = el('div', 'dbs-form');
  const areas = prompts.map((q) => {
    const wrap = el('label', 'dbs-q glass');
    wrap.append(el('span', null, q));
    const ta = document.createElement('textarea');
    ta.rows = 3; ta.placeholder = 'Write honestly — this stays on your device.';
    wrap.append(ta);
    form.append(wrap);
    return { q, ta };
  });
  const save = el('button', 'btn btn--gold', 'Keep in my journal');
  save.addEventListener('click', async () => {
    await db.saveJournal({
      studyId, passageRef,
      answers: areas.map((a) => ({ q: a.q, a: a.ta.value })),
    });
    save.textContent = 'Kept. Now go do it. (James 1:22)';
    save.disabled = true;
  });
  form.append(save);
  container.append(form);
}

/* ------------------------------------------------------------ utilities */
function readAloud(text) {
  try {
    if (!('speechSynthesis' in window) || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92;
    speechSynthesis.speak(u); // fully offline: uses the device's local voices
  } catch (_) { /* narration is an enhancement, never a dependency */ }
}

/* LIVING WORD — application shell: routing, reader, curriculum, study tools.
   100% offline: after the service worker's first cache, no network is used. */

'use strict';

import { runSplash } from './splash.js';
import { PageFlip } from './pageflip.js';
import { Carousel3D } from './carousel.js';
import { BOOKS, bookName, chapterCount, bookById } from './canon.js';
import * as db from './db.js';
import * as games from './games.js';

const $ = (sel) => document.querySelector(sel);

let TRANSLATION = null;   // active translation row
let CURRICULUM = null;    // data/curriculum.json
let OVERVIEW = null;      // data/bible-overview.json — 66 books, main lessons
let TEACHINGS = null;     // data/jesus-teachings.json — Jesus' teachings library
let reader = { book: 43, chapter: 1 };   // open to John 1 — "In the beginning was the Word"
let flip = null;
let booksCarousel = null;
let teachCarousel = null;

/* ================================================================ boot */
async function boot() {
  // Offline packaging. Absent (single-file build) or blocked (sandboxed
  // frame) service workers are fine — the app never needs the network.
  try {
    if ('serviceWorker' in navigator && !window.__LIVING_WORD_SINGLE_FILE) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  } catch (_) { /* no service worker available in this context */ }

  const [translation, curriculum, overview, teachings] = await Promise.all([
    db.ensureSeeded(),
    fetch('data/curriculum.json').then((r) => r.json()),
    fetch('data/bible-overview.json').then((r) => r.json()),
    fetch('data/jesus-teachings.json').then((r) => r.json()),
  ]);
  TRANSLATION = translation;
  CURRICULUM = curriculum;
  OVERVIEW = overview;
  TEACHINGS = teachings;

  runSplash(() => {
    show('home');
    renderHome();
  });
  initReader();
  initTabs();
}

function show(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $('#screen-' + name).classList.add('active');
  document.querySelectorAll('.tabbar button').forEach((b) =>
    b.classList.toggle('on', b.dataset.screen === name));
  if (name === 'read') renderChapter();
  if (name === 'learn') renderLearnIndex();
  if (name === 'study') renderStudy();
  if (name === 'books') renderBooks();
  if (name === 'jesus') renderJesus();
}

function initTabs() {
  document.querySelectorAll('.tabbar button').forEach((b) =>
    b.addEventListener('click', () => show(b.dataset.screen)));
  document.querySelectorAll('[data-back]').forEach((b) =>
    b.addEventListener('click', () => show(b.dataset.back)));
}

/* ================================================================ home */
function renderHome() {
  const body = $('#screen-home .screen-body');
  body.innerHTML = '';
  const cards = [
    ['📖', 'Read the Word', 'Open the Bible — swipe or tap the arrows to turn glowing pages.', () => show('read')],
    ['📚', 'The 66 Books', 'Spin the carousel: main lessons for every book, Genesis to Revelation.', () => show('books')],
    ['✝️', 'The Teachings of Jesus', 'The Sermon on the Mount, the parables, the I AMs, the miracles, His final words.', () => show('jesus')],
    ['🕊️', 'Share the Gospel', 'The Bridge: Creation, Fall, Redemption, Restoration — ten minutes with a friend.', () => renderGospel()],
    ['🕯️', 'Learn & Play', 'Lessons for Lambs (kids) and Disciples (youth & adults).', () => show('learn')],
    ['🌌', 'Study Deep', 'Cross-reference constellations, word studies, your multiplication ledger.', () => show('study')],
  ];
  for (const [glyph, title, sub, go] of cards) {
    const c = document.createElement('div');
    c.className = 'card glass halo';
    c.innerHTML = `<h3>${glyph}&nbsp; ${title}</h3><p>${sub}</p>`;
    c.addEventListener('click', go);
    body.append(c);
  }
  const notice = document.createElement('p');
  notice.className = 'copyright-notice';
  notice.textContent = TRANSLATION.copyright;
  body.append(notice);
}

/* The Bridge — a guided gospel walkthrough for evangelism. */
const BRIDGE = [
  { title: '1 · Creation', ref: [1, 1], text: 'God made everything good — including us, made to know Him.' },
  { title: '2 · The Fall', ref: [45, 3], text: '“All have sinned.” Our sin separates us from the holy God — a canyon we cannot cross.' },
  { title: '3 · Redemption', ref: [45, 5], text: '“While we were yet sinners, Christ died for us.” The cross is God’s bridge across the canyon.' },
  { title: '4 · Response', ref: [45, 10], text: 'Confess Jesus as Lord, believe God raised Him from the dead — and you will be saved.' },
];
function renderGospel() {
  show('learn');
  const body = $('#screen-learn .screen-body');
  body.innerHTML = '<button class="back-link">‹ Back to lessons</button><h2 class="ca-heading">The Bridge</h2>';
  body.querySelector('.back-link').addEventListener('click', renderLearnIndex);
  BRIDGE.forEach((s) => {
    const c = document.createElement('div');
    c.className = 'card glass';
    c.innerHTML = `<h3>${s.title}</h3><p>${s.text}</p>
      <p style="margin-top:8px"><em>Read together: ${bookName(s.ref[0])} ${s.ref[1]}</em></p>`;
    c.addEventListener('click', () => { reader = { book: s.ref[0], chapter: s.ref[1] }; show('read'); });
    body.append(c);
  });
}

/* ===================================================== 66-books carousel */
const GENRE_ART = {
  law: '⛰️', history: '🏺', wisdom: '🎼', prophets: '🔥',
  gospel: '✝️', acts: '🌍', epistle: '📜', apocalyptic: '👑',
};

function renderBooks() {
  const mount = $('#books-carousel');
  if (!booksCarousel) {
    booksCarousel = new Carousel3D({
      mount,
      items: OVERVIEW.books,
      cardWidth: 148,
      renderCard: (ov) => {
        const [, name, , testament, genre] = bookById(ov.b);
        const card = document.createElement('div');
        card.className = `book-cover ${testament.toLowerCase()} genre-${genre}`;
        card.innerHTML = `
          <span class="book-glyph">${GENRE_ART[genre] || '📖'}</span>
          <span class="book-name">${name}</span>
          <span class="book-testament">${testament === 'OT' ? 'Old Testament' : 'New Testament'}</span>`;
        return card;
      },
      onFocus: (ov) => renderBookFocus(ov),
      onSelect: (ov) => renderBookDetail(ov),
    });
    renderBookFocus(OVERVIEW.books[0]);
  }
}

function renderBookFocus(ov) {
  const [, name] = bookById(ov.b);
  $('#books-focus').innerHTML = `
    <h3 class="ca-heading">${name}</h3>
    <p class="game-sub">${ov.t}</p>
    <div class="books-actions">
      <button class="btn btn--gold" id="bk-open">Main Lessons</button>
      <button class="btn" id="bk-read">Read ${name}</button>
    </div>`;
  $('#bk-open').addEventListener('click', () => renderBookDetail(ov));
  $('#bk-read').addEventListener('click', () => {
    reader = { book: ov.b, chapter: 1 };
    show('read');
  });
}

function renderBookDetail(ov) {
  const [, name, , testament] = bookById(ov.b);
  const body = $('#books-detail');
  body.innerHTML = `
    <div class="card glass halo">
      <h3 class="ca-heading">${name} — ${ov.t}</h3>
      <p class="game-sub">${testament === 'OT' ? 'Old Testament' : 'New Testament'} · Key verse: ${ov.kv}</p>
      ${ov.ls.map((l, i) => `
        <div class="lesson-step glass" style="margin-top:10px">
          <span class="kind">Lesson ${i + 1}</span><p>${l}</p>
        </div>`).join('')}
      <div class="lesson-step glass christ-box" style="margin-top:10px">
        <span class="kind">Where is Jesus here?</span><p>${ov.c}</p>
      </div>
      <button class="btn btn--gold" style="margin-top:12px" id="bkd-read">Open ${name} in the Reader</button>
    </div>`;
  $('#bkd-read').addEventListener('click', () => {
    reader = { book: ov.b, chapter: 1 };
    show('read');
  });
  body.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ================================================ Jesus' teachings hall */
function renderJesus() {
  const mount = $('#jesus-carousel');
  if (!teachCarousel) {
    teachCarousel = new Carousel3D({
      mount,
      items: TEACHINGS.categories,
      cardWidth: 168,
      renderCard: (cat) => {
        const card = document.createElement('div');
        card.className = 'book-cover teach-cover';
        card.innerHTML = `
          <span class="book-glyph">${cat.glyph}</span>
          <span class="book-name">${cat.title}</span>
          <span class="book-testament">${cat.ref}</span>`;
        return card;
      },
      onFocus: (cat) => renderTeachList(cat),
      onSelect: (cat) => renderTeachList(cat),
    });
    renderTeachList(TEACHINGS.categories[0]);
  }
}

function renderTeachList(cat) {
  const body = $('#jesus-list');
  body.innerHTML = `
    <h3 class="ca-heading">${cat.glyph} ${cat.title}</h3>
    <p class="game-sub">${cat.intro}</p>`;
  cat.items.forEach((it) => {
    const c = document.createElement('div');
    c.className = 'card glass teach-item';
    c.innerHTML = `<h3>${it.title}</h3><p class="game-sub">${it.ref}</p>
      <div class="teach-body" hidden>
        <div class="lesson-step glass"><span class="kind">What Jesus taught</span><p>${it.teaching}</p></div>
        <div class="lesson-step glass christ-box"><span class="kind">Live it</span><p>${it.live}</p></div>
      </div>`;
    c.addEventListener('click', () => {
      const bodyEl = c.querySelector('.teach-body');
      bodyEl.hidden = !bodyEl.hidden;
      c.classList.toggle('open', !bodyEl.hidden);
    });
    body.append(c);
  });
}

/* ============================================================== reader */
function initReader() {
  const bookSel = $('#sel-book');
  const chapSel = $('#sel-chapter');
  for (const [id, name] of BOOKS) {
    const o = document.createElement('option');
    o.value = id; o.textContent = name;
    bookSel.append(o);
  }
  bookSel.addEventListener('change', () => {
    reader.book = +bookSel.value; reader.chapter = 1; renderChapter();
  });
  chapSel.addEventListener('change', () => {
    reader.chapter = +chapSel.value; renderChapter();
  });
  $('#btn-books').addEventListener('click', () => show('books'));

  flip = new PageFlip({
    stage: $('#book-stage'),
    grabZone: 0.44,
    canGo: (dir) => nextRef(dir) !== null,
    onCommit: (dir) => {
      const n = nextRef(dir);
      if (n) { reader = n; renderChapter(); }
    },
  });
  $('#turn-prev').addEventListener('click', () => flip.turn(-1));
  $('#turn-next').addEventListener('click', () => flip.turn(+1));
}

function nextRef(dir) {
  let { book, chapter } = reader;
  chapter += dir;
  if (chapter < 1) {
    if (book === 1) return null;
    book -= 1; chapter = chapterCount(book);
  } else if (chapter > chapterCount(book)) {
    if (book === 66) return null;
    book += 1; chapter = 1;
  }
  return { book, chapter };
}

async function renderChapter() {
  $('#sel-book').value = reader.book;
  const chapSel = $('#sel-chapter');
  chapSel.innerHTML = '';
  for (let i = 1; i <= chapterCount(reader.book); i++) {
    const o = document.createElement('option');
    o.value = i; o.textContent = 'Ch ' + i;
    chapSel.append(o);
  }
  chapSel.value = reader.chapter;

  const face = $('#book-stage .leaf .face.front');
  const [verses, highlights] = await Promise.all([
    db.getChapter(TRANSLATION.id, reader.book, reader.chapter),
    db.getHighlights(TRANSLATION.id, reader.book, reader.chapter),
  ]);
  const hlMap = new Map(highlights.map((h) => [h.v, h.color]));

  let html = `<div class="chapter-title">${bookName(reader.book).toUpperCase()} ${reader.chapter}</div>`;
  if (!verses.length) {
    const ov = OVERVIEW.books.find((o) => o.b === reader.book);
    html += `<div class="no-text-notice">
      <p class="scripture" style="font-style:italic">“${ov ? ov.t : ''}”</p><br>
      This chapter's full text is not in the development seed — the licensed ESV
      bundle (all 31,102 verses) loads it offline. Meanwhile, the main lessons of
      ${bookName(reader.book)} are one tap away.<br><br></div>`;
    if (ov) {
      html += `<div style="text-align:center"><button class="btn btn--gold" id="nt-lessons">
        Main Lessons of ${bookName(reader.book)}</button></div>`;
    }
  } else {
    html += '<div class="scripture">' + verses.map((v) => {
      const hl = hlMap.has(v.v) ? ` class="hl-${hlMap.get(v.v)}"` : '';
      return `<span${hl} data-v="${v.v}"><span class="vnum">${v.v}</span>${escapeHtml(v.text)} </span>`;
    }).join('') + '</div>';
    html += `<p class="copyright-notice">${escapeHtml(TRANSLATION.copyright.split('.')[0])}.</p>`;
  }
  face.innerHTML = html;

  const lessonsBtn = face.querySelector('#nt-lessons');
  if (lessonsBtn) lessonsBtn.addEventListener('click', () => {
    const ov = OVERVIEW.books.find((o) => o.b === reader.book);
    show('books');
    booksCarousel.goTo(OVERVIEW.books.indexOf(ov));
    renderBookDetail(ov);
  });

  // tap a verse to toggle a gold highlight
  face.querySelectorAll('[data-v]').forEach((span) => {
    span.addEventListener('click', async () => {
      const row = await db.toggleHighlight(TRANSLATION.id, reader.book, reader.chapter, +span.dataset.v);
      span.className = row ? 'hl-' + row.color : '';
    });
  });
}

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* =========================================================== learn tab */
function renderLearnIndex() {
  const body = $('#screen-learn .screen-body');
  body.innerHTML = '<h2 class="ca-heading">Learn</h2>';

  // gateways to the deep libraries
  const gates = [
    ['📚', 'The 66 Books', 'Main lessons for every book, Genesis to Revelation — spin the carousel.', () => show('books')],
    ['✝️', 'The Teachings of Jesus', 'Sermon on the Mount · Parables · I AM · Miracles · Final words.', () => show('jesus')],
  ];
  for (const [glyph, title, sub, go] of gates) {
    const c = document.createElement('div');
    c.className = 'card glass halo';
    c.innerHTML = `<h3>${glyph}&nbsp; ${title}</h3><p>${sub}</p>`;
    c.addEventListener('click', go);
    body.append(c);
  }

  const a = CURRICULUM.trackA;
  body.insertAdjacentHTML('beforeend',
    `<p class="game-sub" style="margin-top:18px">TRACK A · ${a.name}</p>`);
  for (const unit of a.units) {
    for (const lesson of unit.lessons) {
      body.append(lessonCard(lesson, () => renderLessonA(lesson)));
    }
  }
  const b = CURRICULUM.trackB;
  body.insertAdjacentHTML('beforeend',
    `<p class="game-sub" style="margin-top:18px">TRACK B · ${b.name}</p>`);
  for (const course of b.courses) {
    for (const study of course.studies) {
      body.append(lessonCard(study, () => renderStudyB(study)));
    }
  }
}

function lessonCard(l, onOpen) {
  const c = document.createElement('div');
  c.className = 'card glass';
  c.innerHTML = `<h3>${l.title}</h3><p>${l.passage_ref} — ${l.big_truth}</p>`;
  c.addEventListener('click', onOpen);
  return c;
}

async function renderLessonA(lesson) {
  const body = $('#screen-learn .screen-body');
  body.innerHTML = `<button class="back-link">‹ All lessons</button>
    <h2 class="ca-heading">${lesson.title}</h2>
    <p class="game-sub">${lesson.passage_ref}</p>`;
  body.querySelector('.back-link').addEventListener('click', renderLearnIndex);

  // The passage itself is always visually primary (Sola Scriptura rule).
  const verses = await db.getChapter(TRANSLATION.id, lesson.ref.b, lesson.ref.c);
  const inRange = verses.filter((v) => v.v >= lesson.ref.vs && v.v <= lesson.ref.ve);
  if (inRange.length) {
    body.insertAdjacentHTML('beforeend',
      `<div class="card glass halo"><div class="scripture">` +
      inRange.map((v) => `<span><span class="vnum">${v.v}</span>${escapeHtml(v.text)} </span>`).join('') +
      `</div></div>`);
  }

  for (const step of lesson.steps) {
    const c = document.createElement('div');
    c.className = 'lesson-step glass';
    c.innerHTML = `<span class="kind">${step.kind}</span><p>${step.body}</p>`;
    body.append(c);
    if (step.kind === 'play' && step.game_id) {
      const host = document.createElement('div');
      host.className = 'game-host glass card';
      c.append(host);
      launchGame(step.game_id, host, lesson);
    }
  }

  body.insertAdjacentHTML('beforeend', `
    <div class="lesson-step glass christ-box"><span class="kind">Where is Jesus here?</span>
      <p>${lesson.christ_connection}</p></div>
    <div class="lesson-step glass"><span class="kind">What will I do?</span><p>${lesson.obedience_step}</p></div>
    <div class="lesson-step glass"><span class="kind">Who will I tell?</span><p>${lesson.multiply_step}</p></div>`);
}

async function launchGame(gameId, host, lesson) {
  if (gameId === 'verse-builder') {
    const mv = lesson.memory_verse;
    const rows = await db.getChapter(TRANSLATION.id, mv.b, mv.c);
    const text = rows.filter((v) => v.v >= mv.vs && v.v <= mv.ve).map((v) => v.text).join(' ');
    games.verseBuilder(host, { lessonId: lesson.id, refLabel: mv.ref, verseText: text });
  } else if (gameId === 'great-timeline') {
    games.greatTimeline(host, { lessonId: lesson.id, events: CURRICULUM.timeline_events });
  } else if (gameId === 'shepherd-path') {
    games.shepherdPath(host, { lessonId: lesson.id });
  }
}

function renderStudyB(study) {
  const body = $('#screen-learn .screen-body');
  body.innerHTML = `<button class="back-link">‹ All lessons</button>
    <h2 class="ca-heading">${study.title}</h2>
    <p class="game-sub">${study.passage_ref}</p>
    <div class="lesson-step glass"><span class="kind">Context</span><p>${study.context}</p></div>
    <div class="lesson-step glass christ-box"><span class="kind">Christ at the Center</span><p>${study.christ_connection}</p></div>
    <div class="lesson-step glass"><span class="kind">Defending the Hope</span><p>${study.apologetic}</p></div>`;
  body.querySelector('.back-link').addEventListener('click', renderLearnIndex);

  for (const vid of study.vocab || []) {
    const v = CURRICULUM.vocab.find((x) => x.id === vid);
    if (v) body.insertAdjacentHTML('beforeend', vocabCardHtml(v));
  }

  const refl = document.createElement('div');
  body.append(refl);
  games.reflection(refl, { studyId: study.id, passageRef: study.passage_ref, prompts: study.dbs });

  body.insertAdjacentHTML('beforeend', `
    <div class="lesson-step glass"><span class="kind">Obey</span><p>${study.obedience_step}</p></div>
    <div class="lesson-step glass"><span class="kind">Multiply</span><p>${study.multiply_step}</p></div>`);
}

const vocabCardHtml = (v) => `
  <div class="vocab-card glass">
    <span class="lemma">${v.lemma}</span><span class="translit">${v.translit}</span>
    <p><strong>${v.gloss}</strong></p><p>${v.teaching}</p>
    <p class="game-sub">Key texts: ${v.key_refs.join(' · ')}</p>
  </div>`;

/* =========================================================== study tab */
async function renderStudy() {
  const body = $('#screen-study .screen-body');
  body.innerHTML = `<h2 class="ca-heading">Study Deep</h2>
    <p class="game-sub">Cross-reference constellation — the threads of one story, drawn in light.</p>
    <canvas id="constellation-canvas"></canvas>
    <p class="game-sub" style="margin-top:16px">WORD STUDIES</p>
    <div id="vocab-list"></div>
    <p class="game-sub" style="margin-top:16px">MULTIPLICATION LEDGER · 2 Timothy 2:2</p>
    <div id="ledger"></div>`;

  requestAnimationFrame(() => games.constellation($('#constellation-canvas'), null));
  $('#vocab-list').innerHTML = CURRICULUM.vocab.map(vocabCardHtml).join('');
  renderLedger();
}

async function renderLedger() {
  const box = $('#ledger');
  const rows = await db.getDisciples();
  const byGen = new Map();
  rows.forEach((d) => byGen.set(d.generation, [...(byGen.get(d.generation) || []), d]));
  let html = '';
  if (!rows.length) {
    html += `<p class="game-sub">“And the things that thou hast heard of me… commit thou to
      faithful men, who shall be able to teach others also.” Who is your first name?</p>`;
  }
  for (const gen of [...byGen.keys()].sort()) {
    html += `<div class="ledger-gen">Generation ${gen}</div>`;
    html += byGen.get(gen).map((d) => `<div class="ledger-row glass">🕊️ ${escapeHtml(d.name)}</div>`).join('');
  }
  html += `<div class="ledger-add">
      <input id="ledger-name" placeholder="Name of a disciple you are teaching" maxlength="60">
      <button class="btn btn--gold" id="ledger-btn">Add</button>
    </div>`;
  box.innerHTML = html;
  $('#ledger-btn').addEventListener('click', async () => {
    const name = $('#ledger-name').value.trim();
    if (!name) return;
    await db.addDisciple(name, 1);
    renderLedger();
  });
}

boot();

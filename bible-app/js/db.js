/* LIVING WORD — offline storage engine (PWA mirror of data/schema.sql).
   IndexedDB on the web; the identical logical schema ships as SQLite for
   the Capacitor/Room/Core Data builds. All reads and writes are local;
   nothing ever leaves the device.                                        */

'use strict';

const DB_NAME = 'living-word';
const DB_VERSION = 1;

let _db = null;

function open() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // Scripture: key 'T|b|c|v' zero-padded so ranges sort correctly.
      db.createObjectStore('verses', { keyPath: 'key' })
        .createIndex('byChapter', 'chapterKey');
      db.createObjectStore('translations', { keyPath: 'id' });
      db.createObjectStore('crossrefs', { keyPath: 'key' })
        .createIndex('byFrom', 'fromKey');
      db.createObjectStore('highlights', { keyPath: 'key' });
      db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
      db.createObjectStore('bookmarks', { keyPath: 'key' });
      db.createObjectStore('gameProgress', { keyPath: 'key' });
      db.createObjectStore('journal', { keyPath: 'id', autoIncrement: true });
      db.createObjectStore('disciples', { keyPath: 'id', autoIncrement: true });
      db.createObjectStore('meta', { keyPath: 'k' });
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

const pad = (n, w) => String(n).padStart(w, '0');
const vKey = (t, b, c, v) => `${t}|${pad(b,2)}|${pad(c,3)}|${pad(v,3)}`;
const cKey = (t, b, c) => `${t}|${pad(b,2)}|${pad(c,3)}`;

function tx(db, store, mode = 'readonly') {
  return db.transaction(store, mode).objectStore(store);
}
const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

/* ------------------------------------------------------------- seeding */
export async function ensureSeeded() {
  const db = await open();
  const seeded = await reqP(tx(db, 'meta').get('seeded'));
  if (seeded) return getActiveTranslation();

  // Prefer a licensed ESV bundle if the deployment includes one; otherwise
  // fall back to the public-domain dev seed. Both files are precached by sw.js.
  let data = null;
  try {
    const r = await fetch('data/bible.json');           // produced by tools/import-esv.mjs
    if (r.ok) data = await r.json();
  } catch (_) { /* no licensed bundle in this build */ }
  if (!data) data = await (await fetch('data/seed-verses.json')).json();

  const t = data.translation.id;
  await new Promise((resolve, reject) => {
    const trx = db.transaction(['verses','translations','crossrefs','meta'], 'readwrite');
    trx.objectStore('translations').put(data.translation);
    const vs = trx.objectStore('verses');
    for (const r of data.verses) {
      vs.put({ key: vKey(t, r.b, r.c, r.v), chapterKey: cKey(t, r.b, r.c),
               t, b: r.b, c: r.c, v: r.v, text: r.t });
    }
    const xs = trx.objectStore('crossrefs');
    for (const x of (data.crossReferences || [])) {
      xs.put({ key: x.from.join('.') + '>' + x.to.join('.'),
               fromKey: x.from.join('.'), from: x.from, to: x.to, theme: x.theme });
    }
    trx.objectStore('meta').put({ k: 'seeded', v: 1 });
    trx.objectStore('meta').put({ k: 'activeTranslation', v: t });
    trx.oncomplete = resolve;
    trx.onerror = () => reject(trx.error);
  });
  return data.translation;
}

export async function getActiveTranslation() {
  const db = await open();
  const m = await reqP(tx(db, 'meta').get('activeTranslation'));
  return reqP(tx(db, 'translations').get(m ? m.v : 'KJV'));
}

/* ------------------------------------------------------------ scripture */
export async function getChapter(translationId, bookId, chapter) {
  const db = await open();
  const idx = tx(db, 'verses').index('byChapter');
  const rows = await reqP(idx.getAll(cKey(translationId, bookId, chapter)));
  return rows.sort((a, b) => a.v - b.v);
}

export async function getVerse(translationId, bookId, chapter, verse) {
  const db = await open();
  return reqP(tx(db, 'verses').get(vKey(translationId, bookId, chapter, verse)));
}

export async function getCrossRefs(bookId, chapter, verse) {
  const db = await open();
  const idx = tx(db, 'crossrefs').index('byFrom');
  const fwd = await reqP(idx.getAll([bookId, chapter, verse].join('.')));
  // constellation edges are bidirectional: include refs pointing here too
  const all = await reqP(tx(db, 'crossrefs').getAll());
  const back = all.filter((x) => x.to.join('.') === [bookId, chapter, verse].join('.'));
  return [...fwd, ...back];
}

export async function getAllCrossRefs() {
  const db = await open();
  return reqP(tx(db, 'crossrefs').getAll());
}

/* ------------------------------------------------------------ user data */
export async function toggleHighlight(t, b, c, v, color = 'gold') {
  const db = await open();
  const key = vKey(t, b, c, v);
  const store = tx(db, 'highlights', 'readwrite');
  const existing = await reqP(store.get(key));
  if (existing && existing.color === color) { store.delete(key); return null; }
  const row = { key, t, b, c, v, color, created: Date.now() };
  store.put(row);
  return row;
}

export async function getHighlights(t, b, c) {
  const db = await open();
  const all = await reqP(tx(db, 'highlights').getAll());
  return all.filter((h) => h.t === t && h.b === b && h.c === c);
}

export async function saveJournal(entry) {
  const db = await open();
  return reqP(tx(db, 'journal', 'readwrite').add({ ...entry, created: Date.now() }));
}

export async function getJournal() {
  const db = await open();
  return reqP(tx(db, 'journal').getAll());
}

export async function setGameProgress(lessonId, gameId, lampsLit) {
  const db = await open();
  tx(db, 'gameProgress', 'readwrite').put({
    key: `${lessonId}|${gameId}`, lessonId, gameId,
    completed: 1, lampsLit, updated: Date.now(),
  });
}

export async function getGameProgress() {
  const db = await open();
  return reqP(tx(db, 'gameProgress').getAll());
}

export async function addDisciple(name, generation, parentId = null) {
  const db = await open();
  return reqP(tx(db, 'disciples', 'readwrite')
    .add({ name, generation, parentId, started: Date.now() }));
}

export async function getDisciples() {
  const db = await open();
  return reqP(tx(db, 'disciples').getAll());
}

/* LIVING WORD — offline storage engine (PWA mirror of data/schema.sql).
   IndexedDB on the web; the identical logical schema ships as SQLite for
   the Capacitor/Room/Core Data builds. All reads and writes are local;
   nothing ever leaves the device.

   Sandboxed contexts (private modes, embedded frames) can refuse IndexedDB
   entirely. Rather than fail, the engine falls back to an in-memory store
   with the same surface: the app stays fully usable, and only the user's
   notes and progress are session-scoped.                                  */

'use strict';

const DB_NAME = 'living-word';
const DB_VERSION = 1;
const STORES = ['verses','translations','crossrefs','highlights','notes',
                'bookmarks','gameProgress','journal','disciples','meta'];

let _db = null;
let _mem = null;   // set when IndexedDB is unavailable

/* ------------------------------------------- in-memory fallback engine */
function makeMemDb() {
  const data = new Map(STORES.map((s) => [s, new Map()]));
  let autoId = 1;
  const store = (name) => ({
    get: (k) => data.get(name).get(k),
    getAll: (key) => {
      const rows = [...data.get(name).values()];
      return key === undefined ? rows : rows;
    },
    put: (row) => { data.get(name).set(row.key ?? row.id ?? row.k, row); return row; },
    add: (row) => { const id = autoId++; data.get(name).set(id, { ...row, id }); return id; },
    delete: (k) => data.get(name).delete(k),
    index: (idxName) => ({
      getAll: (key) => [...data.get(name).values()].filter((r) =>
        idxName === 'byChapter' ? r.chapterKey === key : r.fromKey === key),
    }),
  });
  return { __mem: true, store };
}

function open() {
  if (_db) return Promise.resolve(_db);
  if (_mem) return Promise.resolve(_mem);
  return new Promise((resolve) => {
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (_) {
      _mem = makeMemDb();
      return resolve(_mem);
    }
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
    req.onerror = () => { _mem = makeMemDb(); resolve(_mem); };
    req.onblocked = () => { _mem = makeMemDb(); resolve(_mem); };
  });
}

const pad = (n, w) => String(n).padStart(w, '0');
const vKey = (t, b, c, v) => `${t}|${pad(b,2)}|${pad(c,3)}|${pad(v,3)}`;
const cKey = (t, b, c) => `${t}|${pad(b,2)}|${pad(c,3)}`;

function tx(db, store, mode = 'readonly') {
  if (db.__mem) return db.store(store);
  return db.transaction(store, mode).objectStore(store);
}
/* Resolves either an IDBRequest or a plain value from the memory engine. */
const reqP = (r) => (r && typeof r === 'object' && 'onsuccess' in r)
  ? new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })
  : Promise.resolve(r);

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
  const rows = {
    verses: data.verses.map((r) => ({
      key: vKey(t, r.b, r.c, r.v), chapterKey: cKey(t, r.b, r.c),
      t, b: r.b, c: r.c, v: r.v, text: r.t,
    })),
    crossrefs: (data.crossReferences || []).map((x) => ({
      key: x.from.join('.') + '>' + x.to.join('.'),
      fromKey: x.from.join('.'), from: x.from, to: x.to, theme: x.theme,
    })),
  };

  if (db.__mem) {
    db.store('translations').put(data.translation);
    rows.verses.forEach((r) => db.store('verses').put(r));
    rows.crossrefs.forEach((r) => db.store('crossrefs').put(r));
    db.store('meta').put({ k: 'seeded', v: 1 });
    db.store('meta').put({ k: 'activeTranslation', v: t });
    return data.translation;
  }

  await new Promise((resolve, reject) => {
    const trx = db.transaction(['verses','translations','crossrefs','meta'], 'readwrite');
    trx.objectStore('translations').put(data.translation);
    const vs = trx.objectStore('verses');
    rows.verses.forEach((r) => vs.put(r));
    const xs = trx.objectStore('crossrefs');
    rows.crossrefs.forEach((r) => xs.put(r));
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
  const here = [bookId, chapter, verse].join('.');
  const all = await reqP(tx(db, 'crossrefs').getAll());
  // constellation edges are bidirectional
  return all.filter((x) => x.from.join('.') === here || x.to.join('.') === here);
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

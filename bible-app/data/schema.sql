-- LIVING WORD — canonical offline schema (SQLite dialect)
-- Maps 1:1 to Android Room entities and iOS Core Data; the PWA mirrors
-- these stores in IndexedDB (see js/db.js). All data lives on-device.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- Scripture
CREATE TABLE translations (
  id          TEXT PRIMARY KEY,          -- 'ESV', 'WEB'
  name        TEXT NOT NULL,
  language    TEXT NOT NULL DEFAULT 'en',
  copyright   TEXT NOT NULL,             -- full required notice, shown in-app
  licensed    INTEGER NOT NULL DEFAULT 0 -- 1 once a Crossway bundle is installed
);

CREATE TABLE books (
  id          INTEGER PRIMARY KEY,       -- 1=Genesis … 66=Revelation
  name        TEXT NOT NULL,
  abbrev      TEXT NOT NULL,
  testament   TEXT NOT NULL CHECK (testament IN ('OT','NT')),
  genre       TEXT NOT NULL,             -- law|history|wisdom|prophets|gospel|acts|epistle|apocalyptic
  chapters    INTEGER NOT NULL
);

CREATE TABLE verses (
  translation_id TEXT    NOT NULL REFERENCES translations(id),
  book_id        INTEGER NOT NULL REFERENCES books(id),
  chapter        INTEGER NOT NULL,
  verse          INTEGER NOT NULL,
  text           TEXT    NOT NULL,
  PRIMARY KEY (translation_id, book_id, chapter, verse)
) WITHOUT ROWID;

CREATE INDEX idx_verses_chapter ON verses (translation_id, book_id, chapter);

-- Offline full-text search over Scripture.
CREATE VIRTUAL TABLE verses_fts USING fts5(
  text, content='verses', tokenize='porter unicode61'
);

CREATE TABLE cross_references (
  from_book INTEGER NOT NULL, from_chapter INTEGER NOT NULL, from_verse INTEGER NOT NULL,
  to_book   INTEGER NOT NULL, to_chapter   INTEGER NOT NULL, to_verse   INTEGER NOT NULL,
  theme     TEXT,                          -- 'lamb'|'covenant'|'kingdom'|'temple'|…
  PRIMARY KEY (from_book, from_chapter, from_verse, to_book, to_chapter, to_verse)
) WITHOUT ROWID;

-- --------------------------------------------------------------- Curriculum
CREATE TABLE lessons (
  id               TEXT PRIMARY KEY,      -- 'A1-01', 'B2-03'
  track            TEXT NOT NULL CHECK (track IN ('A','B')),
  unit             INTEGER NOT NULL,
  seq              INTEGER NOT NULL,
  title            TEXT NOT NULL,
  passage_ref      TEXT NOT NULL,         -- 'Genesis 1:1-31'
  big_truth        TEXT NOT NULL,
  christ_connection TEXT NOT NULL,        -- REQUIRED: Luke 24:27 rule, enforced NOT NULL
  obedience_step   TEXT NOT NULL,         -- 'What will I do?'
  multiply_step    TEXT NOT NULL          -- 'Who will I tell?'
);

CREATE TABLE lesson_steps (
  lesson_id TEXT NOT NULL REFERENCES lessons(id),
  seq       INTEGER NOT NULL,
  kind      TEXT NOT NULL CHECK (kind IN
            ('hear','see','play','say','live','context','text','christ','life','multiply')),
  body      TEXT NOT NULL,                -- markdown; may embed {{ref}} scripture tokens
  game_id   TEXT,                         -- for kind='play'
  PRIMARY KEY (lesson_id, seq)
);

CREATE TABLE memory_verses (
  lesson_id TEXT PRIMARY KEY REFERENCES lessons(id),
  ref       TEXT NOT NULL,
  book_id   INTEGER NOT NULL, chapter INTEGER NOT NULL,
  v_start   INTEGER NOT NULL, v_end INTEGER NOT NULL
);

CREATE TABLE vocab_cards (                -- Track B word studies
  id        TEXT PRIMARY KEY,             -- 'gk-dikaiosyne'
  lemma     TEXT NOT NULL,
  language  TEXT NOT NULL CHECK (language IN ('greek','hebrew')),
  translit  TEXT NOT NULL,
  gloss     TEXT NOT NULL,
  teaching  TEXT NOT NULL,
  key_refs  TEXT NOT NULL                 -- JSON array of refs
);

-- ------------------------------------------------------------------- User
CREATE TABLE profiles (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name    TEXT NOT NULL,
  track   TEXT NOT NULL CHECK (track IN ('A','B')),
  created INTEGER NOT NULL                -- unix epoch
);

CREATE TABLE game_progress (
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  lesson_id  TEXT NOT NULL REFERENCES lessons(id),
  game_id    TEXT NOT NULL,
  completed  INTEGER NOT NULL DEFAULT 0,
  lamps_lit  INTEGER NOT NULL DEFAULT 0,  -- Ps 119:105 collection model, not points
  updated    INTEGER NOT NULL,
  PRIMARY KEY (profile_id, lesson_id, game_id)
);

CREATE TABLE highlights (
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  translation_id TEXT NOT NULL, book_id INTEGER NOT NULL,
  chapter INTEGER NOT NULL, verse INTEGER NOT NULL,
  color   TEXT NOT NULL DEFAULT 'gold',   -- gold|dawn|olive|water
  created INTEGER NOT NULL,
  PRIMARY KEY (profile_id, translation_id, book_id, chapter, verse)
);

CREATE TABLE notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  book_id    INTEGER NOT NULL, chapter INTEGER NOT NULL, verse INTEGER,
  body       TEXT NOT NULL,
  created    INTEGER NOT NULL, updated INTEGER NOT NULL
);

CREATE TABLE bookmarks (
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  book_id INTEGER NOT NULL, chapter INTEGER NOT NULL,
  created INTEGER NOT NULL,
  PRIMARY KEY (profile_id, book_id, chapter)
);

CREATE TABLE reading_plan (
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  day        INTEGER NOT NULL,
  passage    TEXT NOT NULL,
  done       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, day)
);

-- Multiplication ledger: the app's only "score" (2 Tim 2:2).
CREATE TABLE disciples (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  name       TEXT NOT NULL,
  generation INTEGER NOT NULL DEFAULT 1,  -- you=0, your disciples=1, theirs=2 …
  parent_id  INTEGER REFERENCES disciples(id),
  started    INTEGER NOT NULL
);

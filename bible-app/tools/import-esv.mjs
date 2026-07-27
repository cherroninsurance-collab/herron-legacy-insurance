#!/usr/bin/env node
/* LIVING WORD — licensed ESV ingestion pipeline (Module 2 §2.1, Module 5).
 *
 * The ESV® Bible is copyright © 2001 by Crossway, a publishing ministry of
 * Good News Publishers. Distributing the full ESV text inside an app
 * requires a license from Crossway: https://www.crossway.org/permissions/
 *
 * Once licensed, Crossway supplies the text (commonly via the ESV API with
 * an offline-rights agreement, or as a data file). This tool compiles that
 * data into the app's offline bundle (data/bible.json) and, optionally, a
 * SQLite dump matching data/schema.sql for native Room/Core Data builds.
 *
 * Usage:
 *   node tools/import-esv.mjs <input.json> [--sql out.sql]
 *
 * Expected input shape (adapt mapInput() to your licensed format):
 *   { "verses": [ { "book": 1..66, "chapter": n, "verse": n, "text": "..." }, ... ] }
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_JSON = resolve(HERE, '../data/bible.json');

const ESV_COPYRIGHT =
  'Scripture quotations are from the ESV® Bible (The Holy Bible, English ' +
  'Standard Version®), copyright © 2001 by Crossway, a publishing ministry ' +
  'of Good News Publishers. Used by permission. All rights reserved.';

const EXPECTED_VERSES = 31102; // full Protestant canon, KJV-style versification

function mapInput(raw) {
  // Adapt this mapping to the exact format Crossway delivers under your license.
  return raw.verses.map((v) => ({
    b: Number(v.book ?? v.b),
    c: Number(v.chapter ?? v.c),
    v: Number(v.verse ?? v.v),
    t: String(v.text ?? v.t).trim(),
  }));
}

function main() {
  const [input, ...rest] = process.argv.slice(2);
  if (!input) {
    console.error('Usage: node tools/import-esv.mjs <licensed-esv.json> [--sql out.sql]');
    process.exit(1);
  }
  const sqlIdx = rest.indexOf('--sql');
  const sqlOut = sqlIdx >= 0 ? rest[sqlIdx + 1] : null;

  const verses = mapInput(JSON.parse(readFileSync(resolve(input), 'utf8')));

  // ---- integrity checks: a Bible with missing verses is not shippable
  const bad = verses.find((r) => !(r.b >= 1 && r.b <= 66) || r.c < 1 || r.v < 1 || !r.t);
  if (bad) throw new Error('Malformed verse row: ' + JSON.stringify(bad));
  const seen = new Set(verses.map((r) => `${r.b}.${r.c}.${r.v}`));
  if (seen.size !== verses.length) throw new Error('Duplicate verse keys in input.');
  if (verses.length !== EXPECTED_VERSES) {
    console.warn(`⚠ Expected ${EXPECTED_VERSES} verses, got ${verses.length}. ` +
      'ESV versification legitimately omits some KJV verses (they appear in footnotes); ' +
      'verify against your licensed dataset before shipping.');
  }

  writeFileSync(OUT_JSON, JSON.stringify({
    translation: {
      id: 'ESV',
      name: 'English Standard Version',
      language: 'en',
      copyright: ESV_COPYRIGHT,
      licensed: 1,
    },
    verses,
    crossReferences: [], // merge a licensed/reference cross-ref set here if held
  }));
  console.log(`✔ Wrote ${OUT_JSON} (${verses.length} verses).`);
  console.log('  Remember: sw.js precaches data/bible.json automatically when present.');

  if (sqlOut) {
    const esc = (s) => s.replace(/'/g, "''");
    const lines = [
      "INSERT INTO translations (id,name,language,copyright,licensed) VALUES " +
      `('ESV','English Standard Version','en','${esc(ESV_COPYRIGHT)}',1);`,
    ];
    for (const r of verses) {
      lines.push(`INSERT INTO verses VALUES ('ESV',${r.b},${r.c},${r.v},'${esc(r.t)}');`);
    }
    writeFileSync(resolve(sqlOut), lines.join('\n') + '\n');
    console.log(`✔ Wrote SQLite seed ${sqlOut} (pair with data/schema.sql).`);
  }
}

main();

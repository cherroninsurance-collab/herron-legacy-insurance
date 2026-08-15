#!/usr/bin/env node
/* ECOLOGIA build — inject offline datasets into the single-file app.
 * Keeps the source readable while the shipped artifact stays 100%
 * self-contained (no fetch, no CDN, no service worker required).
 *
 * Usage: node tools/build-ecologia.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(APP, p), 'utf8');

// Canon metadata the UI needs (name/testament/genre), keyed by book id.
const BOOKS = read('js/canon.js')
  .match(/\[(\d+),'([^']+)','([^']+)','(OT|NT)','(\w+)',(\d+)\]/g) || [];
const canonMeta = {};
for (const row of BOOKS) {
  const [, id, name, abbrev, testament, genre, chapters] =
    row.match(/\[(\d+),'([^']+)','([^']+)','(OT|NT)','(\w+)',(\d+)\]/);
  canonMeta[+id] = { name, abbrev, testament, genre, chapters: +chapters };
}
if (Object.keys(canonMeta).length !== 66) {
  throw new Error(`Canon parse produced ${Object.keys(canonMeta).length} books, expected 66.`);
}

const minify = (json) => JSON.stringify(JSON.parse(json));

let html = read('ecologia.src.html')
  .replace('__BIBLE_DATA__', minify(read('data/bible-overview.json')))
  .replace('__TEACH_DATA__', minify(read('data/jesus-teachings.json')))
  .replace('__CANON_META__', JSON.stringify(canonMeta));

for (const token of ['__BIBLE_DATA__', '__TEACH_DATA__', '__CANON_META__']) {
  if (html.includes(token)) throw new Error('Unreplaced token: ' + token);
}
// The offline badge is a promise: fail the build if anything reaches out.
const external = html.match(/(?:src|href)\s*=\s*["']https?:\/\/[^"']+/gi);
if (external) throw new Error('External request found, breaks offline: ' + external.join(', '));

const out = resolve(APP, 'ecologia.html');
writeFileSync(out, html);
console.log(`✔ ${out} — ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, 0 external requests.`);

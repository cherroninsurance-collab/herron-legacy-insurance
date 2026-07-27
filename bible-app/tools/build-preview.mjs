#!/usr/bin/env node
/* LIVING WORD — single-file build.
 *
 * Compiles the whole app — markup, styles, ES modules, Scripture data, and
 * curriculum — into ONE self-contained preview.html with no external
 * requests of any kind. Two purposes:
 *
 *   1. Preview: open the file, or host it anywhere, and the app just runs.
 *   2. The field: a single HTML file can be shared phone-to-phone over
 *      Bluetooth, WhatsApp, or an SD card where no app store is reachable.
 *

 * The ES modules are concatenated into ONE inline <script type="module">
 * in dependency order, with import/export statements stripped and the
 * namespace imports (`import * as db`) reconstructed as plain objects.
 * No data: URLs and no import map: strict Content-Security-Policies
 * (such as hosted artifact pages) block data:-sourced scripts, and the
 * inline form runs everywhere plain inline scripts run.
 *
 * Usage: node tools/build-preview.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');
const read = (p) => readFileSync(resolve(APP, p), 'utf8');

/* Dependency order matters: later entries call into earlier ones. The
   namespaces list rebuilds `import * as X` objects from each module's
   exported names once the sources share a single scope. */
const MODULES = [
  { file: 'canon.js' },
  { file: 'pageflip.js' },
  { file: 'db.js', namespace: 'db', exports: [
      'ensureSeeded','getActiveTranslation','getChapter','getVerse',
      'getCrossRefs','getAllCrossRefs','toggleHighlight','getHighlights',
      'saveJournal','getJournal','setGameProgress','getGameProgress',
      'addDisciple','getDisciples'] },
  { file: 'games.js', namespace: 'games', exports: [
      'verseBuilder','greatTimeline','shepherdPath','constellation','reflection'] },
  { file: 'splash.js' },
  { file: 'app.js' },
];
const DATA_FILES = ['data/seed-verses.json', 'data/curriculum.json'];

/* Inline data served to the app's own fetch() calls — no network, no SW. */
function fetchShim() {
  const payload = Object.fromEntries(
    DATA_FILES.map((f) => [f, JSON.parse(read(f))])
  );
  return `
window.__LIVING_WORD_SINGLE_FILE = true;
const __DATA = ${JSON.stringify(payload)};
const __realFetch = window.fetch ? window.fetch.bind(window) : null;
window.fetch = (input, init) => {
  const url = String(input && input.url ? input.url : input);
  for (const key of Object.keys(__DATA)) {
    if (url.endsWith(key)) {
      return Promise.resolve(new Response(JSON.stringify(__DATA[key]),
        { status: 200, headers: { 'content-type': 'application/json' } }));
    }
  }
  // A licensed ESV bundle isn't part of a single-file preview build.
  if (url.endsWith('data/bible.json')) {
    return Promise.resolve(new Response('', { status: 404 }));
  }
  return __realFetch ? __realFetch(input, init)
    : Promise.reject(new Error('offline single-file build'));
};`;
}

function main() {
  let html = read('index.html');

  // ---- styles inline
  for (const css of ['css/liquid-glass.css', 'css/app.css']) {
    html = html.replace(`<link rel="stylesheet" href="${css}">`,
      `<style>\n${read(css)}\n</style>`);
  }
  // ---- manifest is meaningless in a single file
  html = html.replace('<link rel="manifest" href="manifest.webmanifest">', '');

  // ---- modules → one inline module script, shared scope
  const parts = [];
  for (const m of MODULES) {
    const src = read('js/' + m.file)
      .replace(/^import\s[^;]*;\s*$/gm, '')     // static imports
      .replace(/^export\s+/gm, '')              // export prefixes
      .replace(/^'use strict';\s*$/gm, '');     // module scope is already strict
    parts.push(`/* ======== ${m.file} ======== */\n${src}`);
    if (m.namespace) {
      parts.push(`const ${m.namespace} = { ${m.exports.join(', ')} };`);
    }
  }

  html = html.replace('<script type="module" src="js/app.js"></script>', `
<script>${fetchShim()}</script>
<script type="module">
${parts.join('\n')}
</script>`);

  const out = resolve(APP, 'preview.html');
  writeFileSync(out, html);
  const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
  console.log(`✔ Wrote ${out} — ${kb} KB, fully self-contained (0 external requests).`);
}

main();

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
 * ES modules are inlined as data: URLs and wired together with an inline
 * import map. Relative specifiers can't resolve from a data: URL, so each
 * './x.js' is rewritten to the bare specifier 'x', which the import map
 * resolves regardless of the importing module's base.
 *
 * Usage: node tools/build-preview.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');
const read = (p) => readFileSync(resolve(APP, p), 'utf8');

const MODULES = ['canon.js', 'pageflip.js', 'db.js', 'games.js', 'splash.js', 'app.js'];
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

  // ---- modules → data: URLs + import map
  const imports = {};
  for (const m of MODULES) {
    const src = read('js/' + m)
      .replace(/(\bfrom\s+['"])\.\/([\w-]+)\.js(['"])/g, '$1$2$3');
    const bare = m.replace(/\.js$/, '');
    imports[bare] = 'data:text/javascript;base64,' +
      Buffer.from(src, 'utf8').toString('base64');
  }

  html = html.replace('<script type="module" src="js/app.js"></script>', `
<script>${fetchShim()}</script>
<script type="importmap">${JSON.stringify({ imports })}</script>
<script type="module">import 'app';</script>`);

  const out = resolve(APP, 'preview.html');
  writeFileSync(out, html);
  const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
  console.log(`✔ Wrote ${out} — ${kb} KB, fully self-contained (0 external requests).`);
}

main();

/* LIVING WORD — service worker: strict offline packaging (Module 5 §5.2).
   Every asset the app can ever request is precached on first visit; from
   then on the app is served cache-first with NO runtime network fallback.
   Zero telemetry, zero CDN, zero external requests — usable anywhere.    */

'use strict';

const CACHE = 'living-word-v1';

const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/liquid-glass.css',
  'css/app.css',
  'js/app.js',
  'js/splash.js',
  'js/pageflip.js',
  'js/canon.js',
  'js/db.js',
  'js/games.js',
  'data/curriculum.json',
  'data/seed-verses.json',
  // 'data/bible.json' is added by tools/import-esv.mjs for licensed builds
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      // a licensed ESV bundle may or may not exist in this build
      .then(() => caches.open(CACHE).then((c) => c.add('data/bible.json').catch(() => {})))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // cache-first, cache-only after install: the field has no internet.
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((hit) =>
      hit || fetch(event.request).then((res) => {
        // first-visit stragglers get cached too, then never fetched again
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(event.request, copy)).catch(() => {});
        return res;
      }).catch(() => new Response('Offline — asset not in the bundle.', { status: 404 }))
    )
  );
});

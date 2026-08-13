/* Producer OS service worker — the app has to work at a kitchen table with no bars.
   Shell + content are cached on install; the coach endpoint is never cached.
   Bump CACHE when any file in ASSETS changes, or phones keep serving the old copy. */

var CACHE = 'producer-os-v1';
var ASSETS = [
  './',
  'index.html',
  'app.css',
  'app.js',
  'views.js',
  'data.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-180.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                       // the coach POSTs — always live
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;             // fonts etc. fall through to the network
  if (url.pathname.indexOf('/.netlify/functions/') === 0) return;

  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) {
        // refresh in the background so the next launch is current
        fetch(req).then(function (res) {
          if (res && res.ok) caches.open(CACHE).then(function (c) { c.put(req, res.clone()); });
        }).catch(function () {});
        return hit;
      }
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return req.mode === 'navigate' ? caches.match('index.html') : Response.error();
      });
    })
  );
});

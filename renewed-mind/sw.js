/* Renewed Mind — offline shell.
   The app is a single page plus four fonts and two icons, so the whole thing
   is precached on install. Nothing here touches the user's data: entries live
   in localStorage, which the service worker never sees. */

var CACHE = 'renewed-mind-v1';

var SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'fonts/cormorant-garamond.woff2',
  'fonts/cormorant-garamond-italic.woff2',
  'fonts/eb-garamond.woff2',
  'fonts/eb-garamond-italic.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-180.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE)
      // addAll is all-or-nothing; one 404 would leave the app with no cache at
      // all, so each entry is added on its own and failures are tolerated.
      .then(function(c){
        return Promise.all(SHELL.map(function(u){
          return c.add(u).catch(function(){});
        }));
      })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){
        return Promise.all(keys.map(function(k){
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // The page itself goes network-first so a deployed update lands on the next
  // online launch instead of being pinned to whatever installed first.
  if (req.mode === 'navigate'){
    e.respondWith(
      fetch(req)
        .then(function(res){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put('index.html', copy); });
          return res;
        })
        .catch(function(){
          return caches.match('index.html').then(function(hit){
            return hit || caches.match('./');
          });
        })
    );
    return;
  }

  // Fonts and icons never change without a cache bump — serve them instantly.
  e.respondWith(
    caches.match(req).then(function(hit){
      return hit || fetch(req).then(function(res){
        if (res && res.status === 200 && res.type === 'basic'){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      });
    })
  );
});

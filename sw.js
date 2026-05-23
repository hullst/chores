// Service worker for the Hull chore board.
// Strategy:
//   - same-origin (our HTML/JS): network-first, fall back to cache when
//     offline (so edits go live immediately when online).
//   - known static CDNs (Firebase SDK, SortableJS, fonts): cache-first.
//   - everything else (notably Firestore's API/streaming): left untouched
//     so realtime sync is never intercepted.
var CACHE = 'hull-chores-v1';
var SHELL = ['./', 'index.html', 'admin.html', 'chore-engine.js', 'manifest.json', 'icon.svg'];
var CDN_HOSTS = ['www.gstatic.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL); })
      .catch(function () {})
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // App shell: network-first, fall back to cache.
    e.respondWith(
      fetch(req)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
          return res;
        })
        .catch(function () {
          return caches.match(req).then(function (hit) {
            return hit || caches.match('index.html');
          });
        })
    );
    return;
  }

  if (CDN_HOSTS.indexOf(url.hostname) !== -1) {
    // Versioned static deps: cache-first.
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
          return res;
        });
      })
    );
  }
  // else: leave Firestore + everything else to the network untouched.
});

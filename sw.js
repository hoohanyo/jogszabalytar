/* Jogszabálytár — service worker (offline működés). A build írja: d38dc20301 */
var CACHE = 'jt-d38dc20301';
var HEJ = ['./', 'index.html', 'config.js', 'manifest.webmanifest',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(HEJ); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (k) {
    return Promise.all(k.filter(function (n) { return n.indexOf('jt-') === 0 && n !== CACHE; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

// Hálózat először (3 mp türelemmel), ha nem megy: a tárolt példány
function halozatElobb(req) {
  return new Promise(function (ok) {
    var kesz = false;
    var ido = setTimeout(function () { caches.match(req, { ignoreSearch: true }).then(function (r) { if (r && !kesz) { kesz = true; ok(r); } }); }, 3000);
    fetch(req).then(function (r) {
      if (r && r.ok) { var m = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, m); }); }
      if (!kesz) { kesz = true; clearTimeout(ido); ok(r); }
    }).catch(function () {
      clearTimeout(ido);
      caches.match(req, { ignoreSearch: true }).then(function (r) { if (!kesz) { kesz = true; ok(r || caches.match('index.html')); } });
    });
  });
}
// Tárolt példány először (betűtípusok, ikonok)
function tarElobb(req) {
  return caches.match(req).then(function (r) {
    return r || fetch(req).then(function (v) {
      if (v && (v.ok || v.type === 'opaque')) { var m = v.clone(); caches.open(CACHE).then(function (c) { c.put(req, m); }); }
      return v;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var u = new URL(req.url);
  // Az Apps Script adatait az app maga tárolja (localStorage) — ezekhez nem nyúlunk
  if (/script\.google(usercontent)?\.com$/.test(u.hostname)) return;
  if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) { e.respondWith(tarElobb(req)); return; }
  if (u.origin !== location.origin) return;
  if (req.mode === 'navigate') { e.respondWith(halozatElobb(new Request('index.html'))); return; }
  if (/\/icons\//.test(u.pathname)) { e.respondWith(tarElobb(req)); return; }
  e.respondWith(halozatElobb(req));
});

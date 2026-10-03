/* e-READ Project: saves the app on the phone so it opens even with a weak signal or no signal.
   The saved page opens at once. A newer page is downloaded quietly in the background. */
const CACHE = 'eread-v4';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // data sent to the server is never saved here
  const url = new URL(req.url);
  if (url.searchParams.has('check')) return;       // version checks always go to the internet
  if (url.hostname.indexOf('script.google') >= 0 || url.hostname.indexOf('googleusercontent') >= 0) return;  // live server answers
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !isFont) return;
  // Saved copy first, then refresh it in the background
  e.respondWith(caches.open(CACHE).then(async c => {
    const key = req.mode === 'navigate' ? './index.html' : req;
    const saved = await c.match(key, { ignoreSearch: req.mode === 'navigate' });
    const fresh = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) c.put(key, res.clone());
      return res;
    }).catch(() => saved);
    return saved || fresh;
  }));
});

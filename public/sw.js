const CACHE = 'katricos-shell-v1';
const STATIC_FILES = [
  '/img/gg.jpg',
  '/img/jogos.png',
  '/img/jovens.png',
  '/img/pp.jpg',
  '/img/sl.jpg',
  '/Regulamento%202026.pdf',
  '/Regulamento%202026.docx',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const response = await fetch('/');
    if (!response.ok) throw new Error(`Não foi possível armazenar o app offline: ${response.status}`);
    await cache.put('/', response.clone());
    const html = await response.text();
    const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map(([, path]) => new URL(path, self.location.origin))
      .filter(url => url.origin === self.location.origin)
      .map(url => url.pathname + url.search);
    await cache.addAll([...new Set([...assets, ...STATIC_FILES])]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('katricos-') && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  const isStatic = url.pathname.startsWith('/assets/')
    || url.pathname.startsWith('/img/')
    || url.pathname.startsWith('/Regulamento%202026.');
  if (isStatic) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE);
          await cache.put('/', response.clone());
        }
        return response;
      } catch {
        const cached = await caches.match('/');
        if (cached) return cached;
        return Response.error();
      }
    })());
  }
});

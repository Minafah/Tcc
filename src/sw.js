// Service worker (modèle) : la version et la liste des fichiers sont insérées au build (voir vite.config.ts).
// Stratégie : tout est servi depuis le cache ; l'application ne fait aucune autre requête réseau.
const CACHE = 'tcc-__VERSION__';
const FICHIERS = __FICHIERS__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FICHIERS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c.startsWith('tcc-') && c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    // Toujours afficher l'application, même sans réseau.
    event.respondWith(caches.match('./').then((r) => r || fetch(req)));
    return;
  }
  event.respondWith(caches.match(req).then((r) => r || fetch(req)));
});

// Service worker minimal — condition requise par la plupart des navigateurs
// (Chrome/Android en particulier) pour proposer l'installation de l'appli,
// en plus du manifeste. Pas de cache agressif : le contenu (lectures,
// tableau de bord) est personnalisé et généré à la demande, le mettre en
// cache pourrait afficher des données périmées. On se contente de mettre en
// cache les quelques assets statiques de la marque, et de servir la
// dernière page visitée si la personne perd la connexion.

const CACHE_NAME = 'horosphere-shell-v1';
const PRECACHE_URLS = ['/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {
      // Hors-ligne dès l'installation ou asset manquant — pas bloquant.
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Navigation : toujours privilégier le réseau (contenu à jour), et ne se
// rabattre sur un instantané en cache que si la personne est hors-ligne.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  );
});

// Kinésis : appli installable et utilisable hors connexion.
// Page et fichiers du site : réseau d'abord (toujours la dernière version), copie gardée pour le hors connexion.
// Supabase et les autres sites ne passent pas par ici.
const CACHE = "kinesis-v2";
const CORE = ["./", "index.html", "manifest.webmanifest", "vendor/supabase.js", "vendor/vosk.js", "vendor/msal-browser.min.js", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  // le modèle vocal est gros : on le garde en cache dès le premier téléchargement
  if (url.pathname.includes("/models/")) {
    e.respondWith(caches.open(CACHE).then(async c => (await c.match(req)) || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }
  e.respondWith(fetch(req).then(r => { if (r.ok) caches.open(CACHE).then(c => c.put(req, r.clone())); return r; })
    .catch(() => caches.match(req).then(m => m || (req.mode === "navigate" ? caches.match("index.html") : Response.error()))));
});

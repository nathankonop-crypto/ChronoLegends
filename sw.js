/* =============================================================
   CHRONOLEGENDS — Service worker (application installable)
   Il ne garde AUCUN fichier en mémoire : le jeu vient toujours du site,
   donc chaque mise à jour publiée arrive tout de suite chez les joueurs.
   Il sert seulement à rendre le jeu installable, et à afficher un
   message clair si le téléphone n'a pas de connexion.
   ============================================================= */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

const HORS_LIGNE = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>ChronoLegends</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#101320;color:#e9e3d3;
font-family:Georgia,serif;text-align:center;padding:24px}h1{color:#f1dc9f;letter-spacing:.1em;font-size:22px}
button{margin-top:16px;padding:10px 22px;border-radius:999px;border:1px solid #d4b26a;background:none;color:#f1dc9f;font:inherit}</style></head>
<body><div><h1>ChronoLegends</h1><p>Pas de connexion internet.<br>No internet connection.<br>אין חיבור לאינטרנט.</p>
<button onclick="location.reload()">↻</button></div></body></html>`;

// Notification reçue du serveur (« Votre booster gratuit est arrivé ! »).
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { texte: e.data?.text() }; }
  e.waitUntil(self.registration.showNotification(d.titre || "ChronoLegends", {
    body: d.texte || "",
    icon: "images/app/icone-192.png",
    badge: "images/app/favicon.png",
    tag: "booster-quotidien",          // une seule à la fois : la nouvelle remplace l'ancienne
    data: { url: d.url || "./" },
  }));
});

// Appui sur la notification : on rouvre le jeu (ou on le ramène au premier plan).
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(fenetres => {
    const ouverte = fenetres.find(f => "focus" in f);
    return ouverte ? ouverte.focus() : self.clients.openWindow(e.notification.data?.url || "./");
  }));
});

// Pages du site uniquement : si le réseau ne répond pas, page « hors ligne ».
self.addEventListener("fetch", e => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() =>
    new Response(HORS_LIGNE, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});

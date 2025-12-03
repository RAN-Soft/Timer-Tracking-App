// Version / Name des Caches – bei Änderungen hochzählen
const CACHE_VERSION = "v1.0.0";
const STATIC_CACHE = `tt-static-${CACHE_VERSION}`;

// Wichtige Dateien, die wir beim Install direkt cachen (App Shell)
const STATIC_ASSETS = [
  // App-Shell / Route
  "/time-tracking",

  // Frontend-Bundle (Vue SPA)
  "/assets/time_tracking_app/frontend/assets/index.js",

  // Manifest & Icons (optional, aber nice)
  "/assets/time_tracking_app/manifest.json",
  "/assets/time_tracking_app/icons/icon-192.png",
  "/assets/time_tracking_app/icons/icon-512.png",

  // Optional: Fallback CSS/Framework, falls du sowas einbindest
  // "/assets/css/frappe-web-b4.css",
];

// Hilfsfunktion: Prüfen, ob Request zur gleichen Origin gehört
function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

// INSTALL: statische Assets vorcachen
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        // Wenn ein Asset fehlt -> nicht crashen
        console.warn("[SW] Precache Fehler:", err);
      });
    })
  );
  self.skipWaiting();
});

// ACTIVATE: alte Caches aufräumen
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key.startsWith("tt-static-") && key !== STATIC_CACHE) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// FETCH: unterschiedliche Strategien für HTML, Assets, API
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Nur HTTP/HTTPS
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // 1) Navigation (HTML) → Network-First, Fallback Cache
  if (request.mode === "navigate") {
    event.respondWith(handlePageRequest(request));
    return;
  }

  // 2) API-Requests (z.B. /api/method/...) → Network-First
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 3) Statische Assets (JS/CSS/Icons) von eigener Origin → Stale-While-Revalidate
  if (isSameOrigin(request) && isStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default: einfach Netzwerk
  return;
});

// Prüfen, ob es sich um ein statisches Asset handelt
function isStaticAsset(pathname) {
  return (
    pathname.endsWith(".js") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".webp")
  );
}

// Strategie: Network-First für Seiten (HTML)
async function handlePageRequest(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    // Offline → versuche gecachte Variante
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Letzte Fallback-Option: App-Shell /time-tracking
    const shell = await caches.match("/time-tracking");
    if (shell) {
      return shell;
    }

    // Wenn gar nichts da ist → Standard-Fehler
    return new Response("Offline und keine gecachte Version verfügbar.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// Strategie: Network-First (für API)
async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    return fresh;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw err;
  }
}

// Strategie: Stale-While-Revalidate (für Assets)
async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  // Wenn Cache da → sofort zurückgeben, Netzwerk im Hintergrund
  if (cached) {
    networkFetch.catch(() => {});
    return cached;
  }

  // Kein Cache → auf Netzwerk warten
  const fresh = await networkFetch;
  return fresh || new Response("Asset nicht verfügbar (offline).", {
    status: 503,
  });
}

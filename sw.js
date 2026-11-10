/* Service worker dos Bichinhos: funciona offline e recebe notificações */
const CACHE = "bichinho-v5";
const SHELL = ["./", "./index.html", "./admin.html", "./config.js", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* páginas: tenta a rede primeiro (pra pegar atualizações), cai no cache se estiver offline */
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
  );
});

self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) { data = { body: e.data && e.data.text() }; }
  const title = data.title || "Seu bichinho 🐾";
  e.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "Seu bichinho quer falar com você.",
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      data: { url: data.url || "./" },
      tag: data.tag || "bichinho",
      renotify: true
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL(e.notification.data && e.notification.data.url || "./", self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if (c.url.split("#")[0] === target.split("#")[0] && "focus" in c) return c.focus(); }
      return self.clients.openWindow(target);
    })
  );
});

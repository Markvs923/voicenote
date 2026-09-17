self.addEventListener("install", (e) => {
  e.waitUntil(caches.open("vn-3").then((c) => c.addAll(["./", "./index.html", "./manifest.json", "./icon.svg"])));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== "vn-3").map((k) => caches.delete(k)))));
});
self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});

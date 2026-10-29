/* NurRisale service worker: siteyi ve açılan kitapları çevrimdışı okunabilir kılar.
   Sayfa (index.html) önce ağdan denenir, olmazsa önbellekten gelir.
   Kitaplar, kapaklar ve yazı tipleri önbellekten gelir; yoksa indirilip saklanır. */
const CACHE = "nurrisale-v5";
const SHELL = ["./", "index.html", "books/index.json", "books/lugat.json", "books/lugat-big.json", "books/kelime-sira.json", "manifest.webmanifest",
  "fonts/souvenir-regular.woff", "fonts/souvenir-bold.woff", "fonts/souvenir-italic.woff", "fonts/hamdullah.woff", "icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isPage = req.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/");
  const isListOrLugat = /books\/(index|lugat|lugat-big|kelime-sira)\.json$/.test(url.pathname);
  if (isPage || isListOrLugat) {
    // Önce ağ: yeni sürüm hemen gelsin; çevrimdışıysa önbellek
    e.respondWith(fetch(req, { cache: "no-cache" }).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then((r) => r || caches.match("index.html"))));
    return;
  }
  const cacheable = url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!cacheable) return;
  // Önce önbellek: kitaplar, kapaklar, yazı tipleri
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});

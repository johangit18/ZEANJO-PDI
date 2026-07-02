const CACHE_NAME = "zeanjo-v1";

const urlsToCache = [
    "./",
    "./index.html",
    "./editor.html",
    "./quienes.html",
    "./creditos.html",
    "./css/styles.css",
    "./js/main.js",
    "./img/logo-app.jpg",
    "./img/logo-uct.png",
    "./img/icon.jpg"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});
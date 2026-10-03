"use strict";

const BASE_PATH = "__BASE_PATH__";
const CACHE_PREFIX = "__CACHE_PREFIX__";
const CACHE_NAME = "__CACHE_NAME__";
const APP_SHELL = __APP_SHELL__;
const MAX_STATIC_ENTRIES = 80;

function isCacheable(response) {
  return response && response.ok && response.type !== "opaque";
}

async function trimCache(cache) {
  const keys = await cache.keys();
  await Promise.all(
    keys.slice(0, Math.max(0, keys.length - MAX_STATIC_ENTRIES)).map(key =>
      cache.delete(key)
    )
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheable(response)) {
    await cache.put(request, response.clone());
    await trimCache(cache);
  }
  return response;
}

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (isCacheable(response)) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw error;
  }
}

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(BASE_PATH) ||
    url.pathname.endsWith(".map")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, BASE_PATH));
    return;
  }

  const destination = request.destination;
  if (destination === "image" || destination === "font") {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (
    destination === "script" ||
    destination === "style" ||
    destination === "document"
  ) {
    event.respondWith(networkFirst(request));
  }
});

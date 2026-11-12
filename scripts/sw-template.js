/*
  CBZ Reader service worker.

  scripts/prerender.mjs fills in the cache version and the app-shell precache
  list at build time, so this file only ships to dist/ and is never served by
  the dev server (src/main.ts registers it in production builds only).

  Caching strategy:
  - navigations (HTML): network first, cache fallback. The user always gets the
    newest page when online, and the last copy when not.
  - /assets/*: cache first. Those filenames are content-hashed, so a hit is
    always the right build.
  - everything else on this origin (icons, manifest): stale-while-revalidate.
  - content pages are cached the first time they are opened, never precached,
    so the shell stays small.
*/

const VERSION = '__CACHE_VERSION__'
const SHELL_CACHE = `cbz-shell-${VERSION}`
const RUNTIME_CACHE = `cbz-runtime-${VERSION}`
const PRECACHE = __PRECACHE__

const OFFLINE_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline - CBZ Reader</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#e6ecef;color:#101418;font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}main{max-width:34rem;padding:2rem;border:2px solid #101418;background:#f4f7f8;box-shadow:6px 6px 0 rgba(0,0,0,.55);text-align:center}.stamp{display:inline-block;margin:0 0 14px;padding:4px 8px;border:2px solid #b8362a;color:#b8362a;font:700 10px/1 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;transform:rotate(-4deg)}h1{margin:0 0 10px;font-size:1.6rem;letter-spacing:-.02em}p{margin:0;color:#5b6870}a{color:#101418;text-decoration:underline;text-underline-offset:2px}@media (prefers-color-scheme:dark){body{background:#12161b;color:#eef2f4}main{background:#1a1f25;border-color:#c9d3da;box-shadow:6px 6px 0 rgba(0,0,0,.55)}.stamp{border-color:#d95f4a;color:#d95f4a}p{color:#a7b2b9}a{color:#eef2f4}}</style>
</head><body><main><p class="stamp">Offline</p><h1>You are offline</h1><p>This page has not been saved for offline reading yet. The reader itself still works: <a href="/">open CBZ Reader</a> and pick a file from your device.</p></main></body></html>`

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))),
    ),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

// The page asks for this only after a fresh navigation, so a new build takes
// over on the next page load instead of interrupting someone mid-chapter.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  try {
    const response = await fetch(request)
    if (response && response.ok) await cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    // Only the home document falls back to the precached shell; an unvisited
    // article must not silently render the home page at its own URL.
    const path = new URL(request.url).pathname
    if (path === '/' || path === '/index.html') {
      const shell = await caches.match('/')
      if (shell) return shell
    }
    return new Response(OFFLINE_PAGE, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response && response.ok) {
    const cache = await caches.open(RUNTIME_CACHE)
    await cache.put(request, response.clone())
  }
  return response
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then(async (response) => {
      if (response && response.ok) await cache.put(request, response.clone())
      return response
    })
    .catch(() => cached)
  return cached || network
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Cross-origin requests (analytics) are left to the network on purpose.
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  event.respondWith(staleWhileRevalidate(request))
})

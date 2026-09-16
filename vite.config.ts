import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

function pwaServiceWorker(base: string): Plugin {
  return {
    name: 'love-language-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const version = new Date().toISOString()
      const precache = Object.keys(bundle).map((file) => `${base}${file}`)
      const source = `
const VERSION = ${JSON.stringify(version)}
const CACHE_NAME = 'love-language-' + VERSION
const APP_SHELL = ${JSON.stringify(precache)}
const APP_URL = new URL(${JSON.stringify(base)}, self.location.origin).href

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('love-language-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(APP_URL, response.clone()))
          return response
        })
        .catch(() => caches.match(APP_URL).then((response) => response || Response.error()))
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
      return response
    }))
  )
})
`
      this.emitFile({ type: 'asset', fileName: 'service-worker.js', source })
    }
  }
}

export default defineConfig(({ command }) => {
  const base = command === 'build' ? '/EnglishApp/' : '/'
  return {
    base,
    plugins: [vue(), pwaServiceWorker(base)]
  }
})

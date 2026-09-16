import { reactive } from 'vue'

export const pwaUpdate = reactive({
  available: false,
  applying: false
})

let registration: ServiceWorkerRegistration | null = null
let reloading = false
let updateAccepted = false

function watchInstalling(worker: ServiceWorker, currentRegistration: ServiceWorkerRegistration) {
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
      registration = currentRegistration
      pwaUpdate.available = true
    }
  })
}

async function registerServiceWorker() {
  try {
    registration = await navigator.serviceWorker.register(
      `${import.meta.env.BASE_URL}service-worker.js`,
      { scope: import.meta.env.BASE_URL, updateViaCache: 'none' }
    )

    if (registration.waiting && navigator.serviceWorker.controller) {
      pwaUpdate.available = true
    }

    registration.addEventListener('updatefound', () => {
      if (registration?.installing) watchInstalling(registration.installing, registration)
    })

    const checkForUpdate = () => {
      if (document.visibilityState === 'visible') registration?.update().catch(() => undefined)
    }
    document.addEventListener('visibilitychange', checkForUpdate)
    window.addEventListener('focus', checkForUpdate)
    window.setInterval(checkForUpdate, 60 * 60 * 1000)
  } catch (error) {
    console.warn('Service Workerの登録に失敗しました。', error)
  }
}

export function installPwaUpdates() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updateAccepted || reloading) return
    reloading = true
    window.location.reload()
  })

  if (document.readyState === 'complete') registerServiceWorker()
  else window.addEventListener('load', registerServiceWorker, { once: true })
}

export async function applyPwaUpdate() {
  if (!registration) return
  pwaUpdate.applying = true

  if (!registration.waiting) await registration.update().catch(() => undefined)
  if (registration.waiting) {
    updateAccepted = true
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  } else pwaUpdate.applying = false
}

export function dismissPwaUpdate() {
  pwaUpdate.available = false
}

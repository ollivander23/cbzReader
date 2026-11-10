import './styles/base.css'
import { mountRecentShelf } from './components/recentShelf'
import { fileExtension, sizeBucket, track } from './lib/track'
import { initTheme } from './lib/theme'
import { mountThemeSwitch } from './lib/themeSwitch'

const isIOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

let readerRequested = false

function startReader(file?: File | null, replace = false): void {
  if (readerRequested && !replace) return
  const host = document.getElementById('reader-app')
  if (!host) return
  readerRequested = true
  void import('./reader/mount').then(({ mountReader }) => mountReader(host, file))
}

function wireStaticReader(): void {
  const host = document.getElementById('reader-app')
  if (!host) return

  const button = host.querySelector<HTMLButtonElement>('[data-open-reader]')
  const input = host.querySelector<HTMLInputElement>('input[type="file"]')
  if (!button || !input) return

  // iOS Safari greys out files when the accept list is too specific, so relax it there.
  if (isIOS) input.accept = '*/*'

  button.addEventListener('click', () => input.click())

  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (file) {
      track('tool_open', {
        source: 'picker',
        ext: fileExtension(file.name),
        size_bucket: sizeBucket(file.size),
      })
      startReader(file)
    }
  })

  host.addEventListener('dragover', (event) => {
    event.preventDefault()
  })

  host.addEventListener('drop', (event) => {
    event.preventDefault()
    const file = event.dataTransfer?.files?.[0]
    if (file) {
      track('tool_open', {
        source: 'drag',
        ext: fileExtension(file.name),
        size_bucket: sizeBucket(file.size),
      })
      startReader(file)
    }
  })
}

function currentPagePath(): string {
  const path = location.pathname
  return path === '/' || path.endsWith('/') ? path : `${path}/`
}

// Landing pages are prerendered as plain HTML, so clicks are delegated here
// instead of bound through Vue.
function wireCtaTracking(): void {
  document.addEventListener('click', (event) => {
    const element = event.target instanceof Element ? event.target : null
    const link = element?.closest<HTMLAnchorElement>('.cta a[href], .related__grid a[href]')
    if (!link) return
    track('cta_click', { page: currentPagePath(), target: link.getAttribute('href') ?? '' })
  })
}

function preventBrowserDrop(event: DragEvent): void {
  event.preventDefault()
}

// Production only: a service worker in dev would serve stale files and make
// local debugging confusing. The worker itself is generated at build time.
function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // A worker installed during an earlier visit stays in the waiting state
        // on purpose. Once this fresh page load finishes booting there is no
        // reading session to interrupt, so it can take over without a reload.
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
      })
      .catch(() => {
        // Offline support is an enhancement; a failed registration must not
        // break the reader.
      })
  })
}

function bootstrap(): void {
  window.addEventListener('dragover', preventBrowserDrop)
  window.addEventListener('drop', preventBrowserDrop)
  wireCtaTracking()

  if (import.meta.env.DEV) {
    // Production pages are prerendered into real HTML at build time.
    // In dev the template is empty, so render the landing page on the client.
    void import('./dev/devLanding').then(({ mountDevLanding }) => {
      mountDevLanding()
      mountThemeSwitch()
      wireStaticReader()
      mountRecentShelf((file) => startReader(file, true))
    })
    return
  }

  mountThemeSwitch()
  wireStaticReader()
  mountRecentShelf((file) => startReader(file, true))
}

// The prerendered head already set data-theme before first paint; this keeps
// dev, the SPA fallback and system-theme changes in sync afterwards.
initTheme()
bootstrap()
registerServiceWorker()

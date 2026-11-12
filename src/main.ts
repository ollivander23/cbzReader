import './styles/base.css'
import { mountRecentShelf } from './components/recentShelf'
import { localeFromPath, setSiteLocale } from './i18n'
import { fileExtension, sizeBucket, track } from './lib/track'
import { initTheme } from './lib/theme'
import { mountThemeSwitch } from './lib/themeSwitch'

setSiteLocale(localeFromPath(location.pathname))

const isIOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

// Samples shipped in public/samples for the /demo/ page.
// "Little Nemo in Slumberland" (1908) by Winsor McCay is public domain ({{PD-US}});
// see README 5.9 for the licence and source.
const DEMO_SAMPLE = { url: '/samples/little-nemo-1908.cbz', name: 'Little Nemo.cbz' }
// Memory-test variant behind /demo/?size=large; never linked in the interface.
const DEMO_SAMPLE_LARGE = {
  url: '/samples/sample-large-20-pages.cbz',
  name: 'sample-large-20-pages.cbz',
}

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

/**
 * /demo/ opens a bundled archive without a picker so a device can be checked in
 * one tap. The sample is a normal File to the reader, so progress and the shelf
 * work as usual; the fixed lastModified keeps the fingerprint stable between
 * visits, which is what resume relies on.
 */
function wireDemo(): void {
  const root = document.querySelector<HTMLElement>('[data-demo]')
  const host = document.getElementById('reader-app')
  if (!root || !host) return

  const large = new URLSearchParams(location.search).get('size') === 'large'
  const sample = large ? DEMO_SAMPLE_LARGE : DEMO_SAMPLE
  const status = root.querySelector<HTMLElement>('[data-demo-status]')
  const error = root.querySelector<HTMLElement>('[data-demo-error]')

  void fetch(sample.url)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.blob()
    })
    .then((blob) => {
      const file = new File([blob], sample.name, {
        type: 'application/zip',
        lastModified: 0,
      })
      track('tool_open', { source: 'demo' })
      status?.remove()
      startReader(file)
    })
    .catch(() => {
      if (status) status.hidden = true
      if (error) error.hidden = false
    })
}

function wireStaticConverter(): void {
  const host = document.getElementById('converter-app')
  if (!host) return

  const button = host.querySelector<HTMLButtonElement>('[data-convert-open]')
  const input = host.querySelector<HTMLInputElement>('input[type="file"]')
  if (!button || !input) return

  const start = (file: File): void => {
    // The mounted app replaces this markup and handles drops itself.
    if (host.dataset.mounted === 'true') return
    void import('./convert/mount').then(({ mountConverter }) => mountConverter(host, file))
  }

  button.addEventListener('click', () => input.click())

  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (file) start(file)
  })

  host.addEventListener('dragover', (event) => event.preventDefault())

  host.addEventListener('drop', (event) => {
    event.preventDefault()
    const file = event.dataTransfer?.files?.[0]
    if (file) start(file)
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

// A language the current page has no version in cannot navigate anywhere: that
// used to drop the visitor on the language home page, losing what they were
// reading. The switcher renders those entries as buttons, and this explains in
// place why nothing moved. The line hides itself again after a moment.
function wireLanguageNotice(): void {
  const notice = document.querySelector<HTMLElement>('[data-lang-notice]')
  if (!notice) return
  let hideTimer: number | undefined

  document.addEventListener('click', (event) => {
    const element = event.target instanceof Element ? event.target : null
    const button = element?.closest<HTMLElement>('[data-lang-missing]')
    if (!button) return
    event.preventDefault()
    notice.textContent = button.dataset.langMessage ?? ''
    notice.hidden = false
    window.clearTimeout(hideTimer)
    hideTimer = window.setTimeout(() => {
      notice.hidden = true
    }, 5000)
  })
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
  wireLanguageNotice()

  if (import.meta.env.DEV) {
    // Production pages are prerendered into real HTML at build time.
    // In dev the template is empty, so render the landing page on the client.
    void import('./dev/devLanding').then(({ mountDevLanding }) => {
      mountDevLanding()
      // The header only exists after the client-side landing page mounts.
      wireLanguageNotice()
      mountThemeSwitch()
      wireStaticReader()
      wireStaticConverter()
      wireDemo()
      mountRecentShelf((file) => startReader(file, true))
    })
    return
  }

  mountThemeSwitch()
  wireStaticReader()
  wireStaticConverter()
  wireDemo()
  mountRecentShelf((file) => startReader(file, true))
}

// The prerendered head already set data-theme before first paint; this keeps
// dev, the SPA fallback and system-theme changes in sync afterwards.
initTheme()
bootstrap()
registerServiceWorker()

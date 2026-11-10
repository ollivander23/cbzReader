// Offline acceptance check for the production build.
// Run `npm run build` first, then `npm run test:offline`.
//
// It serves dist/ with a tiny static server (so the test controls the HTML it
// hands out), then verifies:
//   1. the service worker precaches the shell and nothing else,
//   2. an offline reload of the home page renders the full page,
//   3. a local CBZ still opens and turns pages with no connection,
//   4. a changed document is visible on the next online navigation.
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const root = path.resolve(import.meta.dirname, '..')
const distDir = path.join(root, 'dist')
const port = Number(process.env.OFFLINE_PORT || 4189)
const base = `http://localhost:${port}/`

if (!existsSync(path.join(distDir, 'sw.js'))) {
  throw new Error('dist/sw.js is missing. Run `npm run build` before `npm run test:offline`.')
}

const edgeCandidates = [
  process.env.EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)
const executablePath = edgeCandidates.find((candidate) => existsSync(candidate))
if (!executablePath) {
  throw new Error('No Edge or Chrome executable found. Set EDGE_PATH to run the offline check.')
}

const sample =
  process.env.CBZ_SAMPLE || path.join('D:', 'edgeDown', 'testData', 'archive', 'demo-30pages.cbz')
if (!existsSync(sample)) {
  throw new Error(`Sample CBZ not found at ${sample}. Set CBZ_SAMPLE to a .cbz file.`)
}

// A CBR is not a ZIP; the reader should name the container and suggest a fix.
const cbrSample = path.join(root, 'test/.cache/offline-not-a-zip.cbr')
await writeFile(cbrSample, Buffer.from('Rar!\x1a\x07\x00not-really-a-rar', 'binary'))

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
}

// Set by the update check to simulate a freshly deployed document.
let servedHome = null

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', base)
  let pathname = decodeURIComponent(url.pathname)
  if (pathname === '/') pathname = '/index.html'
  else if (pathname.endsWith('/')) pathname = `${pathname}index.html`

  const file = path.join(distDir, pathname.replace(/^\//, ''))
  try {
    const body =
      pathname === '/index.html' && servedHome !== null ? servedHome : await readFile(file)
    response.writeHead(200, {
      'Content-Type': CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    })
    response.end(body)
  } catch {
    try {
      const body = await readFile(path.join(distDir, '404.html'))
      response.writeHead(404, { 'Content-Type': CONTENT_TYPES['.html'] })
      response.end(body)
    } catch {
      response.writeHead(404)
      response.end('Not found')
    }
  }
})

await new Promise((resolve) => server.listen(port, resolve))

const originalHome = await readFile(path.join(distDir, 'index.html'), 'utf8')
let browser

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

try {
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,960'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  await page.setRequestInterception(true)
  page.on('request', (request) => {
    if (request.url().includes('cloud.umami.is')) request.abort()
    else request.continue()
  })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto(base, { waitUntil: 'networkidle2' })
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    if (!registration.active) throw new Error('service worker did not activate')
  })
  await page.reload({ waitUntil: 'networkidle2' })

  const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller))
  assert(controlled, 'page is not controlled by the service worker after reload')

  // 1. Precache must be the shell plus shared assets only.
  const cacheState = await page.evaluate(async () => {
    const keys = await caches.keys()
    const shellKey = keys.find((key) => key.startsWith('cbz-shell-'))
    if (!shellKey) return { keys, urls: [] }
    const cache = await caches.open(shellKey)
    const requests = await cache.keys()
    return { keys, urls: requests.map((request) => new URL(request.url).pathname) }
  })
  assert(cacheState.urls.includes('/'), `shell cache is missing "/": ${cacheState.urls.join(', ')}`)
  assert(
    cacheState.urls.some((url) => url.startsWith('/assets/')),
    'shell cache has no hashed assets',
  )
  const visitedRoute = ['/read-cbz-online/', '/manga-reader/', '/what-is-a-cbz-file/']
  assert(
    !cacheState.urls.some((url) => visitedRoute.includes(url)),
    `content pages must not be precached: ${cacheState.urls.join(', ')}`,
  )

  // 2. CBR/CB7 copy names the container and suggests converting to CBZ.
  const cbrInput = await page.$('#reader-app input[type="file"]')
  assert(cbrInput, 'static file input was not found')
  await cbrInput.uploadFile(cbrSample)
  await page.waitForSelector('#reader-app .error', { timeout: 10_000 })
  const cbrError = await page.$eval('#reader-app .error', (element) => element.textContent ?? '')
  assert(
    cbrError.includes('CBR (RAR) archives are not supported') &&
      cbrError.includes('Convert the file to CBZ'),
    `CBR error copy is not specific enough: ${cbrError}`,
  )

  // 3. Offline reload of the home page.
  await page.goto(base, { waitUntil: 'networkidle2' })
  await page.setOfflineMode(true)
  await page.reload({ waitUntil: 'load', timeout: 20_000 })
  const offlineHome = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent?.trim() ?? '',
    background: getComputedStyle(document.body).backgroundColor,
    title: document.title,
    hasTool: Boolean(document.querySelector('#reader-app [data-open-reader]')),
  }))
  assert(
    offlineHome.h1.includes('Read CBZ comics'),
    `offline home did not render the landing page: ${JSON.stringify(offlineHome)}`,
  )
  assert(offlineHome.background === 'rgb(247, 245, 240)', `offline CSS missing: ${offlineHome.background}`)
  assert(offlineHome.hasTool, 'offline home is missing the reader entry point')

  // 4. Offline reading of a local archive, including a page turn.
  const offlineInput = await page.$('#reader-app input[type="file"]')
  await offlineInput.uploadFile(sample)
  await page.waitForSelector('.page-slot img', { timeout: 20_000 })
  await page.waitForFunction(
    () => {
      const img = document.querySelector('.page-slot img')
      return Boolean(img && img.complete && img.naturalWidth > 0)
    },
    { timeout: 20_000 },
  )
  const firstLabel = await page.$eval('.counter', (element) => element.textContent?.trim() ?? '')
  const navs = await page.$$('.nav')
  await navs[navs.length - 1].click()
  await page.waitForFunction(
    (previous) => {
      const label = document.querySelector('.counter')?.textContent ?? ''
      return label.length > 0 && label !== previous
    },
    { timeout: 10_000 },
    firstLabel,
  )
  const secondLabel = await page.$eval('.counter', (element) => element.textContent?.trim() ?? '')
  assert(secondLabel !== firstLabel, `offline page turn did not advance: ${firstLabel}`)

  // 5. A changed document wins over the cached copy on the next navigation.
  await page.setOfflineMode(false)
  servedHome = originalHome.replace(
    '</body>',
    '<meta name="offline-test" content="fresh" /></body>',
  )
  await page.reload({ waitUntil: 'networkidle2' })
  const fresh = await page.evaluate(() => Boolean(document.querySelector('meta[name="offline-test"]')))
  assert(fresh, 'network-first navigation served a stale cached document')

  if (errors.length > 0) throw new Error(`Page errors: ${errors.join(' | ')}`)

  console.log(
    JSON.stringify(
      {
        version: cacheState.keys,
        precached: cacheState.urls.length,
        offlineHome,
        firstLabel,
        secondLabel,
        cbrError,
      },
      null,
      2,
    ),
  )
  console.log('OFFLINE PASS: shell precache, offline home, offline CBZ, fresh navigation')
} finally {
  await browser?.close()
  await new Promise((resolve) => server.close(resolve))
  await writeFile(path.join(distDir, 'index.html'), originalHome, 'utf8')
}

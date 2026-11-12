// Wait for the live deployment to serve the expected sitemap, then submit every
// URL on the site to IndexNow. Unlike scripts/indexnow.mjs (which runs inside a
// build and deliberately never fails it), this one runs in CI after a deploy and
// must surface timeouts and rejections as a failed workflow step.
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const SITE_URL = (process.env.SITE_URL || 'https://cbzreader.mavi.help').replace(/\/$/, '')
const SITE_ORIGIN = new URL(SITE_URL).origin
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`
const ENDPOINT = process.env.INDEXNOW_ENDPOINT || 'https://api.indexnow.org/indexnow'
const POLL_MS = positiveInt(process.env.INDEXNOW_POLL_MS, 20_000)
const TIMEOUT_MS = positiveInt(process.env.INDEXNOW_TIMEOUT_MS, 10 * 60_000)
// IndexNow accepts at most 10,000 URLs per request.
const MAX_URLS_PER_REQUEST = 10_000

function positiveInt(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// The key file is public by design: IndexNow fetches <site>/<key>.txt to prove
// ownership, so the key itself is not a secret.
async function readKey() {
  const keyFile = process.env.INDEXNOW_KEY_FILE
  if (!keyFile) {
    throw new Error('INDEXNOW_KEY_FILE is not set (expected a path such as public/<key>.txt)')
  }
  const key = (await readFile(keyFile, 'utf8')).trim()
  if (!/^[a-f0-9]{32}$/i.test(key)) {
    throw new Error(`${keyFile} does not contain a 32-character hexadecimal IndexNow key`)
  }
  if (path.basename(keyFile, '.txt') !== key) {
    throw new Error(`${keyFile} filename does not match the key inside it`)
  }
  return key
}

// Expected pages come from the route data in the repository, so a half-finished
// deploy (old sitemap still being served) is detected instead of submitted.
async function readExpectedPaths() {
  const sources = ['src/content/pages.ts']
  const localeDir = path.join('src', 'i18n', 'locales')
  for (const file of await readdir(localeDir)) {
    if (file.endsWith('.ts')) sources.push(path.join(localeDir, file))
  }

  const paths = new Set()
  for (const file of sources) {
    const source = await readFile(file, 'utf8')
    for (const match of source.matchAll(/\bpath:\s*'(\/[^']*)'/g)) {
      paths.add(match[1])
    }
  }

  if (paths.size === 0) {
    throw new Error(`could not derive any routes from ${sources.join(', ')}; refusing to guess`)
  }
  return [...paths].map((route) => `${SITE_URL}${route}`)
}

async function fetchSitemapUrls() {
  const response = await fetch(`${SITEMAP_URL}?indexnow=${Date.now()}`, {
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'User-Agent': 'cbzreader-indexnow/1.0 (+https://cbzreader.mavi.help/)',
    },
    signal: AbortSignal.timeout(20_000),
  })

  const body = await response.text()
  if (!response.ok) {
    throw new Error(`GET ${SITEMAP_URL} returned HTTP ${response.status}: ${body.slice(0, 200).trim()}`)
  }
  if (!body.includes('<urlset')) {
    throw new Error(`GET ${SITEMAP_URL} did not return a sitemap: ${body.slice(0, 200).trim()}`)
  }

  const urls = new Set()
  for (const match of body.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const raw = match[1].trim().replace(/&amp;/g, '&')
    try {
      if (new URL(raw).origin === SITE_ORIGIN) urls.add(raw)
    } catch {
      console.warn(`[indexnow] ignoring malformed URL in sitemap: ${raw}`)
    }
  }
  return [...urls]
}

async function waitForSitemap(expectedUrls) {
  const deadline = Date.now() + TIMEOUT_MS
  const expected = new Set(expectedUrls)
  let lastState = 'no attempt made'

  for (let attempt = 1; ; attempt += 1) {
    try {
      const urls = await fetchSitemapUrls()
      const live = new Set(urls)
      const missing = [...expected].filter((url) => !live.has(url))
      if (missing.length === 0) {
        console.log(
          `[indexnow] sitemap ready on attempt ${attempt}: ${urls.length} URLs, all ${expected.size} expected pages present.`,
        )
        return urls
      }
      lastState = `sitemap has ${urls.length} URLs, missing ${missing.length} (e.g. ${missing
        .slice(0, 3)
        .join(', ')})`
    } catch (error) {
      lastState = error instanceof Error ? error.message : String(error)
    }

    if (Date.now() >= deadline) {
      throw new Error(
        `timed out after ${Math.round(TIMEOUT_MS / 1000)}s waiting for ${SITEMAP_URL}: ${lastState}`,
      )
    }

    console.log(`[indexnow] attempt ${attempt} not ready: ${lastState}. Retrying in ${POLL_MS / 1000}s.`)
    await sleep(Math.min(POLL_MS, Math.max(0, deadline - Date.now())))
  }
}

async function submit(key, urls) {
  let submitted = 0
  for (let start = 0; start < urls.length; start += MAX_URLS_PER_REQUEST) {
    const batch = urls.slice(start, start + MAX_URLS_PER_REQUEST)
    const batchNumber = start / MAX_URLS_PER_REQUEST + 1
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: new URL(SITE_URL).host,
        key,
        keyLocation: `${SITE_URL}/${key}.txt`,
        urlList: batch,
      }),
      signal: AbortSignal.timeout(30_000),
    })
    const body = (await response.text()).trim()

    // 200 = accepted, 202 = key validation still pending; both mean "received".
    if (response.status !== 200 && response.status !== 202) {
      throw new Error(
        `batch ${batchNumber} rejected with HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ''}`,
      )
    }

    submitted += batch.length
    console.log(
      `[indexnow] batch ${batchNumber}: ${batch.length} URLs accepted (HTTP ${response.status})${
        body ? `; response: ${body.slice(0, 200)}` : ''
      }`,
    )
  }
  console.log(`[indexnow] submitted ${submitted} URLs in total (key ${key.slice(0, 4)}…).`)
}

try {
  const [key, expectedUrls] = await Promise.all([readKey(), readExpectedPaths()])
  const urls = await waitForSitemap(expectedUrls)
  await submit(key, urls)
} catch (error) {
  console.error(`[indexnow] failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}

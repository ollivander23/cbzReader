// IndexNow: tell Bing, Yandex, Naver and Seznam that the URLs changed instead of
// waiting for the next crawl. Runs after the prerender step, reads the finished
// sitemap, and is non-fatal on purpose: a third party being unreachable must
// never fail a deploy.
//
// The key is public by design - IndexNow verifies ownership by fetching
// https://<host>/<key>.txt, which is served from public/<key>.txt.
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_KEY = '7f3c9a1e5b2d48c6a90e4d17bc8f2563'
const siteUrl = (process.env.SITE_URL || '').replace(/\/$/, '')
const key = process.env.INDEXNOW_KEY || DEFAULT_KEY

if (!siteUrl) {
  console.log('[indexnow] SITE_URL is not set, skipping (expected for a local build).')
  process.exit(0)
}

try {
  const sitemap = await readFile(path.join(process.cwd(), 'dist', 'sitemap.xml'), 'utf8')
  const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1].trim())
    .filter((url) => url.startsWith(`${siteUrl}/`))

  if (urlList.length === 0) {
    console.log('[indexnow] no URLs found in the sitemap, skipping.')
    process.exit(0)
  }

  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: new URL(siteUrl).host,
      key,
      keyLocation: `${siteUrl}/${key}.txt`,
      urlList,
    }),
  })

  if (response.ok) {
    console.log(`[indexnow] submitted ${urlList.length} URLs (HTTP ${response.status}).`)
  } else {
    console.warn(`[indexnow] submission rejected with HTTP ${response.status}; deploy continues.`)
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.warn(`[indexnow] skipped: ${message}`)
}

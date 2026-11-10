import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const distDir = path.join(root, 'dist')
const ssrDir = path.join(root, 'dist-ssr')

const siteUrl = (process.env.SITE_URL || 'https://your-domain.com').replace(/\/$/, '')
if (!process.env.SITE_URL) {
  console.warn(
    '[prerender] SITE_URL is not set. Canonical URLs will use https://your-domain.com. ' +
      'Set SITE_URL in Cloudflare Pages environment variables before going live.',
  )
}

// Read before the SSR module is imported: entry-server resolves this at module scope.
globalThis.__SITE_URL__ = siteUrl

const ssrFiles = await readdir(ssrDir)
const ssrEntry = ssrFiles.find((file) => /^entry-server.*\.(js|mjs)$/.test(file))
if (!ssrEntry) {
  throw new Error(`[prerender] Cannot find an entry-server bundle in ${ssrDir}`)
}

const { renderPage, routes } = await import(pathToFileURL(path.join(ssrDir, ssrEntry)).href)

let template = await readFile(path.join(distDir, 'index.html'), 'utf8')
if (!template.includes('<!--head-->') || !template.includes('<!--app-html-->')) {
  throw new Error(
    '[prerender] index.html is missing a placeholder. Keep <!--head--> and <!--app-html--> in the template.',
  )
}
// Drop the dev fallback title so the prerendered <title> is the only one.
template = template.replace('<title>CBZ Reader</title>', '')

for (const route of routes) {
  const { html, head } = await renderPage(route.path)
  const output = template.replace('<!--head-->', head).replace('<!--app-html-->', html)
  const target =
    route.path === '/'
      ? path.join(distDir, 'index.html')
      : path.join(distDir, route.path.replace(/^\/|\/$/g, ''), 'index.html')
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, output, 'utf8')
  console.log(`[prerender] ${route.path} -> ${path.relative(root, target)}`)
}

const lastmod = new Date().toISOString().slice(0, 10)
const urlset = routes
  .map((route) => {
    const priority = route.path === '/' ? '1.0' : '0.7'
    return `  <url>\n    <loc>${siteUrl}${route.path}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`
  })
  .join('\n')

await writeFile(
  path.join(distDir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlset}\n</urlset>\n`,
  'utf8',
)

await writeFile(
  path.join(distDir, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
  'utf8',
)

console.log(`[prerender] wrote ${routes.length} pages, sitemap.xml, robots.txt`)

// ---------------------------------------------------------------------------
// Service worker: app shell precache + a cache version derived from the hashed
// asset filenames. Only the shell and shared assets are precached; content
// pages enter the runtime cache the first time someone opens them.
// ---------------------------------------------------------------------------

async function listFiles(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const relative = `${prefix}${entry.name}`
    if (entry.isDirectory()) files.push(...(await listFiles(path.join(dir, entry.name), `${relative}/`)))
    else files.push(relative)
  }
  return files
}

const assetsDir = path.join(distDir, 'assets')
const assetUrls = (await listFiles(assetsDir))
  .map((file) => `/assets/${file.split(path.sep).join('/')}`)
  .sort()

const shellCandidates = [
  '/',
  '/manifest.webmanifest',
  '/manifest-dark.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
]
const shellUrls = []
for (const url of shellCandidates) {
  const file = path.join(distDir, url === '/' ? 'index.html' : url.replace(/^\//, ''))
  try {
    await access(file)
    shellUrls.push(url)
  } catch {
    console.warn(`[prerender] service worker shell is missing ${url}, skipped`)
  }
}

const precache = [...shellUrls, ...assetUrls]
const version = createHash('sha256').update(precache.join('\n')).digest('hex').slice(0, 12)
const swTemplate = await readFile(path.join(root, 'scripts/sw-template.js'), 'utf8')
const sw = swTemplate
  .replace('__CACHE_VERSION__', version)
  .replace('__PRECACHE__', JSON.stringify(precache, null, 2))
await writeFile(path.join(distDir, 'sw.js'), sw, 'utf8')
console.log(`[prerender] wrote sw.js (${version}, ${precache.length} precached files)`)

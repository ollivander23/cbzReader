import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
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

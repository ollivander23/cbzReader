// Renders the PWA icons into public/ from the same mark as favicon.svg.
// Run after changing the mark: node scripts/make-icons.mjs
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const root = path.resolve(import.meta.dirname, '..')
const candidates = [
  process.env.EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)
const executablePath = candidates.find((candidate) => existsSync(candidate))

if (!executablePath) {
  throw new Error('No Edge or Chrome executable found. Set EDGE_PATH to render the icons.')
}

const favicon = await readFile(path.join(root, 'public/favicon.svg'), 'utf8')

// Icons are opaque on purpose: iOS rejects transparent apple-touch-icons and
// Android launchers mask the outer edge anyway. `inset` keeps the mark inside
// the maskable safe zone (the inner 80% circle).
const targets = [
  { file: 'icon-192.png', size: 192, inset: 0.74 },
  { file: 'icon-512.png', size: 512, inset: 0.74 },
  { file: 'icon-maskable-512.png', size: 512, inset: 0.56 },
  { file: 'apple-touch-icon.png', size: 180, inset: 0.72 },
]

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1'],
})

try {
  for (const target of targets) {
    const page = await browser.newPage()
    await page.setViewport({ width: target.size, height: target.size, deviceScaleFactor: 1 })
    await page.setContent(
      `<!doctype html><html><head><style>
        html,body{margin:0;padding:0;background:#e6ecef}
        .icon{width:${target.size}px;height:${target.size}px;display:grid;place-items:center;background:#e6ecef}
        .icon svg{width:${Math.round(target.inset * 100)}%;height:auto;display:block}
      </style></head><body><div class="icon">${favicon}</div></body></html>`,
      { waitUntil: 'load' },
    )
    const box = await page.$('.icon')
    await box.screenshot({ path: path.join(root, 'public', target.file), type: 'png' })
    await page.close()
    console.log(`[icons] public/${target.file} (${target.size}x${target.size})`)
  }
} finally {
  await browser.close()
}

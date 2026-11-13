// Renders the 1200x630 social share card into public/og-image.png.
// Run manually after copy changes: node scripts/og-image.mjs
import { existsSync } from 'node:fs'
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
  throw new Error('No Edge or Chrome executable found. Set EDGE_PATH to render the OG image.')
}

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; margin: 0; }
      body {
        width: 1200px;
        height: 630px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 72px 80px;
        background:
          radial-gradient(circle at 1px 1px, rgba(16, 20, 24, 0.16) 1.4px, transparent 0) 0 0 / 22px 22px,
          #e6ecef;
        box-shadow: inset 0 0 0 8px #101418;
        color: #101418;
        font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      .brand { display: flex; align-items: center; gap: 18px; }
      .mark {
        display: grid;
        place-items: center;
        width: 64px;
        height: 64px;
        border-radius: 0;
        background: #101418;
        color: #e6ecef;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }
      .name { font-size: 30px; font-weight: 700; letter-spacing: -0.01em; }
      h1 {
        max-width: 15ch;
        font-size: 78px;
        line-height: 1.05;
        letter-spacing: -0.03em;
        font-weight: 700;
      }
      .lead {
        margin-top: 22px;
        max-width: 30ch;
        font-size: 30px;
        line-height: 1.35;
        color: #5b6870;
      }
      .chips { display: flex; gap: 14px; }
      .chip {
        padding: 12px 22px;
        border: 1.5px solid #101418;
        border-radius: 0;
        background: #f4f7f8;
        font-size: 22px;
        color: #101418;
      }
      .chip--accent {
        border-color: #b8362a;
        background: transparent;
        color: #b8362a;
        font-weight: 700;
        transform: rotate(-2deg);
      }
    </style>
  </head>
  <body>
    <div class="brand">
      <div class="mark">CB</div>
      <div class="name">CBZ Reader</div>
    </div>
    <div>
      <h1>Read CBZ comics in your browser</h1>
      <p class="lead">Files stay on your device. No uploads, no account.</p>
    </div>
    <div class="chips">
      <span class="chip chip--accent">No upload</span>
      <span class="chip">Right-to-left manga</span>
      <span class="chip">Remembers your page</span>
    </div>
  </body>
</html>`

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1'],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
  await page.setContent(html, { waitUntil: 'load' })
  await page.screenshot({ path: path.join(root, 'public/og-image.png'), type: 'png' })
  console.log('[og-image] public/og-image.png (1200x630)')
} finally {
  await browser.close()
}

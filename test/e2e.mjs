import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const root = path.resolve(import.meta.dirname, '..')
const port = Number(process.env.E2E_PORT || 5199)
const base = `http://localhost:${port}/`

const edgeCandidates = [
  process.env.EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)
const executablePath = edgeCandidates.find((candidate) => existsSync(candidate))

if (!executablePath) {
  throw new Error('No Edge or Chrome executable found. Set EDGE_PATH to run the E2E check.')
}

const sample = process.env.CBZ_SAMPLE || path.join(root, 'test/.cache/local-test.cbz')
if (!existsSync(sample)) {
  throw new Error(`Sample CBZ not found at ${sample}. Set CBZ_SAMPLE to a .cbz file.`)
}

const server = spawn('npm', ['run', 'dev', '--', '--port', String(port), '--strictPort'], {
  cwd: root,
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})

let serverOutput = ''
server.stdout.on('data', (chunk) => {
  serverOutput += chunk.toString()
})
server.stderr.on('data', (chunk) => {
  serverOutput += chunk.toString()
})

async function waitForServer() {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(base)
      if (response.ok) return
    } catch {
      // server not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  throw new Error(`Dev server did not start in time:\n${serverOutput}`)
}

let browser

try {
  await waitForServer()
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,960'],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto(base, { waitUntil: 'networkidle2' })
  await page.waitForSelector('#reader-app [data-open-reader]')

  const input = await page.$('#reader-app input[type="file"]')
  if (!input) throw new Error('Static file input was not found')
  await input.uploadFile(sample)

  await page.waitForSelector('.page-slot img', { timeout: 20_000 })
  await page.waitForFunction(
    () => {
      const img = document.querySelector('.page-slot img')
      return Boolean(img && img.complete && img.naturalWidth > 0)
    },
    { timeout: 20_000 },
  )

  const first = await page.$eval('.counter', (el) => el.textContent?.trim())
  const naturalSize = await page.$eval('.page-slot img', (img) => ({
    width: img.naturalWidth,
    height: img.naturalHeight,
  }))

  const buttons = await page.$$('.nav')
  await buttons[buttons.length - 1].click()
  await page.waitForFunction(
    (previous) => {
      const label = document.querySelector('.counter')?.textContent ?? ''
      return label.length > 0 && label !== previous
    },
    { timeout: 10_000 },
    first,
  )
  const second = await page.$eval('.counter', (el) => el.textContent?.trim())

  await page.screenshot({ path: path.join(root, 'test/.cache/e2e-reader.png') })

  if (errors.length > 0) throw new Error(`Page errors: ${errors.join(' | ')}`)

  console.log(
    JSON.stringify(
      { first, second, naturalSize, screenshot: 'test/.cache/e2e-reader.png' },
      null,
      2,
    ),
  )
  console.log('E2E PASS: file opened, image decoded, page turned')
} finally {
  await browser?.close()
  if (server.pid) {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
    } else {
      server.kill()
    }
  }
}

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

const sample = process.env.CBZ_SAMPLE || path.join(root, 'test/.cache/scroll-test.cbz')
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
  const readerLogs = []
  page.on('console', (message) => {
    const text = message.text()
    if (text.startsWith('[reader]')) readerLogs.push(text)
  })

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

  const total = Number((second ?? '').match(/\/\s*(\d+)/)?.[1] ?? 0)
  if (!total) throw new Error(`Could not parse page count from "${second}"`)

  // Switch to the scrolling mode (Single -> Double -> Scroll).
  const modeButton = await page.$('.toolbar .tool')
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const label = await modeButton.evaluate((el) => el.textContent?.trim())
    if (label === 'Scroll') break
    await modeButton.click()
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  await page.waitForSelector('.scroll-page', { timeout: 10_000 })

  const scrollStartWindow = await page.$$eval('.scroll-page', (nodes) => nodes.length)
  if (scrollStartWindow > 12) {
    throw new Error(`Scroll mode mounted ${scrollStartWindow} pages, expected at most 12`)
  }

  // Scroll far enough to force the virtual window to slide.
  for (let step = 0; step < 12; step += 1) {
    await page.$eval('.stage', (el) => {
      el.scrollTop = el.scrollHeight
    })
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  const scrollLabel = await page.$eval('.counter', (el) => el.textContent?.trim())
  const scrollPage = Number((scrollLabel ?? '').match(/Page\s+(\d+)/)?.[1] ?? 0)
  const scrollWindow = await page.$$eval('.scroll-page', (nodes) => nodes.length)
  const firstRendered = await page.$eval('.scroll-page', (el) => Number(el.dataset.page))

  if (scrollPage <= 12) throw new Error(`Scroll position did not advance: ${scrollLabel}`)
  if (scrollWindow > 12) throw new Error(`Window size grew to ${scrollWindow}`)
  if (firstRendered === 0) throw new Error('Virtual window did not slide forward')

  await page.screenshot({ path: path.join(root, 'test/.cache/e2e-scroll.png') })

  // Switch back to single page and keep the same reading position.
  await modeButton.click()
  await new Promise((resolve) => setTimeout(resolve, 1200))
  const modeAfter = await modeButton.evaluate((el) => el.textContent?.trim())
  if (!(await page.$('.page-slot'))) {
    const state = await page.evaluate(() => ({
      mode: document.querySelector('.toolbar .tool')?.textContent?.trim(),
      counter: document.querySelector('.counter')?.textContent?.trim(),
      slots: document.querySelectorAll('.page-slot').length,
      scrollPages: document.querySelectorAll('.scroll-page').length,
      stageScrollTop: document.querySelector('.stage')?.scrollTop,
    }))
    throw new Error(
      `Single-page layer missing after mode switch: ${JSON.stringify({ state, modeAfter, errors })}`,
    )
  }
  try {
    await page.waitForSelector('.page-slot img', { timeout: 10_000 })
  } catch {
    const state = await page.evaluate(() => ({
      counter: document.querySelector('.counter')?.textContent?.trim(),
      slot: document.querySelector('.page-slot')?.outerHTML.slice(0, 600),
      mode: document.querySelector('.toolbar .tool')?.textContent?.trim(),
    }))
    throw new Error(`Page image missing after mode switch: ${JSON.stringify({ state, errors, readerLogs })}`)
  }
  const backLabel = await page.$eval('.counter', (el) => el.textContent?.trim())
  const backPage = Number((backLabel ?? '').match(/Page\s+(\d+)/)?.[1] ?? 0)
  if (backPage !== scrollPage) {
    throw new Error(`Mode switch lost position: scroll ${scrollPage}, single ${backPage}`)
  }

  await page.screenshot({ path: path.join(root, 'test/.cache/e2e-reader.png') })

  if (errors.length > 0) throw new Error(`Page errors: ${errors.join(' | ')}`)

  console.log(
    JSON.stringify(
      {
        first,
        second,
        total,
        scrollLabel,
        scrollWindow,
        firstRendered,
        backLabel,
        naturalSize,
        screenshots: ['test/.cache/e2e-reader.png', 'test/.cache/e2e-scroll.png'],
      },
      null,
      2,
    ),
  )
  console.log('E2E PASS: paged turn, virtual scroll, position preserved')
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

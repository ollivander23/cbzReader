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
  // Keep local test runs out of production analytics and prove the wrapper
  // stays silent when window.umami never appears.
  await page.setRequestInterception(true)
  page.on('request', (request) => {
    if (request.url().includes('cloud.umami.is')) request.abort()
    else request.continue()
  })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const readerLogs = []
  page.on('console', (message) => {
    const text = message.text()
    if (text.startsWith('[reader]')) readerLogs.push(text)
  })

  await page.goto(base, { waitUntil: 'networkidle2' })
  await page.waitForSelector('#reader-app [data-open-reader]')

  // Site header theme switch: open, Esc closes and returns focus, Light persists.
  await page.click('.theme-switch__trigger')
  await page.waitForSelector('.theme-switch__menu')
  await page.keyboard.press('Escape')
  const headerClosed = await page.evaluate(() => ({
    expanded: document.querySelector('.theme-switch__trigger').getAttribute('aria-expanded'),
    focused: String(document.activeElement?.className ?? ''),
  }))
  if (headerClosed.expanded !== 'false' || !headerClosed.focused.includes('theme-switch__trigger')) {
    throw new Error(`Header theme menu did not close cleanly: ${JSON.stringify(headerClosed)}`)
  }

  await page.click('.theme-switch__trigger')
  await page.waitForSelector('.theme-switch__menu')
  await page.evaluate(() => {
    const item = Array.from(document.querySelectorAll('.theme-switch__menu .theme-switch__item')).find(
      (node) => node.textContent?.trim().startsWith('Light'),
    )
    if (!item) throw new Error('Light item missing from the header switch')
    item.click()
  })
  const headerLight = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    stored: localStorage.getItem('cbz-theme'),
    expanded: document.querySelector('.theme-switch__trigger').getAttribute('aria-expanded'),
  }))
  if (headerLight.theme !== 'light' || headerLight.stored !== 'light' || headerLight.expanded !== 'false') {
    throw new Error(`Header theme switch did not apply Light: ${JSON.stringify(headerLight)}`)
  }

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
    const label = await modeButton.evaluate((el) => el.getAttribute('aria-label') ?? '')
    if (label.includes(': Scroll.')) break
    await modeButton.click()
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  await page.waitForSelector('.scroll-page', { timeout: 10_000 })

  const scrollStartWindow = await page.$$eval('.scroll-page', (nodes) => nodes.length)
  if (scrollStartWindow > 12) {
    throw new Error(`Scroll mode mounted ${scrollStartWindow} pages, expected at most 12`)
  }

  // Ctrl/Cmd + wheel (trackpad pinch) zooms the scrolling column around the pointer.
  const baseWidth = await page.$eval('.scroll-page', (el) => el.offsetWidth)
  const readCenterAnchor = () =>
    page.evaluate(() => {
      const stage = document.querySelector('.stage')
      const rect = stage.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2
      for (const block of stage.querySelectorAll('.scroll-page')) {
        const box = block.getBoundingClientRect()
        if (box.bottom > y) {
          return { page: Number(block.dataset.page), relY: (y - box.top) / box.height }
        }
      }
      return null
    })
  const anchorBefore = await readCenterAnchor()
  await page.evaluate(() => {
    const stage = document.querySelector('.stage')
    const rect = stage.getBoundingClientRect()
    for (let step = 0; step < 8; step += 1) {
      stage.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: -120,
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        }),
      )
    }
  })
  await new Promise((resolve) => setTimeout(resolve, 600))

  const zoomed = await page.evaluate(() => {
    const stage = document.querySelector('.stage')
    const block = document.querySelector('.scroll-page')
    return {
      pages: document.querySelectorAll('.scroll-page').length,
      width: block?.offsetWidth ?? 0,
      scrollWidth: stage?.scrollWidth ?? 0,
      clientWidth: stage?.clientWidth ?? 0,
      label: document.querySelector('.tool--zoom')?.textContent?.trim(),
    }
  })

  if (zoomed.width < baseWidth * 1.8) {
    throw new Error(`Scroll zoom did not grow pages: ${baseWidth} -> ${zoomed.width} ${JSON.stringify(zoomed)}`)
  }
  if (zoomed.scrollWidth <= zoomed.clientWidth) {
    throw new Error('Zoomed column is not horizontally scrollable')
  }
  if (zoomed.pages > 12) {
    throw new Error(`Zoom mounted ${zoomed.pages} pages, expected at most 12`)
  }

  // The page pixel under the pinch centre must stay under it.
  const anchorAfter = await readCenterAnchor()
  if (!anchorBefore || !anchorAfter || anchorAfter.page !== anchorBefore.page) {
    throw new Error(`Zoom moved the anchor page: ${JSON.stringify({ anchorBefore, anchorAfter })}`)
  }
  if (Math.abs(anchorAfter.relY - anchorBefore.relY) > 0.03) {
    throw new Error(
      `Zoom shifted the anchor within the page: ${anchorBefore.relY.toFixed(3)} -> ${anchorAfter.relY.toFixed(3)}`,
    )
  }

  await page.screenshot({ path: path.join(root, 'test/.cache/e2e-scroll-zoom.png') })

  // Scroll far enough to force the virtual window to slide while zoomed.
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

  // The toolbar readout resets the scroll column to fit width.
  await page.click('.tool--zoom')
  await new Promise((resolve) => setTimeout(resolve, 600))
  const resetState = await page.evaluate(() => {
    const stage = document.querySelector('.stage')
    const block = document.querySelector('.scroll-page')
    return {
      label: document.querySelector('.tool--zoom')?.textContent?.trim(),
      width: block?.offsetWidth ?? 0,
      overflow: stage ? stage.scrollWidth - stage.clientWidth : 0,
    }
  })
  if (resetState.label !== '100%') {
    throw new Error(`Zoom reset did not report 100%: ${resetState.label}`)
  }
  if (Math.abs(resetState.width - baseWidth) > 2) {
    throw new Error(`Fit width not restored: ${baseWidth} -> ${resetState.width}`)
  }
  if (resetState.overflow > 2) {
    throw new Error(`Horizontal overflow after reset: ${resetState.overflow}px`)
  }
  const resetLabel = await page.$eval('.counter', (el) => el.textContent?.trim())
  const resetPage = Number((resetLabel ?? '').match(/Page\s+(\d+)/)?.[1] ?? 0)

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
  if (backPage !== resetPage) {
    throw new Error(`Mode switch lost position: scroll ${resetPage}, single ${backPage}`)
  }

  await page.screenshot({ path: path.join(root, 'test/.cache/e2e-reader.png') })

  // Theme: the ⋮ menu applies and stores the choice, and Auto follows the system.
  await page.click('[aria-label="More reading options"]')
  await page.waitForSelector('.menu__panel')
  const readerChecked = await page.evaluate(() => {
    const item = Array.from(document.querySelectorAll('.menu__panel .menu__item')).find((node) =>
      node.textContent?.trim().startsWith('Light'),
    )
    return item?.getAttribute('aria-checked')
  })
  if (readerChecked !== 'true') {
    throw new Error(`Reader theme menu is out of sync with the header switch: ${readerChecked}`)
  }
  await page.evaluate(() => {
    const item = Array.from(document.querySelectorAll('.menu__panel .menu__item')).find((node) =>
      node.textContent?.trim().startsWith('Dark'),
    )
    if (!item) throw new Error('Dark theme item missing from the options menu')
    item.click()
  })
  await new Promise((resolve) => setTimeout(resolve, 150))
  const darkState = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    stored: localStorage.getItem('cbz-theme'),
    menuOpen: Boolean(document.querySelector('.menu__panel')),
  }))
  if (darkState.theme !== 'dark' || darkState.stored !== 'dark' || darkState.menuOpen) {
    throw new Error(`Dark theme did not apply: ${JSON.stringify(darkState)}`)
  }

  // The header switch must reflect a change made from the reader menu.
  await page.click('.theme-switch__trigger')
  const headerChecked = await page.evaluate(() => {
    const item = Array.from(document.querySelectorAll('.theme-switch__menu .theme-switch__item')).find(
      (node) => node.textContent?.trim().startsWith('Dark'),
    )
    return item?.getAttribute('aria-checked')
  })
  await page.keyboard.press('Escape')
  if (headerChecked !== 'true') {
    throw new Error(`Header switch did not follow the reader menu: ${headerChecked}`)
  }

  await page.reload({ waitUntil: 'networkidle2' })
  const reloadedTheme = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    colorScheme: document.documentElement.style.colorScheme,
  }))
  if (reloadedTheme.theme !== 'dark' || reloadedTheme.colorScheme !== 'dark') {
    throw new Error(`Theme did not survive reload: ${JSON.stringify(reloadedTheme)}`)
  }

  await page.evaluate(() => localStorage.setItem('cbz-theme', 'auto'))
  await page.reload({ waitUntil: 'networkidle2' })
  const autoLight = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  if (autoLight !== 'light') throw new Error(`Auto did not resolve to light: ${autoLight}`)

  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])
  await new Promise((resolve) => setTimeout(resolve, 150))
  const autoDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  if (autoDark !== 'dark') throw new Error(`Auto did not follow the system: ${autoDark}`)

  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }])

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
        zoomed,
        anchorBefore,
        anchorAfter,
        resetState,
        resetLabel,
        backLabel,
        naturalSize,
        screenshots: [
          'test/.cache/e2e-reader.png',
          'test/.cache/e2e-scroll.png',
          'test/.cache/e2e-scroll-zoom.png',
        ],
      },
      null,
      2,
    ),
  )
  console.log('E2E PASS: paged turn, virtual scroll, position preserved, theme persists')
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

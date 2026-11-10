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

// Scrolling hides the floating chrome, so tests that need a toolbar button
// first tap the middle of the page to bring it back.
async function showToolbar(page) {
  const hidden = await page.evaluate(() =>
    Boolean(document.querySelector('.toolbar')?.classList.contains('toolbar--hidden')),
  )
  if (!hidden) return
  const viewport = page.viewport()
  await page.mouse.click(viewport.width / 2, viewport.height / 2)
  await page.waitForFunction(() => !document.querySelector('.toolbar--hidden'), { timeout: 3_000 })
}

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

  // The service worker must never register outside a production build.
  const registrations = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 0
    return (await navigator.serviceWorker.getRegistrations()).length
  })
  if (registrations !== 0) {
    throw new Error(`Dev build registered ${registrations} service worker(s)`)
  }

  // Site header theme button: two states, one click flips, no menu.
  const headerInitial = await page.evaluate(() => {
    const trigger = document.querySelector('.theme-switch__trigger')
    return {
      theme: document.documentElement.getAttribute('data-theme'),
      pressed: trigger?.getAttribute('aria-pressed'),
      label: trigger?.getAttribute('aria-label'),
      hasMenu: Boolean(document.querySelector('.theme-switch__menu')),
    }
  })
  if (
    headerInitial.theme !== 'light' ||
    headerInitial.pressed !== 'false' ||
    headerInitial.label !== 'Switch to dark theme' ||
    headerInitial.hasMenu
  ) {
    throw new Error(`Header theme button is not in its default light state: ${JSON.stringify(headerInitial)}`)
  }

  await page.click('.theme-switch__trigger')
  const headerDark = await page.evaluate(() => {
    const trigger = document.querySelector('.theme-switch__trigger')
    const icon = (selector) => getComputedStyle(document.querySelector(selector)).display
    return {
      theme: document.documentElement.getAttribute('data-theme'),
      stored: localStorage.getItem('cbz-theme'),
      pressed: trigger?.getAttribute('aria-pressed'),
      label: trigger?.getAttribute('aria-label'),
      sun: icon('.theme-switch__icon--sun'),
      moon: icon('.theme-switch__icon--moon'),
    }
  })
  if (
    headerDark.theme !== 'dark' ||
    headerDark.stored !== 'dark' ||
    headerDark.pressed !== 'true' ||
    headerDark.label !== 'Switch to light theme' ||
    headerDark.sun !== 'none' ||
    headerDark.moon === 'none'
  ) {
    throw new Error(`Header theme button did not switch to dark: ${JSON.stringify(headerDark)}`)
  }

  await page.click('.theme-switch__trigger')
  const headerBackToLight = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    stored: localStorage.getItem('cbz-theme'),
    pressed: document.querySelector('.theme-switch__trigger')?.getAttribute('aria-pressed'),
    label: document.querySelector('.theme-switch__trigger')?.getAttribute('aria-label'),
  }))
  if (
    headerBackToLight.theme !== 'light' ||
    headerBackToLight.stored !== 'light' ||
    headerBackToLight.pressed !== 'false' ||
    headerBackToLight.label !== 'Switch to dark theme'
  ) {
    throw new Error(`Header theme button did not switch back: ${JSON.stringify(headerBackToLight)}`)
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

  // Opening a file turns the reader into a viewport-sized layer that covers
  // the page header and footer instead of sitting inside the document flow.
  const overlay = await page.evaluate(() => {
    const reader = document.querySelector('.reader--open')
    if (!reader) return null
    const rect = reader.getBoundingClientRect()
    const points = [
      [4, 4],
      [window.innerWidth - 4, 4],
      [4, window.innerHeight - 4],
      [window.innerWidth / 2, window.innerHeight - 4],
    ]
    // The site header and footer still exist in the DOM; the reader layer must
    // sit on top of them so nothing outside the viewer can be seen or clicked.
    const covers = (selector) => {
      const el = document.querySelector(selector)
      if (!el) return false
      const box = el.getBoundingClientRect()
      const x = box.left + box.width / 2
      const y = Math.min(Math.max(box.top + box.height / 2, 1), window.innerHeight - 2)
      return Boolean(document.elementFromPoint(x, y)?.closest('.reader--open'))
    }
    return {
      position: getComputedStyle(reader).position,
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      covered: points.map(([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest('.reader--open'))),
      header: covers('.site-header'),
      footer: covers('.site-footer'),
    }
  })
  if (
    !overlay ||
    overlay.position !== 'fixed' ||
    overlay.top !== 0 ||
    overlay.left !== 0 ||
    Math.abs(overlay.width - overlay.innerWidth) > 1 ||
    Math.abs(overlay.height - overlay.innerHeight) > 1 ||
    !overlay.header ||
    !overlay.footer ||
    overlay.covered.some((covered) => !covered)
  ) {
    throw new Error(`Reader does not own the viewport: ${JSON.stringify(overlay)}`)
  }

  // A tap on the page area hides the floating chrome, another brings it back.
  const viewport = page.viewport()
  await page.mouse.click(viewport.width / 2, viewport.height / 2)
  await page.waitForSelector('.toolbar--hidden', { timeout: 3_000 })
  const hiddenBars = await page.evaluate(() => ({
    toolbar: document.querySelector('.toolbar')?.classList.contains('toolbar--hidden'),
    bottombar: document.querySelector('.bottombar')?.classList.contains('bottombar--hidden'),
  }))
  if (!hiddenBars.toolbar || !hiddenBars.bottombar) {
    throw new Error(`Toolbar tap did not hide both bars: ${JSON.stringify(hiddenBars)}`)
  }
  await page.mouse.click(viewport.width / 2, viewport.height / 2)
  await page.waitForFunction(() => !document.querySelector('.toolbar--hidden'), { timeout: 3_000 })

  // F only hides the browser's own interface, and fullscreen must be available.
  const fullscreen = { available: await page.evaluate(() => document.fullscreenEnabled), entered: false }
  if (fullscreen.available) {
    await page.keyboard.press('f')
    await page.waitForFunction(() => Boolean(document.fullscreenElement), { timeout: 3_000 })
    fullscreen.entered = true
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.fullscreenElement, { timeout: 3_000 })
  }

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
  await showToolbar(page)
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
  await showToolbar(page)
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

  // Theme: the ⋮ menu has a single Dark mode toggle that shares the header state.
  await showToolbar(page)
  await page.click('[aria-label="More reading options"]')
  await page.waitForSelector('.menu__panel')
  const readerChecked = await page.evaluate(() => {
    const item = Array.from(document.querySelectorAll('.menu__panel .menu__item')).find((node) =>
      node.textContent?.trim().startsWith('Dark mode'),
    )
    return item?.getAttribute('aria-checked')
  })
  if (readerChecked !== 'false') {
    throw new Error(`Reader Dark mode toggle is out of sync with the light header: ${readerChecked}`)
  }
  await page.evaluate(() => {
    const item = Array.from(document.querySelectorAll('.menu__panel .menu__item')).find((node) =>
      node.textContent?.trim().startsWith('Dark mode'),
    )
    if (!item) throw new Error('Dark mode item missing from the options menu')
    item.click()
  })
  await new Promise((resolve) => setTimeout(resolve, 150))
  const darkState = await page.evaluate(() => {
    const trigger = document.querySelector('.theme-switch__trigger')
    return {
      theme: document.documentElement.getAttribute('data-theme'),
      stored: localStorage.getItem('cbz-theme'),
      menuOpen: Boolean(document.querySelector('.menu__panel')),
      pressed: trigger?.getAttribute('aria-pressed'),
      label: trigger?.getAttribute('aria-label'),
    }
  })
  if (
    darkState.theme !== 'dark' ||
    darkState.stored !== 'dark' ||
    darkState.menuOpen ||
    darkState.pressed !== 'true' ||
    darkState.label !== 'Switch to light theme'
  ) {
    throw new Error(`Dark mode did not apply or did not reach the header: ${JSON.stringify(darkState)}`)
  }

  // The reader toggle must read the shared state after the header changed it.
  // The site header is deliberately covered by the reader layer, so the header
  // button is driven through its own click handler instead of the pointer.
  const clickHeaderTheme = () =>
    page.evaluate(() => document.querySelector('.theme-switch__trigger')?.click())
  await clickHeaderTheme()
  await page.click('[aria-label="More reading options"]')
  await page.waitForSelector('.menu__panel')
  const readerAfterHeader = await page.evaluate(() => {
    const item = Array.from(document.querySelectorAll('.menu__panel .menu__item')).find((node) =>
      node.textContent?.trim().startsWith('Dark mode'),
    )
    return { checked: item?.getAttribute('aria-checked'), state: item?.textContent?.includes('Off') }
  })
  await page.keyboard.press('Escape')
  if (readerAfterHeader.checked !== 'false' || readerAfterHeader.state !== true) {
    throw new Error(`Reader toggle did not follow the header: ${JSON.stringify(readerAfterHeader)}`)
  }

  await clickHeaderTheme()

  await page.reload({ waitUntil: 'networkidle2' })
  const reloadedTheme = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    colorScheme: document.documentElement.style.colorScheme,
    readerOpen: Boolean(document.querySelector('.reader--open')),
  }))
  if (
    reloadedTheme.theme !== 'dark' ||
    reloadedTheme.colorScheme !== 'dark' ||
    reloadedTheme.readerOpen
  ) {
    throw new Error(`Theme did not survive reload: ${JSON.stringify(reloadedTheme)}`)
  }

  await page.evaluate(() => localStorage.setItem('cbz-theme', 'auto'))
  await page.reload({ waitUntil: 'networkidle2' })
  const autoLight = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  if (autoLight !== 'light') throw new Error(`Auto did not resolve to light: ${autoLight}`)

  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])
  await new Promise((resolve) => setTimeout(resolve, 150))
  const autoDark = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    stored: localStorage.getItem('cbz-theme'),
    label: document.querySelector('.theme-switch__trigger')?.getAttribute('aria-label'),
  }))
  if (
    autoDark.theme !== 'dark' ||
    autoDark.stored !== 'auto' ||
    autoDark.label !== 'Switch to light theme'
  ) {
    throw new Error(`Auto did not follow the system or lost its stored value: ${JSON.stringify(autoDark)}`)
  }

  // First click while the stored value is still 'auto' flips the appearance
  // that is on screen, then stores an explicit value.
  await page.click('.theme-switch__trigger')
  const fromAuto = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    stored: localStorage.getItem('cbz-theme'),
  }))
  if (fromAuto.theme !== 'light' || fromAuto.stored !== 'light') {
    throw new Error(`Click from auto did not switch against the system: ${JSON.stringify(fromAuto)}`)
  }

  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }])

  // Closing the reader must return to the landing page at the offset the file
  // was opened from, with the site chrome clickable again.
  const roomToScroll = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  )
  if (roomToScroll < 500) {
    throw new Error(`Landing page is too short for the scroll hand-off check: ${roomToScroll}`)
  }
  await page.evaluate(() => window.scrollTo(0, 480))
  await new Promise((resolve) => setTimeout(resolve, 100))
  const scrollBeforeOpen = await page.evaluate(() => window.scrollY)

  const reopen = await page.$('#reader-app input[type="file"]')
  await reopen.uploadFile(sample)
  await page.waitForSelector('.reader--open', { timeout: 20_000 })
  await page.waitForSelector('.page-slot img', { timeout: 20_000 })

  await page.click('[data-reader-close]')
  await page.waitForFunction(() => !document.querySelector('.reader--open'), { timeout: 5_000 })
  await page.waitForFunction(
    (target) => Math.abs(window.scrollY - target) <= 2,
    { timeout: 3_000 },
    scrollBeforeOpen,
  )
  const afterClose = await page.evaluate(() => {
    const header = document.querySelector('.site-header')
    const box = header?.getBoundingClientRect()
    const hit = box ? document.elementFromPoint(box.width / 2, Math.max(box.top + box.height / 2, 1)) : null
    return {
      scrollY: window.scrollY,
      headerClickable: Boolean(hit && !hit.closest('.reader--open')),
      path: location.pathname,
    }
  })
  if (Math.abs(afterClose.scrollY - scrollBeforeOpen) > 2) {
    throw new Error(`Close did not restore the scroll offset: ${scrollBeforeOpen} -> ${afterClose.scrollY}`)
  }
  if (!afterClose.headerClickable) throw new Error('Site header is still covered after close')
  if (afterClose.path !== '/') throw new Error(`Close navigated away from the landing page: ${afterClose.path}`)

  // The Android back gesture fires popstate: it must close the reader instead
  // of leaving the site.
  await page.evaluate(() => window.scrollTo(0, 300))
  await new Promise((resolve) => setTimeout(resolve, 100))
  const reopenForBack = await page.$('#reader-app input[type="file"]')
  await reopenForBack.uploadFile(sample)
  await page.waitForSelector('.reader--open', { timeout: 20_000 })
  await page.evaluate(() => window.history.back())
  await page.waitForFunction(() => !document.querySelector('.reader--open'), { timeout: 5_000 })
  await page.waitForFunction(() => Math.abs(window.scrollY - 300) <= 2, { timeout: 3_000 })
  const afterPop = await page.evaluate(() => ({ path: location.pathname, scrollY: window.scrollY }))
  if (afterPop.path !== '/') throw new Error(`Back left the site: ${afterPop.path}`)
  if (Math.abs(afterPop.scrollY - 300) > 2) {
    throw new Error(`Back did not restore the scroll offset: ${afterPop.scrollY}`)
  }

  // Without the Fullscreen API the menu must not advertise "browser interface"
  // and F must not try to hide anything.
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(document, 'fullscreenEnabled', { get: () => false, configurable: true })
  })
  await page.reload({ waitUntil: 'networkidle2' })
  await page.waitForSelector('#reader-app [data-open-reader]')
  const noFullscreenInput = await page.$('#reader-app input[type="file"]')
  await noFullscreenInput.uploadFile(sample)
  await page.waitForSelector('.page-slot img', { timeout: 20_000 })
  await page.click('[aria-label="More reading options"]')
  await page.waitForSelector('.menu__panel')
  const noFullscreenMenu = await page.$$eval('.menu__panel .menu__item', (items) =>
    items.map((item) => item.textContent?.trim() ?? ''),
  )
  if (noFullscreenMenu.some((text) => /browser interface/i.test(text))) {
    throw new Error(`Menu offers fullscreen without the API: ${JSON.stringify(noFullscreenMenu)}`)
  }
  await page.keyboard.press('Escape')
  await page.keyboard.press('f')
  await new Promise((resolve) => setTimeout(resolve, 300))
  if (await page.evaluate(() => Boolean(document.fullscreenElement))) {
    throw new Error('F entered fullscreen although document.fullscreenEnabled is false')
  }

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
        fullscreen,
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
  console.log('E2E PASS: immersive layer, floating chrome, back to landing, theme persists')
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

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { fingerprint } from './core/fingerprint'
import { loadPageAsset } from './core/imageLoader'
import { readProgress, writeProgress, type ReadingMode } from './core/progress'
import {
  readBookmarks,
  rememberArchive,
  renderCover,
  setCover,
  touchEntry,
  writeBookmarks,
  type Bookmark,
} from './core/library'
import { ReaderError, type PageAsset } from './core/types'
import { ZipPageSource } from './core/zipSource'
import { fileExtension, sizeBucket, track } from '../lib/track'
import {
  readThemeSetting,
  resolvedTheme,
  setTheme,
  themeSetting,
  toggleTheme,
} from '../lib/theme'

const props = defineProps<{ initialFile?: File | null }>()

const MAX_TOTAL_PIXELS = 32_000_000
const CONCURRENCY = 2
const MIN_SCALE = 1
const MAX_SCALE = 5
// The toolbar floats over the page, so a page only needs a hair of breathing
// room at the edges; the stage owns the whole viewport.
const STAGE_PAD_TOP = 8
const STAGE_PAD_X = 8
const SCROLL_WINDOW = 12
const MAX_SCROLL_SCALE = 4
const SCROLL_DECODE_WIDTH = 3200
const IOS_HINT_KEY = 'cbz-ios-fullscreen-hint'

interface ScrollAnchor {
  page: number
  relX: number
  relY: number
}

interface ScrollZoomRequest {
  scale: number
  x: number
  y: number
  anchor?: ScrollAnchor | null
}

interface ScrollPinch {
  distance: number
  scale: number
  anchor: ScrollAnchor | null
}

const isIOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

const accept = isIOS
  ? '*/*'
  : '.cbz,.zip,application/vnd.comicbook+zip,application/zip,application/x-cbz'

const source = ref<ZipPageSource | null>(null)
const fileName = ref('')
const title = ref('')
const pageCount = ref(0)
const index = ref(0)
const mode = ref<ReadingMode>('single')
const rtl = ref(false)
const ready = ref(false)
const busy = ref(false)
const error = ref('')
const dragging = ref(false)
const toolbarVisible = ref(true)
const menuOpen = ref(false)
const nameBudget = ref(24)
const fullscreenActive = ref(false)
const showResume = ref(false)
const resumePage = ref(0)
const hasFullscreen = ref(false)
const iosHintVisible = ref(false)
const fileFingerprint = ref('')
const bookmarks = ref<Bookmark[]>([])

const assets = reactive(new Map<number, PageAsset>())
const pageErrors = reactive(new Map<number, string>())

const scrollWindowStart = ref(0)
const scrollScale = ref(1)

const fileInput = ref<HTMLInputElement | null>(null)
const viewerEl = ref<HTMLElement | null>(null)
const stageEl = ref<HTMLElement | null>(null)
const pagesEl = ref<HTMLElement | null>(null)
const metaEl = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const menuButtonEl = ref<HTMLButtonElement | null>(null)
const menuPanelEl = ref<HTMLElement | null>(null)

const stageW = ref(0)
const stageH = ref(0)
const contentW = ref(0)
const contentH = ref(0)
const contentLeft = ref(0)
const contentTop = ref(0)

const scale = ref(1)
const tx = ref(0)
const ty = ref(0)

let generation = 0
let activeLoads = 0
const loadWaiters: Array<() => void> = []
const inflight = new Map<number, Promise<void>>()
let saveTimer: number | undefined
let resumeTimer: number | undefined
let tapTimer: number | undefined
let coverDone = false
let shelfReady: Promise<void> | null = null
let openStartedAt = 0
let renderTracked = false
let zoomTracked = false

const pointers = new Map<number, { x: number; y: number }>()
let panStart: { x: number; y: number; tx: number; ty: number } | null = null
let pinchStart: { distance: number; scale: number; tx: number; ty: number } | null = null
let tapStart: { x: number; y: number; time: number } | null = null
let lastTap: { x: number; y: number; time: number } | null = null
let wheelLock = 0
let scrollRaf: number | undefined
let shiftingScroll = false
let scrollGesture = false
let zoomApplying = false
let zoomToken = 0
let pendingZoom: ScrollZoomRequest | null = null
let pinchState: ScrollPinch | null = null
let singleTouch: { x: number; y: number; time: number } | null = null
let lastScrollTap: { x: number; y: number; time: number } | null = null
let lastTouchAt = 0
let gestureStartScale: number | null = null
let scrollTapTimer: number | undefined
let lastScrollTop = 0
let savedScrollY = 0
let historyPushed = false

function spreadStart(page: number): number {
  if (mode.value !== 'double' || page <= 0) return page
  return page % 2 === 1 ? page : page - 1
}

const scrollIndices = computed<number[]>(() => {
  if (!source.value || mode.value !== 'scroll') return []
  const maxStart = Math.max(0, pageCount.value - SCROLL_WINDOW)
  const start = Math.min(Math.max(0, scrollWindowStart.value), maxStart)
  const end = Math.min(start + SCROLL_WINDOW, pageCount.value)
  const pages: number[] = []
  for (let page = start; page < end; page += 1) pages.push(page)
  return pages
})

const visibleIndices = computed<number[]>(() => {
  if (!source.value) return []
  if (mode.value === 'scroll') return scrollIndices.value
  if (mode.value === 'single') return [index.value]
  const start = spreadStart(index.value)
  // The cover stays on its own page, so spreads pair 2-3, 4-5, and so on.
  if (start === 0) return [0]
  const pages = [start]
  if (start + 1 < pageCount.value) pages.push(start + 1)
  return pages
})

const scrollPages = computed(() =>
  scrollIndices.value.map((page) => ({
    index: page,
    asset: assets.get(page) ?? null,
    error: pageErrors.get(page) ?? '',
  })),
)

const modeLabel = computed(() =>
  mode.value === 'single' ? 'Single' : mode.value === 'double' ? 'Double' : 'Scroll',
)

const zoomPercent = computed(() =>
  Math.round((mode.value === 'scroll' ? scrollScale.value : scale.value) * 100),
)

watch(zoomPercent, (value) => {
  if (zoomTracked || value <= 100) return
  zoomTracked = true
  track('zoom', { level: value })
})

const bookmarked = computed(() => bookmarks.value.some((item) => item.page === index.value))

/**
 * Keep the head and the extension of a long name, so the middle ellipsis never
 * collapses to a single letter when the toolbar is narrow.
 */
const displayName = computed(() => {
  const name = fileName.value || title.value
  const budget = nameBudget.value
  if (!name || name.length <= budget) return name
  // Keep the extension and the last page number, then spend what is left on the head.
  const tail = Math.max(6, Math.round(budget * 0.45))
  const head = Math.max(4, budget - tail - 1)
  if (head + tail + 1 >= name.length) return name
  let tailText = name.slice(-tail)
  // Do not start the tail in the middle of a word ("…k 037.cbz" -> "…037.cbz").
  const boundary = tailText.search(/\s/)
  if (boundary > 0 && boundary <= 3) tailText = tailText.slice(boundary + 1)
  return `${name.slice(0, head).trimEnd()}…${tailText.trimStart()}`
})

const visiblePages = computed(() =>
  visibleIndices.value.map((page) => ({
    index: page,
    asset: assets.get(page) ?? null,
    error: pageErrors.get(page) ?? '',
  })),
)

const currentLabel = computed(() => {
  if (mode.value === 'single' || mode.value === 'scroll')
    return `Page ${index.value + 1} / ${pageCount.value}`
  const start = spreadStart(index.value)
  const end = Math.min(start + (start === 0 ? 1 : 2), pageCount.value)
  return start + 1 === end
    ? `Page ${start + 1} / ${pageCount.value}`
    : `Pages ${start + 1}-${end} / ${pageCount.value}`
})

const layerStyle = computed(() => ({
  transform: `translate3d(${tx.value}px, ${ty.value}px, 0) scale(${scale.value})`,
}))

function messageOf(value: unknown): string {
  if (value instanceof ReaderError) return value.message
  if (value instanceof Error && value.message) return value.message
  return 'Something went wrong while opening this file.'
}

function acquire(): Promise<void> {
  if (activeLoads < CONCURRENCY) {
    activeLoads += 1
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    loadWaiters.push(() => {
      activeLoads += 1
      resolve()
    })
  })
}

function release(): void {
  if (activeLoads > 0) activeLoads -= 1
  const next = loadWaiters.shift()
  if (next) next()
}

function releaseAssets(): void {
  for (const asset of assets.values()) URL.revokeObjectURL(asset.url)
  assets.clear()
  pageErrors.clear()
}

async function resetReader(): Promise<void> {
  generation += 1
  window.clearTimeout(saveTimer)
  window.clearTimeout(resumeTimer)
  window.clearTimeout(tapTimer)
  const current = source.value
  source.value = null
  inflight.clear()
  releaseAssets()
  const waiting = loadWaiters.splice(0)
  waiting.forEach((resolve) => resolve())
  activeLoads = 0
  pageCount.value = 0
  index.value = 0
  scrollWindowStart.value = 0
  if (scrollRaf) {
    cancelAnimationFrame(scrollRaf)
    scrollRaf = undefined
  }
  ready.value = false
  fileFingerprint.value = ''
  fileName.value = ''
  title.value = ''
  error.value = ''
  dragging.value = false
  menuOpen.value = false
  showResume.value = false
  scrollGesture = false
  pinchState = null
  singleTouch = null
  lastScrollTap = null
  bookmarks.value = []
  coverDone = false
  shelfReady = null
  renderTracked = false
  zoomTracked = false
  clearZoom()
  if (current) await current.dispose()
}

async function loadOne(page: number): Promise<void> {
  if (!source.value || page < 0 || page >= pageCount.value) return
  if (assets.has(page) || inflight.has(page)) return

  const task = (async () => {
    await acquire()
    const gen = generation
    try {
      if (gen !== generation || !source.value) return
      const blob = await source.value.getPage(page)
      const asset = await loadPageAsset(
        page,
        blob,
        mode.value === 'scroll' ? scrollDecodeWidth() : undefined,
      )
      if (gen !== generation) {
        URL.revokeObjectURL(asset.url)
        return
      }
      assets.set(page, asset)
      pageErrors.delete(page)
      if (page === 0 && !renderTracked) {
        renderTracked = true
        track('render_success', { ms: Math.round(performance.now() - openStartedAt) })
      }
      if (page === 0 && !coverDone) {
        coverDone = true
        const id = fileFingerprint.value
        const url = asset.url
        void (shelfReady ?? Promise.resolve()).then(async () => {
          const cover = await renderCover(url)
          if (cover && fileFingerprint.value === id) await setCover(id, cover)
        })
      }
      if (mode.value !== 'scroll') {
        await nextTick()
        measureContent()
        clampPan()
      }
    } catch (value) {
      if (gen === generation) pageErrors.set(page, messageOf(value))
    } finally {
      release()
    }
  })().finally(() => inflight.delete(page))

  inflight.set(page, task)
  await task
}

function prune(keep: Set<number>): void {
  for (const [page, asset] of [...assets]) {
    if (!keep.has(page)) {
      URL.revokeObjectURL(asset.url)
      assets.delete(page)
    }
  }

  let total = 0
  for (const asset of assets.values()) total += asset.width * asset.height
  if (total <= MAX_TOTAL_PIXELS) return

  const candidates = [...assets.entries()]
    .filter(([page]) => {
      if (mode.value === 'scroll' && Math.abs(page - index.value) > 2) return true
      return !visibleIndices.value.includes(page)
    })
    .sort((a, b) => Math.abs(b[0] - index.value) - Math.abs(a[0] - index.value))

  for (const [page, asset] of candidates) {
    URL.revokeObjectURL(asset.url)
    assets.delete(page)
    total -= asset.width * asset.height
    if (total <= MAX_TOTAL_PIXELS) break
  }
}

async function ensurePages(): Promise<void> {
  if (!source.value) return

  if (mode.value === 'scroll') {
    const targets = new Set<number>(scrollIndices.value)
    if (index.value - 1 >= 0) targets.add(index.value - 1)
    if (index.value + 1 < pageCount.value) targets.add(index.value + 1)
    prune(targets)
    await Promise.all([...targets].map((page) => loadOne(page)))
    return
  }

  const visible = visibleIndices.value
  if (visible.length === 0) return

  const targets = new Set<number>(visible)
  const first = visible[0]
  const last = visible[visible.length - 1]
  if (first - 1 >= 0) targets.add(first - 1)
  if (last + 1 < pageCount.value) targets.add(last + 1)

  prune(targets)
  console.info('[reader] ensure', mode.value, [...targets])
  await Promise.all([...targets].map((page) => loadOne(page)))
}

function slotStyle(page: number): Record<string, string> {
  const count = Math.max(1, visibleIndices.value.length)
  const gap = 10
  const availableW = Math.max(60, stageW.value - STAGE_PAD_X * 2)
  const availableH = Math.max(60, stageH.value - STAGE_PAD_TOP - 8)
  const maxW = count === 2 ? Math.max(60, (availableW - gap) / 2) : availableW
  const maxH = availableH
  const asset = assets.get(page)

  if (!asset) {
    return {
      width: `${Math.round(maxW * 0.58)}px`,
      height: `${Math.round(maxH * 0.7)}px`,
    }
  }

  const ratio = Math.min(maxW / asset.width, maxH / asset.height, 2)
  return {
    width: `${Math.max(1, Math.round(asset.width * ratio))}px`,
    height: `${Math.max(1, Math.round(asset.height * ratio))}px`,
  }
}

function measureContent(): void {
  const element = pagesEl.value
  if (!element) return
  contentW.value = element.offsetWidth
  contentH.value = element.offsetHeight
  contentLeft.value = element.offsetLeft
  contentTop.value = element.offsetTop
}

function measureStage(): void {
  const stage = stageEl.value
  if (!stage) return
  stageW.value = stage.clientWidth
  stageH.value = stage.clientHeight
  measureContent()
}

function scrollPageStyle(page: number): Record<string, string> {
  const width = Math.max(120, (stageW.value - STAGE_PAD_X * 2) * scrollScale.value)
  const asset = assets.get(page)
  const ratio = asset && asset.width > 0 ? `${asset.width} / ${asset.height}` : '2 / 3'
  return {
    width: `${Math.round(width)}px`,
    aspectRatio: ratio,
  }
}

/**
 * Pages are decoded for their on-screen size. Zooming in asks for more pixels
 * for pages that enter the window afterwards; the decode cap and the LRU budget
 * stay in place, so this never turns into a memory regression.
 */
function scrollDecodeWidth(): number {
  const width = Math.max(120, (stageW.value - STAGE_PAD_X * 2) * scrollScale.value)
  return Math.min(SCROLL_DECODE_WIDTH, Math.round(width))
}

function scrollPageEl(page: number): HTMLElement | null {
  return stageEl.value?.querySelector<HTMLElement>(`[data-page="${page}"]`) ?? null
}

function centerScrollWindow(page: number): void {
  const maxStart = Math.max(0, pageCount.value - SCROLL_WINDOW)
  scrollWindowStart.value = Math.min(
    Math.max(0, page - Math.floor(SCROLL_WINDOW / 2)),
    maxStart,
  )
}

function scrollPageToTop(page: number): void {
  const scroller = stageEl.value
  const element = scrollPageEl(page)
  if (!scroller || !element) return
  const offset =
    element.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
  scroller.scrollTop = offset
}

function scrollByViewport(direction: number): void {
  const scroller = stageEl.value
  if (!scroller) return
  scroller.scrollBy({ top: direction * stageH.value * 0.8, behavior: 'smooth' })
}

function preserveScrollAnchor(nextStart: number, anchor: number): void {
  const scroller = stageEl.value
  const element = scrollPageEl(anchor)
  if (!scroller || !element) {
    scrollWindowStart.value = nextStart
    return
  }
  const before = element.getBoundingClientRect().top - scroller.getBoundingClientRect().top
  shiftingScroll = true
  scrollWindowStart.value = nextStart
  void nextTick().then(() => {
    const nextElement = scrollPageEl(anchor)
    if (nextElement) {
      const after = nextElement.getBoundingClientRect().top - scroller.getBoundingClientRect().top
      scroller.scrollTop += after - before
    }
    shiftingScroll = false
    void ensurePages()
  })
}

function syncScroll(): void {
  const scroller = stageEl.value
  if (!scroller || mode.value !== 'scroll' || shiftingScroll || scrollGesture) return
  const stageRect = scroller.getBoundingClientRect()
  const line = stageRect.top + stageRect.height * 0.35
  let current = index.value
  for (const block of scroller.querySelectorAll<HTMLElement>('.scroll-page')) {
    const rect = block.getBoundingClientRect()
    if (rect.bottom > line) {
      current = Number(block.dataset.page)
      break
    }
  }
  if (Number.isFinite(current) && current !== index.value) index.value = current

  const pages = scrollIndices.value
  if (pages.length === 0) return
  const start = pages[0]
  const last = pages[pages.length - 1]
  if (current - start <= 1 && start > 0) {
    preserveScrollAnchor(Math.max(0, start - 4), current)
  } else if (last - current <= 1 && last < pageCount.value - 1) {
    const maxStart = Math.max(0, pageCount.value - SCROLL_WINDOW)
    preserveScrollAnchor(Math.min(maxStart, start + 4), current)
  }
}

function onScroll(): void {
  if (mode.value !== 'scroll') return
  const scroller = stageEl.value
  if (scroller) {
    // Scrolling fades the floating chrome out; tapping brings it back.
    if (Math.abs(scroller.scrollTop - lastScrollTop) > 4) {
      toolbarVisible.value = false
    }
    lastScrollTop = scroller.scrollTop
  }
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = undefined
    syncScroll()
  })
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function clampPan(): void {
  const sw = stageW.value
  const sh = stageH.value
  const cw = contentW.value
  const ch = contentH.value
  if (!sw || !sh || !cw || !ch) return

  if (scale.value <= 1.001) {
    tx.value = 0
    ty.value = 0
    return
  }

  const s = scale.value
  const left = contentLeft.value
  const top = contentTop.value
  const centerX = left + cw / 2
  const centerY = top + ch / 2

  if (cw * s <= sw) {
    tx.value = centerX * (1 - s)
  } else {
    tx.value = clamp(tx.value, sw - (left + cw) * s, -left * s)
  }

  if (ch * s <= sh) {
    ty.value = centerY * (1 - s)
  } else {
    ty.value = clamp(ty.value, sh - (top + ch) * s, -top * s)
  }
}

function clearZoom(): void {
  zoomToken += 1
  zoomApplying = false
  pendingZoom = null
  scrollScale.value = 1
  scale.value = 1
  tx.value = 0
  ty.value = 0
}

function resetZoom(): void {
  if (mode.value === 'scroll') {
    resetScrollZoom()
    return
  }
  scale.value = 1
  tx.value = 0
  ty.value = 0
}

/**
 * Scroll mode only keeps 12 pages mounted, so zooming changes every page's
 * placeholder height and therefore the scroll offset. Instead of guessing the
 * new offset, remember which page pixel sits under the pinch centre and put
 * that same pixel back under it after the layout update.
 */
function scrollAnchorAt(clientX: number, clientY: number): ScrollAnchor | null {
  const scroller = stageEl.value
  if (!scroller) return null
  let last: ScrollAnchor | null = null
  for (const block of scroller.querySelectorAll<HTMLElement>('.scroll-page')) {
    const rect = block.getBoundingClientRect()
    const page = Number(block.dataset.page)
    if (!Number.isFinite(page)) continue
    const relX = rect.width > 0 ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0.5
    if (rect.bottom > clientY) {
      const relY = rect.height > 0 ? clamp((clientY - rect.top) / rect.height, 0, 1) : 0
      return { page, relX, relY }
    }
    last = { page, relX, relY: 1 }
  }
  return last
}

function alignScrollAnchor(anchor: ScrollAnchor | null, clientX: number, clientY: number): void {
  const scroller = stageEl.value
  if (!scroller || !anchor) return
  const element = scrollPageEl(anchor.page)
  if (!element) return
  const rect = element.getBoundingClientRect()
  scroller.scrollTop += rect.top + anchor.relY * rect.height - clientY
  scroller.scrollLeft += rect.left + anchor.relX * rect.width - clientX
}

function requestScrollZoom(
  next: number,
  clientX: number,
  clientY: number,
  anchor?: ScrollAnchor | null,
): void {
  if (mode.value !== 'scroll') return
  pendingZoom = { scale: clamp(next, 1, MAX_SCROLL_SCALE), x: clientX, y: clientY, anchor }
  if (zoomApplying) return
  applyScrollZoom()
}

function applyScrollZoom(): void {
  const request = pendingZoom
  pendingZoom = null
  if (!request || mode.value !== 'scroll') {
    zoomApplying = false
    return
  }
  const scroller = stageEl.value
  if (!scroller) {
    scrollScale.value = request.scale
    zoomApplying = false
    return
  }

  const anchor = request.anchor ?? scrollAnchorAt(request.x, request.y)
  const beforeRect = scroller.getBoundingClientRect()
  const before = {
    top: scroller.scrollTop,
    left: scroller.scrollLeft,
    height: Math.max(1, scroller.scrollHeight),
    width: Math.max(1, scroller.scrollWidth),
    offsetX: request.x - beforeRect.left,
    offsetY: request.y - beforeRect.top,
  }

  if (Math.abs(request.scale - scrollScale.value) < 0.002) {
    alignScrollAnchor(anchor, request.x, request.y)
    if (pendingZoom) {
      applyScrollZoom()
      return
    }
    zoomApplying = false
    return
  }

  zoomApplying = true
  const token = zoomToken
  scrollScale.value = request.scale
  void nextTick().then(() => {
    if (token !== zoomToken) return
    if (anchor && scrollPageEl(anchor.page)) {
      alignScrollAnchor(anchor, request.x, request.y)
    } else {
      // The anchor page left the window: fall back to proportional offsets.
      scroller.scrollTop =
        (before.top + before.offsetY) * (scroller.scrollHeight / before.height) - before.offsetY
      scroller.scrollLeft =
        (before.left + before.offsetX) * (scroller.scrollWidth / before.width) - before.offsetX
    }
    if (pendingZoom) {
      applyScrollZoom()
      return
    }
    zoomApplying = false
    if (scrollScale.value <= 1.001) scroller.scrollLeft = 0
    void ensurePages()
  })
}

function resetScrollZoom(): void {
  const scroller = stageEl.value
  if (!scroller) {
    scrollScale.value = 1
    return
  }
  const rect = scroller.getBoundingClientRect()
  requestScrollZoom(1, rect.left + rect.width / 2, rect.top + rect.height * 0.35)
}

/** A burst of wheel events must compound, not all multiply the last rendered scale. */
function pendingScrollScale(): number {
  return pendingZoom?.scale ?? scrollScale.value
}

function zoomScrollBy(delta: number): void {
  const scroller = stageEl.value
  if (!scroller) return
  const rect = scroller.getBoundingClientRect()
  requestScrollZoom(
    pendingScrollScale() + delta,
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
  )
}

function zoomTo(next: number, anchorX: number, anchorY: number): void {
  const target = clamp(next, MIN_SCALE, MAX_SCALE)
  const ratio = target / scale.value
  tx.value = anchorX - (anchorX - tx.value) * ratio
  ty.value = anchorY - (anchorY - ty.value) * ratio
  scale.value = target
  clampPan()
}

function stagePoint(clientX: number, clientY: number): { x: number; y: number } {
  const rect = stageEl.value?.getBoundingClientRect()
  return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) }
}

function goToPage(page: number): void {
  if (!pageCount.value) return
  const clampedPage = clamp(Math.round(page), 0, pageCount.value - 1)
  window.clearTimeout(tapTimer)
  lastTap = null
  showResume.value = false

  if (mode.value === 'scroll') {
    index.value = clampedPage
    centerScrollWindow(clampedPage)
    void nextTick().then(async () => {
      measureStage()
      await ensurePages()
      if (mode.value === 'scroll' && index.value === clampedPage) scrollPageToTop(clampedPage)
    })
    return
  }

  const target = mode.value === 'double' ? spreadStart(clampedPage) : clampedPage
  if (target === index.value) return
  index.value = target
  resetZoom()
  void nextTick().then(() => {
    measureStage()
    void ensurePages()
  })
}

function next(): void {
  if (mode.value === 'single' || mode.value === 'scroll') {
    goToPage(index.value + 1)
    return
  }
  const start = spreadStart(index.value)
  goToPage(start + (start === 0 ? 1 : 2))
}

function prev(): void {
  if (mode.value === 'single' || mode.value === 'scroll') {
    goToPage(index.value - 1)
    return
  }
  const start = spreadStart(index.value)
  if (start === 0) return
  goToPage(start === 1 ? 0 : start - 2)
}

function toggleMode(): void {
  const current = index.value
  const order: ReadingMode[] = ['single', 'double', 'scroll']
  const nextMode = order[(order.indexOf(mode.value) + 1) % order.length]
  window.clearTimeout(tapTimer)
  lastTap = null
  menuOpen.value = false
  clearZoom()
  mode.value = nextMode
  track('mode_switch', { mode: nextMode })

  if (nextMode === 'scroll') {
    // Enter scrolling at the page that is currently on screen.
    index.value = current
    centerScrollWindow(current)
    void nextTick().then(async () => {
      measureStage()
      await ensurePages()
      if (mode.value === 'scroll') scrollPageToTop(current)
    })
    return
  }

  index.value = nextMode === 'double' ? spreadStart(current) : current
  void nextTick().then(() => {
    measureStage()
    void ensurePages()
  })
}

function toggleRtl(): void {
  rtl.value = !rtl.value
  void nextTick().then(() => {
    measureContent()
    clampPan()
  })
}

function onSlider(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  if (Number.isFinite(value)) goToPage(value)
}

function scheduleSave(): void {
  if (!fileFingerprint.value || !source.value) return
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    void writeProgress(fileFingerprint.value, {
      index: index.value,
      mode: mode.value,
      rtl: rtl.value,
      updatedAt: Date.now(),
    })
    void touchEntry(fileFingerprint.value, {
      index: index.value,
      mode: mode.value,
      rtl: rtl.value,
    })
  }, 350)
}

watch([index, mode, rtl], scheduleSave)

async function openFile(file: File): Promise<void> {
  if (busy.value) return
  busy.value = true
  error.value = ''
  await resetReader()
  openStartedAt = performance.now()
  const gen = generation

  try {
    const fileId = await fingerprint(file)
    const archive = await ZipPageSource.open(file)
    if (gen !== generation) {
      await archive.dispose()
      return
    }

    fileFingerprint.value = fileId
    source.value = archive
    fileName.value = file.name
    title.value = archive.info.title
    pageCount.value = archive.info.pageCount
    rtl.value = archive.info.rtl

    const saved = await readProgress(fileId)
    if (saved && saved.index > 0 && saved.index < archive.info.pageCount) {
      mode.value =
        saved.mode === 'double' ? 'double' : saved.mode === 'scroll' ? 'scroll' : 'single'
      rtl.value = saved.rtl
      index.value = mode.value === 'double' ? spreadStart(saved.index) : saved.index
      resumePage.value = saved.index + 1
      showResume.value = true
      window.clearTimeout(resumeTimer)
      resumeTimer = window.setTimeout(() => {
        showResume.value = false
      }, 9000)
    } else {
      mode.value = window.innerWidth >= 980 ? 'double' : 'single'
      index.value = 0
    }

    if (mode.value === 'scroll') centerScrollWindow(index.value)
    scrollWindowStart.value = Math.min(scrollWindowStart.value, Math.max(0, pageCount.value - SCROLL_WINDOW))

    // Track the file on the landing shelf: metadata now, a small copy in the background.
    bookmarks.value = await readBookmarks(fileId)
    shelfReady = rememberArchive(file, fileId, {
      pageCount: pageCount.value,
      index: index.value,
      mode: mode.value,
      rtl: rtl.value,
    })

    ready.value = true
    enterImmersive()
    await nextTick()
    measureStage()
    attachObserver()
    await ensurePages()
    if (mode.value === 'scroll') scrollPageToTop(index.value)
    else clampPan()
  } catch (value) {
    leaveImmersive(true)
    await resetReader()
    ready.value = false
    error.value = messageOf(value)
    if (historyPushed && window.history.state?.cbzReader) {
      historyPushed = false
      window.history.back()
    }
  } finally {
    busy.value = false
  }
}

function enterImmersive(): void {
  savedScrollY = window.scrollY
  if (!historyPushed) {
    // A reader session gets its own entry so the Android back gesture closes
    // the reader instead of leaving the site.
    window.history.pushState({ cbzReader: true }, '', window.location.href)
    historyPushed = true
  }
  if (isIOS) {
    let seen = false
    try {
      seen = window.localStorage.getItem(IOS_HINT_KEY) === '1'
    } catch {
      seen = false
    }
    if (!seen) {
      iosHintVisible.value = true
      try {
        window.localStorage.setItem(IOS_HINT_KEY, '1')
      } catch {
        // Private mode: the hint just shows again next time.
      }
    }
  }
}

function leaveImmersive(restoreScroll: boolean): void {
  iosHintVisible.value = false
  if (restoreScroll) window.scrollTo({ top: savedScrollY, behavior: 'auto' })
}

async function closeReader(): Promise<void> {
  if (!ready.value && !busy.value) return
  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => undefined)
  }
  const ownsHistory = historyPushed
  historyPushed = false
  leaveImmersive(true)
  await resetReader()
  if (ownsHistory && window.history.state?.cbzReader) {
    // Drop the entry we added; popstate then finds nothing to close.
    window.history.back()
  }
}

function onPopState(): void {
  if (!ready.value) return
  historyPushed = false
  leaveImmersive(true)
  void resetReader()
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) {
    track('tool_open', {
      source: 'picker',
      ext: fileExtension(file.name),
      size_bucket: sizeBucket(file.size),
    })
    void openFile(file)
  }
}

function pickFile(): void {
  fileInput.value?.click()
}

function onDragEnter(event: DragEvent): void {
  if (!event.dataTransfer?.types.includes('Files')) return
  dragging.value = true
}

function onDragLeave(event: DragEvent): void {
  const root = event.currentTarget as HTMLElement
  const next = event.relatedTarget as Node | null
  if (!next || !root.contains(next)) dragging.value = false
}

function onDrop(event: DragEvent): void {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) void openFile(file)
}

function retryPage(page: number): void {
  pageErrors.delete(page)
  void loadOne(page)
}

function startOver(): void {
  showResume.value = false
  goToPage(0)
}

function onImageLoad(): void {
  measureContent()
  clampPan()
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function onPointerDown(event: PointerEvent): void {
  if (!ready.value || mode.value === 'scroll') return
  const target = event.currentTarget as HTMLElement
  target.setPointerCapture?.(event.pointerId)
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  tapStart = { x: event.clientX, y: event.clientY, time: Date.now() }

  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    pinchStart = {
      distance: Math.max(1, distance(a, b)),
      scale: scale.value,
      tx: tx.value,
      ty: ty.value,
    }
    panStart = null
  } else if (pointers.size === 1 && scale.value > 1.01) {
    panStart = { x: event.clientX, y: event.clientY, tx: tx.value, ty: ty.value }
  }
}

function onPointerMove(event: PointerEvent): void {
  if (!pointers.has(event.pointerId)) return
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

  if (pointers.size >= 2 && pinchStart) {
    const [a, b] = [...pointers.values()]
    const nextScale = clamp(
      (pinchStart.scale * distance(a, b)) / pinchStart.distance,
      MIN_SCALE,
      MAX_SCALE,
    )
    const point = stagePoint((a.x + b.x) / 2, (a.y + b.y) / 2)
    const ratio = nextScale / pinchStart.scale
    scale.value = nextScale
    tx.value = point.x - (point.x - pinchStart.tx) * ratio
    ty.value = point.y - (point.y - pinchStart.ty) * ratio
    tapStart = null
    clampPan()
    return
  }

  if (panStart) {
    tx.value = panStart.tx + (event.clientX - panStart.x)
    ty.value = panStart.ty + (event.clientY - panStart.y)
    if (Math.abs(event.clientX - panStart.x) + Math.abs(event.clientY - panStart.y) > 6) {
      tapStart = null
    }
    clampPan()
  }
}

function handleTap(event: PointerEvent): void {
  const point = stagePoint(event.clientX, event.clientY)

  if (
    lastTap &&
    Date.now() - lastTap.time < 320 &&
    Math.hypot(point.x - lastTap.x, point.y - lastTap.y) < 48
  ) {
    window.clearTimeout(tapTimer)
    lastTap = null
    if (scale.value > 1.01) resetZoom()
    else zoomTo(2.5, point.x, point.y)
    return
  }

  lastTap = { x: point.x, y: point.y, time: Date.now() }
  window.clearTimeout(tapTimer)
  tapTimer = window.setTimeout(() => {
    lastTap = null
    singleTap(point)
  }, 300)
}

function singleTap(point: { x: number; y: number }): void {
  if (scale.value > 1.01) {
    toolbarVisible.value = !toolbarVisible.value
    return
  }
  if (point.x < stageW.value * 0.32) {
    if (rtl.value) next()
    else prev()
    return
  }
  if (point.x > stageW.value * 0.68) {
    if (rtl.value) prev()
    else next()
    return
  }
  toolbarVisible.value = !toolbarVisible.value
}

function onPointerUp(event: PointerEvent): void {
  const start = tapStart
  const lastPointer = pointers.size === 1
  pointers.delete(event.pointerId)
  if (pointers.size < 2) pinchStart = null
  if (pointers.size === 0) panStart = null

  if (!start || !lastPointer) return
  const dx = event.clientX - start.x
  const dy = event.clientY - start.y
  const moved = Math.hypot(dx, dy)
  tapStart = null

  if (scale.value > 1.01) {
    if (moved < 10) handleTap(event)
    return
  }

  if (moved > 56 && Math.abs(dx) > Math.abs(dy) * 1.2) {
    if (dx < 0) next()
    else prev()
    return
  }

  // Swipe down hides the floating chrome; a tap in the middle brings it back.
  if (moved > 56 && Math.abs(dy) > Math.abs(dx) * 1.2 && dy > 0) {
    toolbarVisible.value = false
    return
  }

  if (moved < 10 && Date.now() - start.time < 500) handleTap(event)
}

function scheduleToolbarToggle(): void {
  window.clearTimeout(scrollTapTimer)
  scrollTapTimer = window.setTimeout(() => {
    toolbarVisible.value = !toolbarVisible.value
  }, 300)
}

function onScrollTouchStart(event: TouchEvent): void {
  if (!ready.value || mode.value !== 'scroll') return
  lastTouchAt = Date.now()

  if (event.touches.length === 2) {
    const [a, b] = [event.touches[0], event.touches[1]]
    const midX = (a.clientX + b.clientX) / 2
    const midY = (a.clientY + b.clientY) / 2
    pinchState = {
      distance: Math.max(1, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)),
      scale: scrollScale.value,
      anchor: scrollAnchorAt(midX, midY),
    }
    scrollGesture = true
    singleTouch = null
    lastScrollTap = null
    return
  }

  if (event.touches.length === 1) {
    const touch = event.touches[0]
    singleTouch = { x: touch.clientX, y: touch.clientY, time: Date.now() }
  }
}

function onScrollTouchMove(event: TouchEvent): void {
  if (!ready.value || mode.value !== 'scroll') return
  lastTouchAt = Date.now()
  if (event.touches.length !== 2 || !pinchState) return
  // Keep the browser from turning the pinch into a page zoom or a native scroll.
  event.preventDefault()
  const [a, b] = [event.touches[0], event.touches[1]]
  const distance = Math.max(1, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY))
  const nextScale = clamp(
    (pinchState.scale * distance) / pinchState.distance,
    1,
    MAX_SCROLL_SCALE,
  )
  requestScrollZoom(
    nextScale,
    (a.clientX + b.clientX) / 2,
    (a.clientY + b.clientY) / 2,
    pinchState.anchor,
  )
}

function onScrollTouchEnd(event: TouchEvent): void {
  if (mode.value !== 'scroll') return
  lastTouchAt = Date.now()
  if (event.touches.length >= 2) return

  if (pinchState) {
    pinchState = null
    scrollGesture = false
    singleTouch = null
    // Never zoom below fit-width, so snap the remaining sliver back to 100%.
    if (scrollScale.value < 1.05) resetScrollZoom()
    onScroll()
    return
  }

  const start = singleTouch
  const touch = event.changedTouches[0]
  singleTouch = null
  if (!start || !touch) return

  const moved = Math.hypot(touch.clientX - start.x, touch.clientY - start.y)
  if (moved > 12 || Date.now() - start.time > 400) {
    lastScrollTap = null
    return
  }

  const now = Date.now()
  if (
    lastScrollTap &&
    now - lastScrollTap.time < 320 &&
    Math.hypot(touch.clientX - lastScrollTap.x, touch.clientY - lastScrollTap.y) < 30
  ) {
    lastScrollTap = null
    // A double tap is zoom, not a request to toggle the chrome.
    window.clearTimeout(scrollTapTimer)
    if (scrollScale.value > 1.01) resetScrollZoom()
    else requestScrollZoom(2, touch.clientX, touch.clientY)
    return
  }

  lastScrollTap = { x: touch.clientX, y: touch.clientY, time: now }
  // Single tap toggles the chrome, deferred so a double tap can cancel it.
  scheduleToolbarToggle()
}

function onStageDoubleClick(event: MouseEvent): void {
  if (!ready.value || mode.value !== 'scroll') return
  if (Date.now() - lastTouchAt < 800) return
  window.clearTimeout(scrollTapTimer)
  if (scrollScale.value > 1.01) resetScrollZoom()
  else requestScrollZoom(2, event.clientX, event.clientY)
}

function onStageClick(): void {
  if (!ready.value || mode.value !== 'scroll') return
  if (Date.now() - lastTouchAt < 800) return
  scheduleToolbarToggle()
}

function onGestureStart(): void {
  gestureStartScale = null
}

function onGestureChange(event: Event): void {
  if (!ready.value || mode.value !== 'scroll' || pinchState) return
  const gesture = event as Event & { scale?: number; clientX?: number; clientY?: number }
  const ratio = gesture.scale
  if (!ratio || !Number.isFinite(ratio)) return
  if (gestureStartScale === null) gestureStartScale = scrollScale.value
  const rect = stageEl.value?.getBoundingClientRect()
  requestScrollZoom(
    gestureStartScale * ratio,
    gesture.clientX ?? (rect ? rect.left + rect.width / 2 : 0),
    gesture.clientY ?? (rect ? rect.top + rect.height / 2 : 0),
  )
}

function onGestureEnd(): void {
  gestureStartScale = null
}

function onWheel(event: WheelEvent): void {
  if (!ready.value) return
  if (mode.value === 'scroll') {
    // Trackpad pinch and Ctrl/Cmd + wheel zoom; plain wheel keeps scrolling.
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    requestScrollZoom(
      pendingScrollScale() * (event.deltaY < 0 ? 1.12 : 0.89),
      event.clientX,
      event.clientY,
    )
    return
  }
  event.preventDefault()
  if (event.ctrlKey || event.metaKey) {
    const point = stagePoint(event.clientX, event.clientY)
    zoomTo(scale.value * (event.deltaY < 0 ? 1.12 : 0.89), point.x, point.y)
    return
  }
  const now = Date.now()
  if (now < wheelLock || Math.abs(event.deltaY) < 8) return
  wheelLock = now + 320
  if (event.deltaY > 0) next()
  else prev()
}

function onKey(event: KeyboardEvent): void {
  if (!ready.value) return
  const target = event.target as HTMLElement | null
  if (
    target &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  ) {
    return
  }

  // While the options menu is open, let Tab/Enter reach its buttons and Escape close it.
  if (menuOpen.value) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu()
    }
    return
  }

  if (mode.value === 'scroll') {
    switch (event.key) {
      case 'ArrowDown':
      case 'PageDown':
        event.preventDefault()
        scrollByViewport(1)
        return
      case 'ArrowUp':
      case 'PageUp':
        event.preventDefault()
        scrollByViewport(-1)
        return
      case ' ':
        event.preventDefault()
        scrollByViewport(event.shiftKey ? -1 : 1)
        return
      case '+':
      case '=':
        event.preventDefault()
        zoomScrollBy(0.25)
        return
      case '-':
      case '_':
        event.preventDefault()
        zoomScrollBy(-0.25)
        return
      case '0':
        event.preventDefault()
        resetScrollZoom()
        return
    }
  }

  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault()
      if (rtl.value) prev()
      else next()
      break
    case 'ArrowLeft':
      event.preventDefault()
      if (rtl.value) next()
      else prev()
      break
    case ' ':
      event.preventDefault()
      if (event.shiftKey) prev()
      else next()
      break
    case 'PageDown':
      event.preventDefault()
      next()
      break
    case 'PageUp':
      event.preventDefault()
      prev()
      break
    case 'Home':
      event.preventDefault()
      goToPage(0)
      break
    case 'End':
      event.preventDefault()
      goToPage(pageCount.value - 1)
      break
    case 'd':
    case 'D':
      toggleMode()
      break
    case 'r':
    case 'R':
      toggleRtl()
      break
    case 'f':
    case 'F':
      // Fullscreen here only hides the browser chrome; the reader is already
      // viewport-sized, so do nothing where that API is unavailable.
      if (hasFullscreen.value) void toggleFullscreen()
      break
    case '+':
    case '=':
      event.preventDefault()
      zoomTo(scale.value + 0.25, stageW.value / 2, stageH.value / 2)
      break
    case '-':
    case '_':
      event.preventDefault()
      zoomTo(scale.value - 0.25, stageW.value / 2, stageH.value / 2)
      break
    case 'Escape':
      if (document.fullscreenElement) void document.exitFullscreen()
      else resetZoom()
      break
  }
}

async function toggleFullscreen(): Promise<void> {
  const element = viewerEl.value
  if (!element) return
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await element.requestFullscreen()
  } catch {
    // iOS Safari does not allow element fullscreen, and the API can be denied.
  }
}

function onFullscreenChange(): void {
  fullscreenActive.value = Boolean(document.fullscreenElement)
}

async function toggleMenu(): Promise<void> {
  menuOpen.value = !menuOpen.value
  if (!menuOpen.value) return
  await nextTick()
  menuPanelEl.value?.querySelector<HTMLButtonElement>('button')?.focus()
}

function closeMenu(): void {
  if (!menuOpen.value) return
  menuOpen.value = false
  menuButtonEl.value?.focus()
}

function menuToggleRtl(): void {
  toggleRtl()
  closeMenu()
}

function menuToggleFullscreen(): void {
  void toggleFullscreen()
  closeMenu()
}

function menuToggleDark(): void {
  toggleTheme()
  closeMenu()
}

function menuToggleBookmark(): void {
  const page = index.value
  const exists = bookmarks.value.some((item) => item.page === page)
  const next = exists
    ? bookmarks.value.filter((item) => item.page !== page)
    : [...bookmarks.value, { page, createdAt: Date.now() }].sort((a, b) => a.page - b.page)
  if (!exists) track('bookmark_add')
  bookmarks.value = next
  void writeBookmarks(fileFingerprint.value, next)
}

function jumpToBookmark(page: number): void {
  closeMenu()
  goToPage(page)
}

function removeBookmark(page: number): void {
  const next = bookmarks.value.filter((item) => item.page !== page)
  bookmarks.value = next
  void writeBookmarks(fileFingerprint.value, next)
}

function onDocumentPointerDown(event: PointerEvent): void {
  if (!menuOpen.value) return
  const target = event.target as Node | null
  if (target && menuRef.value?.contains(target)) return
  menuOpen.value = false
}

function preventBrowserDrop(event: DragEvent): void {
  event.preventDefault()
}

let resizeObserver: ResizeObserver | null = null
let observedStage: HTMLElement | null = null
let observedMeta: HTMLElement | null = null

function measureNameBudget(): void {
  const width = metaEl.value?.clientWidth ?? 0
  if (!width) return
  // 13px semibold averages roughly 7.2px per character; 8.2 leaves room for wide glyphs.
  nameBudget.value = Math.max(10, Math.floor(width / 8.2))
}

function attachObserver(): void {
  if (!resizeObserver) return
  const stage = stageEl.value
  if (stage && stage !== observedStage) {
    if (observedStage) resizeObserver.unobserve(observedStage)
    observedStage = stage
    resizeObserver.observe(stage)
  }
  const meta = metaEl.value
  if (meta && meta !== observedMeta) {
    if (observedMeta) resizeObserver.unobserve(observedMeta)
    observedMeta = meta
    resizeObserver.observe(meta)
  }
  measureNameBudget()
}

watch(stageEl, () => {
  void nextTick().then(() => {
    attachObserver()
    measureStage()
  })
})

onMounted(async () => {
  // main.ts seeds the shared theme state at boot; re-read here so a change made
  // in another tab while this page was open is picked up before the menu renders.
  const stored = readThemeSetting()
  if (stored !== themeSetting.value) setTheme(stored)

  hasFullscreen.value =
    typeof document !== 'undefined' && document.fullscreenEnabled === true && !isIOS

  resizeObserver = new ResizeObserver(() => {
    measureStage()
    measureNameBudget()
    clampPan()
  })

  window.addEventListener('keydown', onKey)
  window.addEventListener('popstate', onPopState)
  window.addEventListener('dragover', preventBrowserDrop)
  window.addEventListener('drop', preventBrowserDrop)
  document.addEventListener('pointerdown', onDocumentPointerDown, true)
  document.addEventListener('fullscreenchange', onFullscreenChange)

  if (props.initialFile) await openFile(props.initialFile)

  await nextTick()
  attachObserver()
  measureStage()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('popstate', onPopState)
  window.removeEventListener('dragover', preventBrowserDrop)
  window.removeEventListener('drop', preventBrowserDrop)
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  resizeObserver?.disconnect()
  resizeObserver = null
  window.clearTimeout(saveTimer)
  window.clearTimeout(resumeTimer)
  window.clearTimeout(tapTimer)
  window.clearTimeout(scrollTapTimer)
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  void resetReader()
})
</script>

<template>
  <div
    class="reader"
    :class="{ 'reader--open': ready }"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="dragging = true"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <section v-if="!ready" class="empty">
      <div class="dropzone">
        <p class="kicker">CBZ / ZIP</p>
        <h2>{{ busy ? 'Reading archive...' : 'Open a CBZ file' }}</h2>
        <p>
          {{
            busy
              ? 'Building the page list and decoding the first page.'
              : 'Drop a .cbz file here, or choose one from your device. Pages are unpacked locally.'
          }}
        </p>
        <button class="open-button" type="button" :disabled="busy" @click="pickFile">
          {{ busy ? 'Opening...' : 'Choose a CBZ file' }}
        </button>
        <input ref="fileInput" type="file" hidden :accept="accept" @change="onFileChange" />
        <p class="fine">Nothing is uploaded. Works with CBZ and ZIP archives.</p>
      </div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </section>

    <section v-else ref="viewerEl" class="viewer">
      <header class="toolbar" :class="{ 'toolbar--hidden': !toolbarVisible }">
        <div ref="metaEl" class="meta">
          <strong :title="fileName || title">{{ displayName }}</strong>
          <span>{{ currentLabel }}</span>
        </div>
        <div class="tools">
          <button
            type="button"
            class="tool tool--icon"
            :title="`Reading mode: ${modeLabel} — tap to switch`"
            :aria-label="`Reading mode: ${modeLabel}. Switch to the next mode.`"
            @click="toggleMode"
          >
            <svg v-if="mode === 'single'" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4.5 2.5h4.2l2.8 2.8v8.2h-7z" />
              <path d="M8.7 2.5v2.8h2.8" />
            </svg>
            <svg v-else-if="mode === 'double'" viewBox="0 0 16 16" aria-hidden="true">
              <rect x="2" y="3" width="5.5" height="10" rx="1" />
              <rect x="8.5" y="3" width="5.5" height="10" rx="1" />
            </svg>
            <svg v-else viewBox="0 0 16 16" aria-hidden="true">
              <rect x="4" y="2.5" width="8" height="3.4" rx="1" />
              <rect x="4" y="6.3" width="8" height="3.4" rx="1" />
              <rect x="4" y="10.1" width="8" height="3.4" rx="1" />
            </svg>
          </button>
          <button
            type="button"
            class="tool tool--zoom"
            :title="`Zoom ${zoomPercent}% — click to fit width`"
            :aria-label="`Zoom ${zoomPercent}%, reset to fit width`"
            @click="resetZoom"
          >
            {{ zoomPercent }}%
          </button>
          <button
            type="button"
            class="tool tool--icon tool--accent"
            title="Open another CBZ file"
            aria-label="Open another CBZ file"
            @click="pickFile"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2 5.2a1 1 0 0 1 1-1h3l1.3 1.4H13a1 1 0 0 1 1 1v5.2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" />
              <path d="M8 8.2v3M6.5 9.7h3" />
            </svg>
          </button>
          <div ref="menuRef" class="menu">
            <button
              ref="menuButtonEl"
              type="button"
              class="tool tool--icon"
              :class="{ active: menuOpen }"
              aria-haspopup="menu"
              :aria-expanded="menuOpen ? 'true' : 'false'"
              aria-label="More reading options"
              title="More options"
              @click="toggleMenu"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" class="dots">
                <circle cx="8" cy="3.6" r="1.25" />
                <circle cx="8" cy="8" r="1.25" />
                <circle cx="8" cy="12.4" r="1.25" />
              </svg>
            </button>
            <div v-if="menuOpen" ref="menuPanelEl" class="menu__panel" role="menu" aria-label="Reading options">
              <button
                v-if="mode !== 'scroll'"
                type="button"
                class="menu__item"
                role="menuitemcheckbox"
                :aria-checked="rtl ? 'true' : 'false'"
                @click="menuToggleRtl"
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M13 8H3M6.5 4.5 3 8l3.5 3.5" />
                </svg>
                <span>Right-to-left reading</span>
                <span class="menu__state">{{ rtl ? 'On' : 'Off' }}</span>
              </button>
              <button
                v-if="hasFullscreen"
                type="button"
                class="menu__item"
                role="menuitem"
                @click="menuToggleFullscreen"
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M6 2.5H2.5V6M10 2.5h3.5V6M6 13.5H2.5V10M10 13.5h3.5V10" />
                </svg>
                <span>{{ fullscreenActive ? 'Show browser interface (F)' : 'Hide browser interface (F)' }}</span>
              </button>
              <button
                type="button"
                class="menu__item"
                role="menuitemcheckbox"
                :aria-checked="bookmarked ? 'true' : 'false'"
                @click="menuToggleBookmark"
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M4.5 2.5h7v11l-3.5-2.7-3.5 2.7z" />
                </svg>
                <span>{{ bookmarked ? 'Remove bookmark' : 'Bookmark this page' }}</span>
                <span class="menu__state">{{ bookmarks.length || '' }}</span>
              </button>
              <div class="menu__group" role="group" aria-labelledby="menu-theme-label">
                <p class="menu__label" id="menu-theme-label">Theme</p>
                <button
                  type="button"
                  class="menu__item"
                  role="menuitemcheckbox"
                  :aria-checked="resolvedTheme === 'dark' ? 'true' : 'false'"
                  @click="menuToggleDark"
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M12.5 9.6A5.5 5.5 0 0 1 6.4 3.5a5.5 5.5 0 1 0 6.1 6.1z" />
                  </svg>
                  <span>Dark mode</span>
                  <span class="menu__state">{{ resolvedTheme === 'dark' ? 'On' : 'Off' }}</span>
                </button>
              </div>
              <div v-if="bookmarks.length" class="menu__group">
                <p class="menu__label">Bookmarks</p>
                <div v-for="mark in bookmarks" :key="mark.page" class="menu__row">
                  <button
                    type="button"
                    class="menu__item menu__item--jump"
                    role="menuitem"
                    @click="jumpToBookmark(mark.page)"
                  >
                    <span>Page {{ mark.page + 1 }}</span>
                    <span v-if="mark.page === index" class="menu__state">Here</span>
                  </button>
                  <button
                    type="button"
                    class="menu__delete"
                    :aria-label="`Remove bookmark on page ${mark.page + 1}`"
                    @click="removeBookmark(mark.page)"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            class="tool tool--icon"
            data-reader-close
            aria-label="Close reader"
            title="Close reader"
            @click="closeReader"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
        <input ref="fileInput" type="file" hidden :accept="accept" @change="onFileChange" />
      </header>

      <div
        ref="stageEl"
        class="stage"
        :class="{ 'stage--scroll': mode === 'scroll' }"
        role="region"
        aria-label="Comic pages"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @wheel="onWheel"
        @scroll.passive="onScroll"
        @touchstart="onScrollTouchStart"
        @touchmove="onScrollTouchMove"
        @touchend="onScrollTouchEnd"
        @touchcancel="onScrollTouchEnd"
        @dblclick="onStageDoubleClick"
        @click="onStageClick"
        @gesturestart.prevent="onGestureStart"
        @gesturechange.prevent="onGestureChange"
        @gestureend="onGestureEnd"
      >
        <div v-if="mode === 'scroll'" class="scroll-track">
          <div
            v-for="item in scrollPages"
            :key="item.index"
            class="scroll-page"
            :data-page="item.index"
            :style="scrollPageStyle(item.index)"
          >
            <img
              v-if="item.asset"
              :src="item.asset.url"
              alt=""
              draggable="false"
              decoding="async"
            />
            <div v-else-if="item.error" class="page-error">
              <span>{{ item.error }}</span>
              <button type="button" @click.stop="retryPage(item.index)">Retry</button>
            </div>
            <div v-else class="scroll-placeholder">{{ item.index + 1 }}</div>
          </div>
        </div>

        <div v-else class="page-layer" :style="layerStyle">
          <div class="page-center">
            <div
              ref="pagesEl"
              class="pages-content"
              :class="{
                'pages-content--rtl': rtl,
                'pages-content--double': visiblePages.length > 1,
              }"
            >
              <div
                v-for="item in visiblePages"
                :key="item.index"
                class="page-slot"
                :style="slotStyle(item.index)"
              >
                <img
                  v-if="item.asset"
                  :src="item.asset.url"
                  alt=""
                  draggable="false"
                  @load="onImageLoad"
                />
                <div v-else-if="item.error" class="page-error">
                  <span>{{ item.error }}</span>
                  <button type="button" @click.stop="retryPage(item.index)">Retry</button>
                </div>
                <div v-else class="page-loading">
                  <span>{{ item.index + 1 }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="dragging" class="drop-overlay">Drop to open</div>

        <div v-if="showResume" class="resume" role="status">
          <span>Resumed at page {{ resumePage }}</span>
          <button type="button" @click="startOver">Start over</button>
          <button type="button" class="resume__close" aria-label="Dismiss" @click="showResume = false">
            ×
          </button>
        </div>
      </div>

      <div v-if="iosHintVisible" class="ios-hint" role="status">
        <span>Add to Home Screen to read without Safari's bars.</span>
        <button type="button" aria-label="Dismiss hint" @click="iosHintVisible = false">×</button>
      </div>

      <footer class="bottombar" :class="{ 'bottombar--hidden': !toolbarVisible }">
        <button type="button" class="nav" :disabled="index === 0" @click="prev">Prev</button>
        <input
          class="slider"
          type="range"
          min="0"
          :max="Math.max(0, pageCount - 1)"
          :value="index"
          aria-label="Page"
          @input="onSlider"
        />
        <span class="counter">{{ currentLabel }}</span>
        <button
          type="button"
          class="nav"
          :disabled="index >= pageCount - 1"
          @click="next"
        >
          Next
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.reader {
  position: relative;
  min-height: 420px;
  background: #0b0b0f;
  color: #f4f4f5;
}

/*
 * While a file is open the reader owns the viewport: the page header, copy and
 * footer stay where they are but are fully covered and stop taking part in the
 * layout visible to the user. svh keeps iOS from re-laying out as the address
 * bar collapses; browsers without svh fall back to the vh line above it.
 */
.reader--open {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100svh;
  min-height: 0;
  overscroll-behavior: none;
  background: #08080b;
}

.empty {
  display: grid;
  gap: 16px;
  place-items: center;
  min-height: 420px;
  padding: 22px;
  background:
    radial-gradient(560px 240px at 50% 0%, rgba(194, 65, 12, 0.18), transparent 70%),
    #0b0b0f;
}

.dropzone {
  width: min(640px, 100%);
  padding: 46px 24px;
  border: 1.5px dashed rgba(255, 255, 255, 0.22);
  border-radius: 16px;
  text-align: center;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.dropzone:hover {
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.03);
}

.kicker {
  margin: 0 0 10px;
  color: #fb923c;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.dropzone h2 {
  margin: 0;
  color: #fff;
  font-size: clamp(1.45rem, 3vw, 1.95rem);
  letter-spacing: -0.03em;
}

.dropzone p {
  max-width: 44ch;
  margin: 10px auto 0;
  color: rgba(245, 245, 247, 0.66);
  font-size: 14px;
  line-height: 1.6;
}

.open-button {
  min-height: 48px;
  margin-top: 22px;
  padding: 0 22px;
  border: 0;
  border-radius: 999px;
  background: #c2410c;
  color: #fff;
  font-weight: 650;
  box-shadow: 0 10px 24px -10px rgba(194, 65, 12, 0.8);
  transition: background 0.15s ease, transform 0.15s ease;
}

.open-button:hover:not(:disabled) {
  background: #9a3412;
  transform: translateY(-1px);
}

.open-button:disabled {
  cursor: progress;
  opacity: 0.7;
}

.dropzone .fine {
  margin-top: 16px;
  color: rgba(245, 245, 247, 0.52);
  font-size: 12px;
}

.error {
  margin: 0;
  padding: 10px 14px;
  border: 1px solid rgba(248, 113, 113, 0.35);
  border-radius: 10px;
  background: rgba(127, 29, 29, 0.25);
  color: #fecaca;
  font-size: 13px;
}

.viewer {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #08080b;
}

/*
 * The toolbar floats over the page instead of taking layout height. The
 * gradient is click-through so tapping near the top edge still reaches the
 * page-turn hot zones; only the controls themselves take pointer events.
 */
.toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 5;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: calc(10px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right)) 10px
    calc(12px + env(safe-area-inset-left));
  background: linear-gradient(to bottom, rgba(8, 8, 11, 0.94), rgba(8, 8, 11, 0));
  pointer-events: none;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.toolbar--hidden {
  opacity: 0;
  pointer-events: none;
  transform: translateY(-6px);
}

.toolbar--hidden .tools {
  pointer-events: none;
}

.tools {
  pointer-events: auto;
}

.meta {
  flex: 1 1 auto;
  min-width: 80px;
  max-width: 52%;
}

.meta strong {
  display: block;
  overflow: hidden;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta span {
  display: block;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.56);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tools {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  justify-content: flex-end;
}

.tool {
  flex: 0 0 auto;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.82);
  font-size: 12px;
  font-weight: 550;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease;
}

.tool--icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  padding: 0;
}

.tool--icon svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.tool--icon svg.dots {
  fill: currentColor;
  stroke: none;
}

.tool--zoom {
  min-width: 46px;
  padding: 0 8px;
  font-variant-numeric: tabular-nums;
}

.menu {
  position: relative;
  flex: 0 0 auto;
}

.menu__panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 6;
  min-width: 212px;
  max-height: min(68vh, 420px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  background: rgba(17, 17, 22, 0.98);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55);
}

.menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 38px;
  padding: 0 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: rgba(255, 255, 255, 0.86);
  font-size: 12px;
  font-weight: 550;
  text-align: left;
  white-space: nowrap;
}

.menu__item:hover,
.menu__item:focus-visible {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  outline: none;
}

.menu__item svg {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.menu__item span:first-of-type {
  flex: 1;
}

.menu__state {
  color: rgba(255, 255, 255, 0.62);
  font-size: 11px;
}

.menu__group {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.menu__label {
  margin: 0 0 4px;
  padding: 0 10px;
  color: rgba(255, 255, 255, 0.62);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.menu__row {
  display: flex;
  align-items: center;
  gap: 2px;
}

.menu__item--jump {
  min-height: 34px;
}

.menu__delete {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.62);
  font-size: 16px;
  line-height: 1;
}

.menu__delete:hover,
.menu__delete:focus-visible {
  background: rgba(248, 113, 113, 0.22);
  color: #fff;
  outline: none;
}

.tool:hover {
  background: rgba(255, 255, 255, 0.13);
  color: #fff;
}

.tool.active {
  border-color: rgba(251, 146, 60, 0.6);
  background: rgba(194, 65, 12, 0.3);
  color: #ffedd5;
}

.tool--accent {
  border-color: transparent;
  background: #c2410c;
  color: #fff;
}

.tool--accent:hover {
  background: #9a3412;
}

.stage {
  position: relative;
  flex: 1;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: grab;
}

.stage:active {
  cursor: grabbing;
}

.stage--scroll {
  overflow: auto;
  touch-action: pan-x pan-y;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  cursor: default;
  user-select: auto;
  -webkit-user-select: auto;
}

.stage--scroll:active {
  cursor: default;
}

.scroll-track {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: max-content;
  min-width: 100%;
  box-sizing: border-box;
  padding: calc(8px + env(safe-area-inset-top)) calc(8px + env(safe-area-inset-right))
    calc(64px + env(safe-area-inset-bottom)) calc(8px + env(safe-area-inset-left));
}

.scroll-page {
  position: relative;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 3px;
  background: #121216;
  box-shadow: 0 14px 46px rgba(0, 0, 0, 0.55);
}

.scroll-page img {
  display: block;
  width: 100%;
  height: auto;
}

.scroll-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: rgba(244, 244, 245, 0.5);
  font-size: 13px;
  letter-spacing: 0.08em;
}

.page-layer {
  position: absolute;
  inset: 0;
  transform-origin: 0 0;
  will-change: transform;
}

.page-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(8px + env(safe-area-inset-top)) calc(8px + env(safe-area-inset-right))
    calc(8px + env(safe-area-inset-bottom)) calc(8px + env(safe-area-inset-left));
}

.pages-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.pages-content--rtl {
  flex-direction: row-reverse;
}

.page-slot {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 3px;
  background: #121216;
  box-shadow: 0 14px 46px rgba(0, 0, 0, 0.55);
}

.page-slot img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.page-loading,
.page-error {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  padding: 12px;
  color: rgba(255, 255, 255, 0.52);
  font-size: 12px;
  text-align: center;
}

.page-error {
  gap: 10px;
  color: #fca5a5;
}

.page-error button {
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 12px;
}

.drop-overlay {
  position: absolute;
  inset: 12px;
  z-index: 4;
  display: grid;
  place-items: center;
  border: 2px dashed #fb923c;
  border-radius: 14px;
  background: rgba(194, 65, 12, 0.16);
  color: #ffedd5;
  font-weight: 650;
  pointer-events: none;
}

.resume {
  position: absolute;
  top: calc(58px + env(safe-area-inset-top));
  left: 50%;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: calc(100% - 24px);
  padding: 8px 10px 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: #1c1c22;
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  box-shadow: 0 12px 30px -12px rgba(0, 0, 0, 0.8);
  transform: translateX(-50%);
}

.resume button {
  padding: 4px 10px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 12px;
}

.resume button:hover {
  background: rgba(255, 255, 255, 0.18);
}

.resume .resume__close {
  padding: 2px 7px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 16px;
  line-height: 1;
}

.bottombar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px calc(12px + env(safe-area-inset-right)) calc(8px + env(safe-area-inset-bottom))
    calc(12px + env(safe-area-inset-left));
  background: linear-gradient(to top, rgba(11, 11, 15, 0.96), rgba(11, 11, 15, 0));
  pointer-events: none;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.bottombar > * {
  pointer-events: auto;
}

.bottombar--hidden {
  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;
}

.bottombar--hidden > * {
  pointer-events: none;
}

.ios-hint {
  position: absolute;
  top: calc(64px + env(safe-area-inset-top));
  left: 50%;
  z-index: 7;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: calc(100% - 32px);
  padding: 8px 8px 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background: rgba(28, 28, 34, 0.96);
  color: rgba(255, 255, 255, 0.86);
  font-size: 12px;
  box-shadow: 0 12px 30px -14px rgba(0, 0, 0, 0.9);
  transform: translateX(-50%);
}

.ios-hint button {
  padding: 0 6px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.62);
  font-size: 17px;
  line-height: 1;
}

.nav {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.82);
  font-size: 12px;
}

.nav:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.nav:disabled {
  cursor: default;
  opacity: 0.35;
}

.slider {
  flex: 1;
  min-width: 60px;
  accent-color: #f97316;
}

.counter {
  min-width: 96px;
  color: rgba(255, 255, 255, 0.66);
  font-size: 11px;
  text-align: center;
  white-space: nowrap;
}

@media (max-width: 720px) {
  .toolbar {
    gap: 6px;
    padding: calc(8px + env(safe-area-inset-top)) calc(10px + env(safe-area-inset-right)) 8px
      calc(10px + env(safe-area-inset-left));
  }

  .meta {
    max-width: 42%;
  }

  .meta span {
    display: none;
  }

  .tool {
    min-height: 32px;
    padding: 0 8px;
    font-size: 11px;
  }

  .tool--icon {
    width: 32px;
    padding: 0;
  }

  .tool--zoom {
    min-width: 42px;
    padding: 0 6px;
  }

  .counter {
    min-width: 72px;
    font-size: 10px;
  }

  .nav {
    padding: 0 9px;
  }
}
</style>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { fingerprint } from './core/fingerprint'
import { loadPageAsset } from './core/imageLoader'
import { readProgress, writeProgress, type ReadingMode } from './core/progress'
import { ReaderError, type PageAsset } from './core/types'
import { ZipPageSource } from './core/zipSource'

const props = defineProps<{ initialFile?: File | null }>()

const MAX_TOTAL_PIXELS = 32_000_000
const CONCURRENCY = 2
const MIN_SCALE = 1
const MAX_SCALE = 5
const STAGE_PAD_TOP = 54
const STAGE_PAD_X = 8
const SCROLL_WINDOW = 12

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
const showResume = ref(false)
const resumePage = ref(0)
const hasFullscreen = ref(false)
const fileFingerprint = ref('')

const assets = reactive(new Map<number, PageAsset>())
const pageErrors = reactive(new Map<number, string>())

const scrollWindowStart = ref(0)

const fileInput = ref<HTMLInputElement | null>(null)
const viewerEl = ref<HTMLElement | null>(null)
const stageEl = ref<HTMLElement | null>(null)
const pagesEl = ref<HTMLElement | null>(null)

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

const pointers = new Map<number, { x: number; y: number }>()
let panStart: { x: number; y: number; tx: number; ty: number } | null = null
let pinchStart: { distance: number; scale: number; tx: number; ty: number } | null = null
let tapStart: { x: number; y: number; time: number } | null = null
let lastTap: { x: number; y: number; time: number } | null = null
let wheelLock = 0
let scrollRaf: number | undefined
let shiftingScroll = false

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
  showResume.value = false
  resetZoom()
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
      const asset = await loadPageAsset(page, blob)
      if (gen !== generation) {
        URL.revokeObjectURL(asset.url)
        return
      }
      assets.set(page, asset)
      pageErrors.delete(page)
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
  const width = Math.max(120, stageW.value - STAGE_PAD_X * 2)
  const asset = assets.get(page)
  const ratio = asset && asset.width > 0 ? `${asset.width} / ${asset.height}` : '2 / 3'
  return {
    width: `${Math.round(width)}px`,
    aspectRatio: ratio,
  }
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
  if (!scroller || mode.value !== 'scroll' || shiftingScroll) return
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
  if (mode.value !== 'scroll' || scrollRaf) return
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

function resetZoom(): void {
  scale.value = 1
  tx.value = 0
  ty.value = 0
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
  resetZoom()
  mode.value = nextMode

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
  }, 350)
}

watch([index, mode, rtl], scheduleSave)

async function openFile(file: File): Promise<void> {
  if (busy.value) return
  busy.value = true
  error.value = ''
  await resetReader()
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

    ready.value = true
    await nextTick()
    measureStage()
    attachObserver()
    await ensurePages()
    if (mode.value === 'scroll') scrollPageToTop(index.value)
    else clampPan()
  } catch (value) {
    await resetReader()
    ready.value = false
    error.value = messageOf(value)
  } finally {
    busy.value = false
  }
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) void openFile(file)
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

  if (moved < 10 && Date.now() - start.time < 500) handleTap(event)
}

function onWheel(event: WheelEvent): void {
  if (!ready.value) return
  if (mode.value === 'scroll') return
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
      void toggleFullscreen()
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

function preventBrowserDrop(event: DragEvent): void {
  event.preventDefault()
}

let resizeObserver: ResizeObserver | null = null
let observedStage: HTMLElement | null = null

function attachObserver(): void {
  if (!resizeObserver) return
  const stage = stageEl.value
  if (!stage || stage === observedStage) return
  if (observedStage) resizeObserver.unobserve(observedStage)
  observedStage = stage
  resizeObserver.observe(stage)
}

watch(stageEl, () => {
  void nextTick().then(() => {
    attachObserver()
    measureStage()
  })
})

onMounted(async () => {
  hasFullscreen.value =
    typeof document !== 'undefined' &&
    typeof document.documentElement.requestFullscreen === 'function' &&
    !isIOS

  resizeObserver = new ResizeObserver(() => {
    measureStage()
    clampPan()
  })

  window.addEventListener('keydown', onKey)
  window.addEventListener('dragover', preventBrowserDrop)
  window.addEventListener('drop', preventBrowserDrop)

  if (props.initialFile) await openFile(props.initialFile)

  await nextTick()
  attachObserver()
  measureStage()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('dragover', preventBrowserDrop)
  window.removeEventListener('drop', preventBrowserDrop)
  resizeObserver?.disconnect()
  resizeObserver = null
  window.clearTimeout(saveTimer)
  window.clearTimeout(resumeTimer)
  window.clearTimeout(tapTimer)
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  void resetReader()
})
</script>

<template>
  <div
    class="reader"
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
        <div class="meta">
          <strong>{{ title || fileName }}</strong>
          <span>{{ fileName }} · {{ currentLabel }}</span>
        </div>
        <div class="tools">
          <button type="button" class="tool" @click="toggleMode" :title="`Reading mode: ${modeLabel}`">
            {{ modeLabel }}
          </button>
          <button
            v-if="mode !== 'scroll'"
            type="button"
            class="tool"
            :class="{ active: rtl }"
            @click="toggleRtl"
          >
            RTL
          </button>
          <button v-if="mode !== 'scroll'" type="button" class="tool" @click="resetZoom">
            {{ Math.round(scale * 100) }}%
          </button>
          <button v-if="hasFullscreen" type="button" class="tool" @click="toggleFullscreen">
            Full
          </button>
          <button type="button" class="tool tool--accent" @click="pickFile">Open</button>
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

      <footer class="bottombar">
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
  color: rgba(245, 245, 247, 0.4);
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
  display: flex;
  flex-direction: column;
  height: clamp(460px, 74vh, 840px);
  background: #08080b;
}

.toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: linear-gradient(to bottom, rgba(8, 8, 11, 0.94), rgba(8, 8, 11, 0));
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.toolbar--hidden {
  opacity: 0;
  pointer-events: none;
  transform: translateY(-6px);
}

.meta {
  min-width: 0;
  flex: 1;
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
  color: rgba(255, 255, 255, 0.45);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tools {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.tool {
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.82);
  font-size: 12px;
  font-weight: 550;
  transition: background 0.15s ease, color 0.15s ease;
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
  overflow-x: hidden;
  overflow-y: auto;
  touch-action: pan-y;
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
  padding: 56px 8px 84px;
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
  color: rgba(244, 244, 245, 0.32);
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
  padding: 54px 8px 8px;
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
  color: rgba(255, 255, 255, 0.38);
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
  top: 58px;
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
  color: rgba(255, 255, 255, 0.45);
  font-size: 16px;
  line-height: 1;
}

.bottombar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: #0b0b0f;
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
  .viewer {
    height: clamp(420px, 70vh, 700px);
  }

  .toolbar {
    gap: 8px;
    padding: 8px 10px;
  }

  .meta span {
    display: none;
  }

  .tool {
    min-height: 30px;
    padding: 0 8px;
    font-size: 11px;
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

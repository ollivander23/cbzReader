import {
  clearShelf,
  readArchiveCopy,
  readShelf,
  removeEntry,
  type ShelfEntry,
} from '../reader/core/library'
import { translate } from '../i18n'
import { track } from '../lib/track'

const isIOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

function modeLabel(mode: string): string {
  if (mode === 'double') return translate('shelf.modeDouble')
  if (mode === 'scroll') return translate('shelf.modeScroll')
  return translate('shelf.modeSingle')
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return translate('shelf.justNow')
  if (diff < hour) return translate('shelf.minutesAgo', { count: Math.max(1, Math.round(diff / minute)) })
  if (diff < day) return translate('shelf.hoursAgo', { count: Math.round(diff / hour) })
  if (diff < 7 * day) return translate('shelf.daysAgo', { count: Math.round(diff / day) })
  return new Date(timestamp).toLocaleDateString()
}

/**
 * Fills the static "Recently opened" section. The markup is prerendered, so
 * this only runs in the browser and simply leaves the section hidden when the
 * shelf is empty.
 */
export function mountRecentShelf(startReader: (file: File) => void): void {
  const section = document.getElementById('recent-shelf')
  const list = section?.querySelector<HTMLElement>('[data-recent-list]')
  const hint = section?.querySelector<HTMLElement>('[data-recent-hint]')
  const clearButton = section?.querySelector<HTMLButtonElement>('[data-recent-clear]')
  if (!section || !list || !hint || !clearButton) return
  const shelf = section
  const shelfList = list
  const shelfHint = hint
  const clearAll = clearButton

  const picker = document.createElement('input')
  picker.type = 'file'
  picker.hidden = true
  picker.accept = isIOS
    ? '*/*'
    : '.cbz,.zip,application/vnd.comicbook+zip,application/zip,application/x-cbz'
  document.body.appendChild(picker)

  let pending: ShelfEntry | null = null

  picker.addEventListener('change', () => {
    const file = picker.files?.[0]
    picker.value = ''
    if (!file) return
    if (pending && file.name !== pending.name) {
      showHint(
        translate('shelf.wrongFile', {
          picked: file.name,
          expected: pending.name,
          page: pending.index + 1,
        }),
      )
    }
    pending = null
    startReader(file)
  })

  function showHint(text: string): void {
    shelfHint.textContent = text
    shelfHint.hidden = !text
  }

  async function openEntry(entry: ShelfEntry): Promise<void> {
    showHint('')
    if (entry.copy) {
      const blob = await readArchiveCopy(entry.id)
      if (blob) {
        track('resume_accept')
        startReader(
          new File([blob], entry.name, {
            type: 'application/vnd.comicbook+zip',
            lastModified: entry.lastModified,
          }),
        )
        return
      }
      // The stored copy was evicted or the quota refused it: fall through to the picker.
    }
    pending = entry
    track('resume_decline')
    showHint(
      translate('shelf.tooLarge', {
        name: entry.name,
        page: entry.index + 1,
      }),
    )
    picker.click()
  }

  function buildCard(entry: ShelfEntry): HTMLElement {
    const item = document.createElement('li')
    item.className = 'shelf__item'

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'shelf__card'
    button.addEventListener('click', () => void openEntry(entry))

    if (entry.cover) {
      const cover = document.createElement('img')
      cover.className = 'shelf__cover'
      cover.src = entry.cover
      cover.alt = ''
      cover.loading = 'lazy'
      button.appendChild(cover)
    } else {
      const cover = document.createElement('span')
      cover.className = 'shelf__cover shelf__cover--empty'
      cover.textContent = String(entry.pageCount)
      button.appendChild(cover)
    }

    const body = document.createElement('span')
    body.className = 'shelf__body'

    const name = document.createElement('span')
    name.className = 'shelf__name'
    name.textContent = entry.name
    name.title = entry.name

    const meta = document.createElement('span')
    meta.className = 'shelf__meta'
    meta.textContent = translate('shelf.meta', {
      pages: entry.pageCount,
      mode: modeLabel(entry.mode),
      page: entry.index + 1,
    })

    const time = document.createElement('span')
    time.className = 'shelf__time'
    time.textContent = formatTime(entry.updatedAt)

    body.append(name, meta, time)
    button.appendChild(body)

    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'shelf__delete'
    remove.setAttribute('aria-label', translate('shelf.remove', { name: entry.name }))
    remove.textContent = '×'
    remove.addEventListener('click', (event) => {
      event.stopPropagation()
      void removeEntry(entry.id).then(render)
    })

    item.append(button, remove)
    return item
  }

  async function render(): Promise<void> {
    const entries = await readShelf()
    shelfList.textContent = ''
    for (const entry of entries) shelfList.appendChild(buildCard(entry))
    shelf.hidden = entries.length === 0
    clearAll.hidden = entries.length === 0
    if (entries.length === 0) showHint('')
  }

  clearAll.addEventListener('click', () => {
    if (!window.confirm(translate('shelf.clearConfirm'))) return
    void clearShelf().then(render)
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void render()
  })

  void render()
}

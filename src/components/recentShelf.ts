import {
  clearShelf,
  readArchiveCopy,
  readShelf,
  removeEntry,
  type ShelfEntry,
} from '../reader/core/library'

const isIOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

const MODE_LABELS: Record<string, string> = {
  single: 'Single page',
  double: 'Two pages',
  scroll: 'Continuous',
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return 'just now'
  if (diff < hour) return `${Math.max(1, Math.round(diff / minute))} min ago`
  if (diff < day) return `${Math.round(diff / hour)} h ago`
  if (diff < 7 * day) return `${Math.round(diff / day)} d ago`
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
        `That was “${file.name}”. Pick “${pending.name}” again to return to page ${pending.index + 1}.`,
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
    showHint(
      `This file is too large to keep a copy (or its copy was cleared). Pick “${entry.name}” again and reading resumes at page ${entry.index + 1}.`,
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
    meta.textContent = `${entry.pageCount} pages · ${
      MODE_LABELS[entry.mode] ?? MODE_LABELS.single
    } · page ${entry.index + 1}`

    const time = document.createElement('span')
    time.className = 'shelf__time'
    time.textContent = formatTime(entry.updatedAt)

    body.append(name, meta, time)
    button.appendChild(body)

    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'shelf__delete'
    remove.setAttribute('aria-label', `Remove ${entry.name} from recently opened`)
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
    if (!window.confirm('Remove every recent file, stored copy and bookmark?')) return
    void clearShelf().then(render)
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void render()
  })

  void render()
}

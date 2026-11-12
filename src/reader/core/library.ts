import { del, get, set } from 'idb-keyval'
import type { ReadingMode } from './progress'

/**
 * The "library" is everything the reader remembers about a file between visits:
 * recent entries, an optional copy of the archive, and the bookmarks.
 * iOS cannot reopen a file the user picked before, so the copy is what makes
 * one-tap resume possible - only for archives small enough to be worth it.
 */
export interface ShelfEntry {
  id: string
  name: string
  pageCount: number
  index: number
  mode: ReadingMode
  rtl: boolean
  size: number
  lastModified: number
  updatedAt: number
  cover?: string
  /** True when a full copy of the archive is stored and resume needs no picker. */
  copy: boolean
}

export interface Bookmark {
  page: number
  createdAt: number
}

const SHELF_KEY = 'cbz-reader:shelf'
const FILE_PREFIX = 'cbz-reader:file:'
const BOOKMARK_PREFIX = 'cbz-reader:bookmarks:'

export const MAX_SHELF_ENTRIES = 12
/** Above this size a stored copy would eat the origin's storage quota. */
export const COPY_LIMIT = 32 * 1024 * 1024
/** Keep resume copies for the few most recent small archives only. */
const MAX_COPIES = 3

function fileKey(id: string): string {
  return FILE_PREFIX + id
}

function bookmarkKey(id: string): string {
  return BOOKMARK_PREFIX + id
}

export async function readShelf(): Promise<ShelfEntry[]> {
  try {
    const value = await get<ShelfEntry[]>(SHELF_KEY)
    if (!Array.isArray(value)) return []
    return value
      .filter((entry) => entry && typeof entry.id === 'string' && entry.pageCount > 0)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

async function writeShelf(entries: ShelfEntry[]): Promise<void> {
  try {
    await set(SHELF_KEY, entries.slice(0, MAX_SHELF_ENTRIES))
  } catch {
    // Private mode or a full quota: reading still works without a shelf.
  }
}

/**
 * Every shelf change is read-modify-write, so concurrent updates (page save,
 * cover capture, copy completion) must not interleave or they overwrite each
 * other. All mutations run through this queue.
 */
let mutationChain: Promise<unknown> = Promise.resolve()

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = mutationChain.then(task, task)
  mutationChain = run.catch(() => undefined)
  return run
}

export async function findEntry(id: string): Promise<ShelfEntry | null> {
  const entries = await readShelf()
  return entries.find((entry) => entry.id === id) ?? null
}

/**
 * Record a freshly opened archive on the shelf. Resolves once the entry is
 * written; the (potentially large) copy continues in the background.
 */
export async function rememberArchive(
  file: File,
  id: string,
  meta: Pick<ShelfEntry, 'pageCount' | 'index' | 'mode' | 'rtl'>,
): Promise<void> {
  const entry: ShelfEntry = {
    id,
    name: file.name,
    pageCount: meta.pageCount,
    index: meta.index,
    mode: meta.mode,
    rtl: meta.rtl,
    size: file.size,
    lastModified: file.lastModified,
    updatedAt: Date.now(),
    copy: false,
  }
  await saveEntry(entry)
  if (!canStoreCopy(file.size)) return

  void storeArchiveCopy(entry, file).then((stored) => {
    if (stored) void markCopyStored(entry.id)
  })
}

/** Insert or update an entry, keeping the newest first and trimming old ones. */
export function saveEntry(entry: ShelfEntry): Promise<void> {
  return serialize(async () => {
    const entries = await readShelf()
    const previous = entries.find((item) => item.id === entry.id)
    const merged: ShelfEntry = { ...previous, ...entry, cover: entry.cover ?? previous?.cover }

    const next = [merged, ...entries.filter((item) => item.id !== entry.id)]
    const kept = next.slice(0, MAX_SHELF_ENTRIES)
    const dropped = next.slice(MAX_SHELF_ENTRIES)
    await writeShelf(kept)

    for (const item of dropped) {
      await dropArchiveCopy(item.id)
    }
    // Only the newest few archives keep a full copy.
    for (const item of kept.filter((candidate) => candidate.copy).slice(MAX_COPIES)) {
      await dropArchiveCopy(item.id)
    }
  })
}

export function touchEntry(
  id: string,
  patch: Pick<ShelfEntry, 'index' | 'mode' | 'rtl'> & { updatedAt?: number },
): Promise<void> {
  return serialize(async () => {
    const entries = await readShelf()
    const entry = entries.find((item) => item.id === id)
    if (!entry) return
    entry.index = patch.index
    entry.mode = patch.mode
    entry.rtl = patch.rtl
    entry.updatedAt = patch.updatedAt ?? Date.now()
    await writeShelf([entry, ...entries.filter((item) => item.id !== id)])
  })
}

/**
 * Flag one entry as having a stored copy. Deliberately narrow: writing back the
 * whole entry captured when the file was opened would roll the reading position
 * back to that moment, and would resurrect an entry the user removed (or whose
 * shelf was cleared) while the copy was still being stored.
 */
export function markCopyStored(id: string): Promise<void> {
  return serialize(async () => {
    const entries = await readShelf()
    const entry = entries.find((item) => item.id === id)
    if (!entry) {
      // Gone in the meantime: drop the orphan blob instead of reviving the entry.
      await dropArchiveCopy(id)
      return
    }
    entry.copy = true
    await writeShelf(entries)
  })
}

export function setCover(id: string, cover: string): Promise<void> {
  return serialize(async () => {
    const entries = await readShelf()
    const entry = entries.find((item) => item.id === id)
    if (!entry) return
    entry.cover = cover
    await writeShelf(entries)
  })
}

export function removeEntry(id: string): Promise<void> {
  return serialize(async () => {
    const entries = await readShelf()
    await writeShelf(entries.filter((entry) => entry.id !== id))
    await dropArchiveCopy(id)
    await clearBookmarks(id)
  })
}

export function clearShelf(): Promise<void> {
  return serialize(async () => {
    const entries = await readShelf()
    await writeShelf([])
    for (const entry of entries) {
      await dropArchiveCopy(entry.id)
      await clearBookmarks(entry.id)
    }
  })
}

function canStoreCopy(size: number): boolean {
  return size > 0 && size <= COPY_LIMIT
}

/** Store a copy for one-tap resume. Returns false when the quota refuses it. */
export async function storeArchiveCopy(entry: ShelfEntry, blob: Blob): Promise<boolean> {
  if (!canStoreCopy(entry.size)) return false
  try {
    await set(fileKey(entry.id), blob)
    return true
  } catch {
    return false
  }
}

export async function readArchiveCopy(id: string): Promise<Blob | null> {
  try {
    const blob = await get<Blob>(fileKey(id))
    return blob instanceof Blob && blob.size > 0 ? blob : null
  } catch {
    return null
  }
}

async function dropArchiveCopy(id: string): Promise<void> {
  try {
    await del(fileKey(id))
  } catch {
    // Nothing to clean up.
  }
  const entries = await readShelf()
  const entry = entries.find((item) => item.id === id)
  if (entry?.copy) {
    entry.copy = false
    await writeShelf(entries)
  }
}

export async function readBookmarks(id: string): Promise<Bookmark[]> {
  try {
    const value = await get<Bookmark[]>(bookmarkKey(id))
    if (!Array.isArray(value)) return []
    return value
      .filter((item) => item && Number.isFinite(item.page))
      .sort((a, b) => a.page - b.page)
  } catch {
    return []
  }
}

export async function writeBookmarks(id: string, bookmarks: Bookmark[]): Promise<void> {
  try {
    if (bookmarks.length === 0) await del(bookmarkKey(id))
    else await set(bookmarkKey(id), bookmarks)
  } catch {
    // Bookmarks are a convenience; never block reading.
  }
}

async function clearBookmarks(id: string): Promise<void> {
  try {
    await del(bookmarkKey(id))
  } catch {
    // Already gone.
  }
}

const COVER_WIDTH = 168
const COVER_QUALITY = 0.7

/**
 * A tiny JPEG data URL of the first page. Kept small on purpose: dozens of
 * covers already cost storage, and the shelf shows them at 56px wide.
 */
export function renderCover(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      try {
        const ratio = Math.min(1, COVER_WIDTH / image.naturalWidth)
        const width = Math.max(1, Math.round(image.naturalWidth * ratio))
        const height = Math.max(1, Math.round(image.naturalHeight * ratio))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (!context) {
          resolve(null)
          return
        }
        context.drawImage(image, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', COVER_QUALITY))
      } catch {
        resolve(null)
      }
    }
    image.onerror = () => resolve(null)
    image.src = url
  })
}

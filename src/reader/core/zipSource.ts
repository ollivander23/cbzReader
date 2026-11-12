import { BlobReader, BlobWriter, TextWriter, ZipReader } from '@zip.js/zip.js'
import { translate } from '../../i18n'
import { baseName, comparePagePaths, dirName } from './naturalSort'
import { ReaderError } from './types'

interface ZipEntry {
  filename: string
  directory: boolean
  encrypted?: boolean
  uncompressedSize?: number
  getData<T>(writer: BlobWriter | TextWriter): Promise<T>
}

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|bmp)$/i
const SKIP_RE = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db)(\/|$)/i
/** A single page above this is a broken archive or a zip bomb, not a comic. */
const MAX_PAGE_BYTES = 64 * 1024 * 1024

function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase()
}

// CBR/CB7 fail inside the ZIP parser with an unhelpful low-level error, so the
// message names the container the user actually picked and gives a next step.
function unsupportedMessage(fileName: string): string | null {
  const ext = fileExtension(fileName)
  if (ext === 'cbr' || ext === 'rar') {
    return translate('errors.unsupportedCbr')
  }
  if (ext === 'cb7' || ext === '7z') {
    return translate('errors.unsupportedCb7')
  }
  return null
}

function notZipMessage(fileName: string): string {
  return unsupportedMessage(fileName) ?? translate('errors.notZip')
}

function mimeFor(name: string): string {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'avif':
      return 'image/avif'
    case 'bmp':
      return 'image/bmp'
    default:
      return 'application/octet-stream'
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function readTag(xml: string, tag: string): string {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(xml)
  if (!match) return ''
  return decodeEntities(match[1]).trim()
}

function readAttr(tag: string, name: string): string {
  const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(tag)
  if (!match) return ''
  return decodeEntities(match[2] ?? match[3] ?? '').trim()
}

export interface TocEntry {
  title: string
  page: number
}

/** Chapter bookmarks from ComicInfo's PageList; `Image` is a 0-based page index. */
function readPageList(xml: string): TocEntry[] {
  const block = /<PageList[^>]*>([\s\S]*?)<\/PageList>/i.exec(xml)
  if (!block) return []
  const entries: TocEntry[] = []
  const pageRe = /<Page(?:\s[^>]*)?\/?>/gi
  let match: RegExpExecArray | null
  while ((match = pageRe.exec(block[1]))) {
    const title = readAttr(match[0], 'Bookmark')
    const page = Number.parseInt(readAttr(match[0], 'Image'), 10)
    if (!title || !Number.isInteger(page)) continue
    entries.push({ title, page })
  }
  return entries
}

/**
 * macOS writes an AppleDouble sidecar (._page.jpg) next to every extracted file.
 * It matches the image extension, sorts before the real page and decodes into
 * garbage, so it has to be dropped before the page list is built. A zero-length
 * entry is dropped for the same reason: it can only ever be a broken page.
 */
function isPageEntry(entry: ZipEntry): boolean {
  if (entry.directory || entry.encrypted) return false
  if (!IMAGE_RE.test(entry.filename) || SKIP_RE.test(entry.filename)) return false
  if (baseName(entry.filename).startsWith('._')) return false
  if (typeof entry.uncompressedSize === 'number' && entry.uncompressedSize === 0) return false
  return true
}

/**
 * One TOC item per folder, pointing at that folder's first page. A single
 * folder (or a flat archive) yields no TOC: wrapping every page in one group
 * would be a fake table of contents.
 */
function folderToc(images: ZipEntry[]): TocEntry[] {
  const folders = new Map<string, TocEntry>()
  images.forEach((entry, page) => {
    const folder = dirName(entry.filename)
    if (folders.has(folder)) return
    folders.set(folder, { title: folder || translate('errors.topLevel'), page })
  })
  return folders.size >= 2 ? [...folders.values()] : []
}

export interface ArchiveInfo {
  pageCount: number
  title: string
  series: string
  number: string
  summary: string
  toc: TocEntry[]
  rtl: boolean
}

export class ZipPageSource {
  private constructor(
    private readonly reader: { close: () => Promise<void> },
    private readonly entries: ZipEntry[],
    readonly info: ArchiveInfo,
  ) {}

  static async open(file: File): Promise<ZipPageSource> {
    let reader: ZipReader<unknown>
    try {
      reader = new ZipReader(new BlobReader(file))
    } catch {
      throw new ReaderError('not-zip', notZipMessage(file.name))
    }

    let entries: ZipEntry[]
    try {
      entries = (await reader.getEntries()) as unknown as ZipEntry[]
    } catch {
      await reader.close().catch(() => undefined)
      throw new ReaderError('not-zip', notZipMessage(file.name))
    }

    const encryptedImages = entries.filter(
      (entry) => !entry.directory && entry.encrypted && IMAGE_RE.test(entry.filename),
    )
    const images = entries
      .filter((entry) => isPageEntry(entry))
      .sort((a, b) => comparePagePaths(a.filename, b.filename))

    if (images.length === 0) {
      await reader.close().catch(() => undefined)
      if (encryptedImages.length > 0) {
        throw new ReaderError(
          'encrypted',
          translate('errors.encrypted'),
        )
      }
      throw new ReaderError('no-images', translate('errors.noImages'))
    }

    let rtl = false
    let title = ''
    let series = ''
    let number = ''
    let summary = ''
    let comicPageCount = 0
    let bookmarks: TocEntry[] = []

    const comicInfo = entries.find(
      (entry) => !entry.directory && /(^|\/)ComicInfo\.xml$/i.test(entry.filename),
    )
    if (comicInfo) {
      try {
        const xml = await comicInfo.getData<string>(new TextWriter())
        rtl = /yesandrighttoleft/i.test(readTag(xml, 'Manga'))
        series = readTag(xml, 'Series')
        number = readTag(xml, 'Number')
        summary = readTag(xml, 'Summary')
        // Title wins outright; otherwise fall back to "Series #Number" and let
        // the caller use the file name when neither tag is present.
        title = readTag(xml, 'Title') || (series ? (number ? `${series} #${number}` : series) : '')
        comicPageCount = Number.parseInt(readTag(xml, 'PageCount'), 10) || 0
        bookmarks = readPageList(xml)
          .filter((entry) => entry.page >= 0 && entry.page < images.length)
          .sort((a, b) => a.page - b.page)
      } catch {
        // ComicInfo is optional; a malformed file should not block reading.
      }
    }

    return new ZipPageSource(reader, images, {
      // The image entries are the source of truth; PageCount only fills in when
      // the archive exposes no readable images.
      pageCount: images.length || comicPageCount,
      title,
      series,
      number,
      summary,
      // Curated chapter bookmarks beat folder names; folders are the fallback
      // only when the pages actually live in more than one directory.
      toc: bookmarks.length > 0 ? bookmarks : folderToc(images),
      rtl,
    })
  }

  async getPage(index: number): Promise<Blob> {
    const entry = this.entries[index]
    if (!entry) {
      throw new ReaderError('unknown', translate('errors.missingPage'))
    }
    // Refuse before reading: a page that declares more than MAX_PAGE_BYTES is a
    // broken or hostile archive, and allocating it would take the tab down.
    if (typeof entry.uncompressedSize === 'number' && entry.uncompressedSize > MAX_PAGE_BYTES) {
      throw new ReaderError('image', translate('errors.decode'))
    }
    try {
      const blob = await entry.getData<Blob>(new BlobWriter(mimeFor(entry.filename)))
      if (!blob || blob.size === 0) throw new Error('Empty page')
      return blob
    } catch {
      throw new ReaderError('image', translate('errors.decode'))
    }
  }

  async dispose(): Promise<void> {
    try {
      await this.reader.close()
    } catch {
      // Closing an already-closed archive is harmless.
    }
  }
}

import { BlobReader, BlobWriter, TextWriter, ZipReader } from '@zip.js/zip.js'
import { baseName, naturalCompare } from './naturalSort'
import { ReaderError } from './types'

interface ZipEntry {
  filename: string
  directory: boolean
  encrypted?: boolean
  getData<T>(writer: BlobWriter | TextWriter): Promise<T>
}

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|bmp)$/i
const SKIP_RE = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db)(\/|$)/i

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

function readTag(xml: string, tag: string): string {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(xml)
  if (!match) return ''
  return match[1]
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}

export interface ArchiveInfo {
  pageCount: number
  title: string
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
      throw new ReaderError('not-zip', 'This file is not a valid CBZ or ZIP archive.')
    }

    let entries: ZipEntry[]
    try {
      entries = (await reader.getEntries()) as unknown as ZipEntry[]
    } catch {
      await reader.close().catch(() => undefined)
      throw new ReaderError('not-zip', 'This file is not a valid CBZ or ZIP archive.')
    }

    const encryptedImages = entries.filter(
      (entry) => !entry.directory && entry.encrypted && IMAGE_RE.test(entry.filename),
    )
    const images = entries
      .filter(
        (entry) =>
          !entry.directory &&
          !entry.encrypted &&
          IMAGE_RE.test(entry.filename) &&
          !SKIP_RE.test(entry.filename),
      )
      .sort(
        (a, b) =>
          naturalCompare(baseName(a.filename), baseName(b.filename)) ||
          naturalCompare(a.filename, b.filename),
      )

    if (images.length === 0) {
      await reader.close().catch(() => undefined)
      if (encryptedImages.length > 0) {
        throw new ReaderError(
          'encrypted',
          'This archive is password-protected. Remove the password and try again.',
        )
      }
      throw new ReaderError('no-images', 'No readable images were found in this archive.')
    }

    let rtl = false
    let title = stripExtension(file.name)

    const comicInfo = entries.find(
      (entry) => !entry.directory && /(^|\/)ComicInfo\.xml$/i.test(entry.filename),
    )
    if (comicInfo) {
      try {
        const xml = await comicInfo.getData<string>(new TextWriter())
        rtl = /yesandrighttoleft/i.test(readTag(xml, 'Manga'))
        const series = readTag(xml, 'Series')
        const number = readTag(xml, 'Number')
        if (series) title = number ? `${series} #${number}` : series
      } catch {
        // ComicInfo is optional; a malformed file should not block reading.
      }
    }

    return new ZipPageSource(reader, images, {
      pageCount: images.length,
      title,
      rtl,
    })
  }

  async getPage(index: number): Promise<Blob> {
    const entry = this.entries[index]
    if (!entry) {
      throw new ReaderError('unknown', 'That page is not in this archive.')
    }
    try {
      const blob = await entry.getData<Blob>(new BlobWriter(mimeFor(entry.filename)))
      if (!blob || blob.size === 0) throw new Error('Empty page')
      return blob
    } catch {
      throw new ReaderError('image', 'This page could not be decoded.')
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

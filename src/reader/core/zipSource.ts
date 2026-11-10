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

function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase()
}

// CBR/CB7 fail inside the ZIP parser with an unhelpful low-level error, so the
// message names the container the user actually picked and gives a next step.
function unsupportedMessage(fileName: string): string | null {
  const ext = fileExtension(fileName)
  if (ext === 'cbr' || ext === 'rar') {
    return 'CBR (RAR) archives are not supported yet. Convert the file to CBZ first: extract the page images, then re-zip them as a .cbz file. Renaming a .cbr to .cbz is not enough, because the container inside is still RAR.'
  }
  if (ext === 'cb7' || ext === '7z') {
    return 'CB7 (7z) archives are not supported yet. Convert the file to CBZ first: extract the page images and re-pack them as a .cbz file, then open that archive instead.'
  }
  return null
}

function notZipMessage(fileName: string): string {
  return (
    unsupportedMessage(fileName) ??
    'This file could not be read as a CBZ or ZIP archive. If it came from a CBR (RAR) or CB7 (7z) file, convert it to CBZ first and try again.'
  )
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

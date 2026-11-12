import {
  BlobReader,
  BlobWriter,
  TextReader,
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipReader,
  ZipWriter,
} from '@zip.js/zip.js'
import { baseName, comparePagePaths } from '../reader/core/naturalSort'

/**
 * CBZ -> fixed-layout EPUB 3.
 *
 * An EPUB is a ZIP with a very specific shape, so no new dependency is needed:
 * zip.js already writes ZIPs. Nothing here decodes an image - page bytes are
 * copied into the EPUB unchanged, exactly like the PDF converter keeps JPEG
 * pages intact. That is what makes this fast enough to run in a tab, and why it
 * works on scans the browser would refuse to draw in a canvas.
 *
 * Fixed layout is the right model for comics: one XHTML page per image, each
 * with its own viewport, so a reader shows one page at a time instead of trying
 * to reflow artwork.
 */

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|bmp)$/i
const SKIP_RE = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db)(\/|$)/i
const MEDIA_WEBP = 'image/webp'
/** A page bigger than this is a broken archive, not a comic. */
const MAX_PAGE_BYTES = 96 * 1024 * 1024

export type EpubReason = 'not-zip' | 'no-images' | 'memory' | 'cancelled' | 'unknown'

export class EpubError extends Error {
  readonly reason: EpubReason

  constructor(reason: EpubReason, message: string) {
    super(message)
    this.reason = reason
  }
}

export interface EpubOptions {
  /** Used for the title when ComicInfo.xml has none. */
  fileName?: string
  /** Overrides the ComicInfo title. */
  title?: string
  author?: string
  language?: string
  /** Right-to-left page progression. Defaults to the ComicInfo Manga hint. */
  rtl?: boolean
  signal?: AbortSignal
  onProgress?: (done: number, total: number) => void
}

export interface EpubResult {
  blob: Blob
  pages: number
  title: string
}

interface ZipEntry {
  filename: string
  directory: boolean
  encrypted?: boolean
  uncompressedSize?: number
  getData<T>(writer: unknown): Promise<T>
}

interface ComicInfo {
  title: string
  series: string
  number: string
  writer: string
  language: string
  rtl: boolean
}

const EMPTY_INFO: ComicInfo = { title: '', series: '', number: '', writer: '', language: '', rtl: false }

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
}

function mimeOf(name: string): string {
  switch (extensionOf(name)) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return MEDIA_WEBP
    case 'avif':
      return 'image/avif'
    case 'bmp':
      return 'image/bmp'
    default:
      return 'application/octet-stream'
  }
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** AppleDouble sidecars and empty entries can only ever be broken pages. */
function isPageEntry(entry: ZipEntry): boolean {
  if (entry.directory || entry.encrypted) return false
  if (!IMAGE_RE.test(entry.filename) || SKIP_RE.test(entry.filename)) return false
  if (baseName(entry.filename).startsWith('._')) return false
  if (typeof entry.uncompressedSize === 'number' && entry.uncompressedSize === 0) return false
  return true
}

// ---------------------------------------------------------------------------
// Pixel dimensions straight from the file header.
// A fixed-layout page needs a viewport, and reading two integers from the header
// is far cheaper than decoding the image (or drawing it into a canvas).
// ---------------------------------------------------------------------------

function jpegSize(bytes: Uint8Array): [number, number] | null {
  let i = 2
  while (i + 8 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i += 1
      continue
    }
    const marker = bytes[i + 1]
    if (marker === 0xff) {
      i += 1
      continue
    }
    // Standalone markers carry no length field.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      i += 2
      continue
    }
    const length = (bytes[i + 2] << 8) | bytes[i + 3]
    if (length < 2) return null
    // SOF0..SOF15 except DHT (c4), JPG (c8) and DAC (cc) carry the dimensions.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = (bytes[i + 5] << 8) | bytes[i + 6]
      const width = (bytes[i + 7] << 8) | bytes[i + 8]
      return width > 0 && height > 0 ? [width, height] : null
    }
    i += 2 + length
  }
  return null
}

function pngSize(bytes: Uint8Array): [number, number] | null {
  if (bytes.length < 24) return null
  const read = (offset: number): number =>
    ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0
  const width = read(16)
  const height = read(20)
  return width > 0 && height > 0 ? [width, height] : null
}

function gifSize(bytes: Uint8Array): [number, number] | null {
  if (bytes.length < 10) return null
  const width = bytes[6] | (bytes[7] << 8)
  const height = bytes[8] | (bytes[9] << 8)
  return width > 0 && height > 0 ? [width, height] : null
}

function bmpSize(bytes: Uint8Array): [number, number] | null {
  if (bytes.length < 26) return null
  const readInt = (offset: number): number =>
    bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)
  const width = Math.abs(readInt(18))
  const height = Math.abs(readInt(22))
  return width > 0 && height > 0 ? [width, height] : null
}

function webpSize(bytes: Uint8Array): [number, number] | null {
  if (bytes.length < 30) return null
  const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15])
  if (chunk === 'VP8X') {
    const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16))
    const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16))
    return [width, height]
  }
  if (chunk === 'VP8L') {
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24)
    return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)]
  }
  if (chunk === 'VP8 ') {
    const width = (bytes[26] | (bytes[27] << 8)) & 0x3fff
    const height = (bytes[28] | (bytes[29] << 8)) & 0x3fff
    return width > 0 && height > 0 ? [width, height] : null
  }
  return null
}

function imageSize(bytes: Uint8Array, mime: string): [number, number] | null {
  try {
    if (mime === 'image/jpeg') return jpegSize(bytes)
    if (mime === 'image/png') return pngSize(bytes)
    if (mime === 'image/gif') return gifSize(bytes)
    if (mime === 'image/bmp') return bmpSize(bytes)
    if (mime === MEDIA_WEBP) return webpSize(bytes)
  } catch {
    // A truncated header is not worth failing the whole conversion over.
  }
  return null
}

// ---------------------------------------------------------------------------
// ComicInfo.xml: same tags the reader trusts, read without an XML parser.
// ---------------------------------------------------------------------------

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
}

function readTag(xml: string, tag: string): string {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(xml)
  return match ? decodeEntities(match[1]).trim() : ''
}

function parseComicInfo(xml: string): ComicInfo {
  const series = readTag(xml, 'Series')
  const number = readTag(xml, 'Number')
  const title = readTag(xml, 'Title') || (series ? (number ? `${series} #${number}` : series) : '')
  return {
    title,
    series,
    number,
    writer: readTag(xml, 'Writer'),
    language: readTag(xml, 'LanguageISO'),
    rtl: /yesandrighttoleft/i.test(readTag(xml, 'Manga')),
  }
}

// ---------------------------------------------------------------------------
// EPUB scaffolding
// ---------------------------------------------------------------------------

function containerXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`
}

function pageXhtml(
  page: number,
  imageHref: string,
  width: number,
  height: number,
  language: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${xmlEscape(language)}" lang="${xmlEscape(language)}">
<head>
  <meta charset="utf-8"/>
  <title>Page ${page}</title>
  <meta name="viewport" content="width=${width}, height=${height}"/>
  <style>html,body{margin:0;padding:0;height:100%;background:#000}img{display:block;width:100%;height:100%;object-fit:contain}</style>
</head>
<body>
  <img src="${imageHref}" alt="Page ${page}"/>
</body>
</html>
`
}

function navXhtml(entries: { href: string; label: string }[], language: string): string {
  const items = entries
    .map((entry) => `      <li><a href="${entry.href}">${xmlEscape(entry.label)}</a></li>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${xmlEscape(language)}" lang="${xmlEscape(language)}">
<head><meta charset="utf-8"/><title>Contents</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Contents</h1>
    <ol>
${items}
    </ol>
  </nav>
</body>
</html>
`
}

/** EPUB 2 table of contents, kept because older Kindle pipelines look for it. */
function ncxXml(uid: string, title: string, entries: { href: string; label: string }[]): string {
  const points = entries
    .map(
      (entry, index) => `    <navPoint id="navPoint-${index + 1}" playOrder="${index + 1}">
      <navLabel><text>${xmlEscape(entry.label)}</text></navLabel>
      <content src="${entry.href}"/>
    </navPoint>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${xmlEscape(uid)}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${xmlEscape(title)}</text></docTitle>
  <navMap>
${points}
  </navMap>
</ncx>
`
}

interface ManifestItem {
  id: string
  href: string
  mediaType: string
  properties?: string
}

function contentOpf(options: {
  uid: string
  title: string
  language: string
  author: string
  rtl: boolean
  items: ManifestItem[]
  spine: string[]
  modified: string
}): string {
  const manifest = options.items
    .map(
      (item) =>
        `    <item id="${item.id}" href="${item.href}" media-type="${item.mediaType}"${
          item.properties ? ` properties="${item.properties}"` : ''
        }/>`,
    )
    .join('\n')
  const spine = options.spine.map((id) => `    <itemref idref="${id}"/>`).join('\n')
  const author = options.author
    ? `    <dc:creator>${xmlEscape(options.author)}</dc:creator>\n`
    : ''
  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">${xmlEscape(options.uid)}</dc:identifier>
    <dc:title>${xmlEscape(options.title)}</dc:title>
    <dc:language>${xmlEscape(options.language)}</dc:language>
${author}    <meta property="dcterms:modified">${options.modified}</meta>
    <meta property="rendition:layout">pre-paginated</meta>
    <meta property="rendition:orientation">auto</meta>
    <meta property="rendition:spread">auto</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${manifest}
  </manifest>
  <spine toc="ncx" page-progression-direction="${options.rtl ? 'rtl' : 'ltr'}">
${spine}
  </spine>
</package>
`
}

function uniqueId(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `urn:uuid:${cryptoApi.randomUUID()}`
  }
  return `urn:uuid:${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`
}

function modifiedStamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function isOutOfMemory(error: unknown): boolean {
  if (error instanceof RangeError) return true
  const message = error instanceof Error ? error.message : ''
  return /allocation failed|out of memory|cannot allocate|Array buffer allocation/i.test(message)
}

export async function convertCbzToEpub(file: Blob, options: EpubOptions = {}): Promise<EpubResult> {
  const fail = (reason: EpubReason, message: string): never => {
    throw new EpubError(reason, message)
  }

  let reader: ZipReader<unknown>
  try {
    reader = new ZipReader(new BlobReader(file))
  } catch {
    return fail('not-zip', 'This file is not a readable CBZ or ZIP archive.')
  }

  let entries: ZipEntry[]
  try {
    entries = (await reader.getEntries()) as unknown as ZipEntry[]
  } catch {
    await reader.close().catch(() => undefined)
    return fail('not-zip', 'This file is not a readable CBZ or ZIP archive.')
  }

  const pages = entries
    .filter((entry) => isPageEntry(entry))
    .sort((a, b) => comparePagePaths(a.filename, b.filename))

  if (pages.length === 0) {
    await reader.close().catch(() => undefined)
    return fail('no-images', 'No page images were found in this archive.')
  }

  let info = EMPTY_INFO
  const comicInfo = entries.find(
    (entry) => !entry.directory && /(^|\/)ComicInfo\.xml$/i.test(entry.filename),
  )
  if (comicInfo) {
    try {
      const xmlBytes = await comicInfo.getData<Uint8Array>(new Uint8ArrayWriter())
      info = parseComicInfo(new TextDecoder().decode(xmlBytes))
    } catch {
      // Metadata is optional; a malformed file must not block the conversion.
    }
  }

  const fallbackTitle = (options.fileName ?? '').replace(/\.[^.]+$/, '')
  const title = options.title || info.title || fallbackTitle || 'Comic'
  const language = options.language || info.language || 'en'
  const rtl = options.rtl ?? info.rtl
  const uid = uniqueId()
  const total = pages.length

  const writer = new ZipWriter(new BlobWriter('application/epub+zip'), { level: 6 })
  const items: ManifestItem[] = []
  const spine: string[] = []
  const toc: { href: string; label: string }[] = []
  let coverId = ''
  let written = 0
  options.onProgress?.(0, total)

  try {
    // mimetype must be the first entry and must not be compressed.
    await writer.add('mimetype', new TextReader('application/epub+zip'), { level: 0 })
    await writer.add('META-INF/container.xml', new TextReader(containerXml()))

    for (let index = 0; index < pages.length; index += 1) {
      if (options.signal?.aborted) throw new EpubError('cancelled', 'Conversion cancelled.')

      const entry = pages[index]
      const declared = typeof entry.uncompressedSize === 'number' ? entry.uncompressedSize : 0
      if (declared > MAX_PAGE_BYTES) {
        throw new EpubError(
          'memory',
          `Page ${index + 1} ("${entry.filename}") is too large to embed in a browser tab.`,
        )
      }

      const bytes = await entry.getData<Uint8Array>(new Uint8ArrayWriter())
      if (bytes.length > MAX_PAGE_BYTES) {
        throw new EpubError(
          'memory',
          `Page ${index + 1} ("${entry.filename}") is too large to embed in a browser tab.`,
        )
      }

      const number = String(index + 1).padStart(4, '0')
      const ext = extensionOf(entry.filename) || 'jpg'
      const imageHref = `images/${number}.${ext}`
      const mediaType = mimeOf(entry.filename)
      const size = imageSize(bytes, mediaType) ?? [1200, 1600]
      const pageId = `page-${number}`

      // Images are already compressed; storing them keeps the EPUB the same
      // size as the archive and makes conversion bandwidth-free.
      await writer.add(`OEBPS/${imageHref}`, new Uint8ArrayReader(bytes), { level: 0 })
      items.push({
        id: `image-${number}`,
        href: imageHref,
        mediaType,
        properties: index === 0 ? 'cover-image' : undefined,
      })
      if (index === 0) coverId = `image-${number}`

      const pageHref = `page-${number}.xhtml`
      await writer.add(
        `OEBPS/${pageHref}`,
        new TextReader(pageXhtml(index + 1, imageHref, size[0], size[1], language)),
      )
      items.push({ id: pageId, href: pageHref, mediaType: 'application/xhtml+xml' })
      spine.push(pageId)
      toc.push({ href: pageHref, label: `Page ${index + 1}` })

      written = index + 1
      options.onProgress?.(written, total)
      // Yield so the progress bar repaints and Cancel stays responsive.
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    if (options.signal?.aborted) throw new EpubError('cancelled', 'Conversion cancelled.')

    const shortToc = toc.length > 40 ? toc.slice(0, 40) : toc
    await writer.add('OEBPS/nav.xhtml', new TextReader(navXhtml(shortToc, language)))
    await writer.add('OEBPS/toc.ncx', new TextReader(ncxXml(uid, title, shortToc)))
    await writer.add(
      'OEBPS/content.opf',
      new TextReader(
        contentOpf({
          uid,
          title,
          language,
          author: options.author || info.writer,
          rtl,
          items,
          spine,
          modified: modifiedStamp(),
        }),
      ),
    )

    const blob = await writer.close()
    if (!blob) throw new EpubError('unknown', 'The EPUB could not be written.')
    return { blob, pages: total, title }
  } catch (error) {
    await writer.close().catch(() => undefined)
    await reader.close().catch(() => undefined)
    if (error instanceof EpubError) throw error
    if (isOutOfMemory(error)) {
      throw new EpubError('memory', 'The browser ran out of memory while writing the EPUB.')
    }
    throw new EpubError(
      'unknown',
      error instanceof Error && error.message ? `Conversion failed: ${error.message}` : 'Conversion failed.',
    )
  } finally {
    await reader.close().catch(() => undefined)
    // `coverId` and `items` are only read above; reference them so a future
    // refactor cannot silently drop the cover declaration.
    void coverId
    void items
  }
}

import { PDFDocument, type PDFImage } from 'pdf-lib'
import { BlobReader, Uint8ArrayWriter, ZipReader } from '@zip.js/zip.js'
import { baseName, naturalCompare } from '../reader/core/naturalSort'

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|bmp)$/i
const SKIP_RE = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db)(\/|$)/i
// A4 in PDF points (1/72 inch). Images are fitted without cropping.
const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
// Only used for formats PDF cannot embed natively (WebP, GIF, AVIF, BMP).
const TRANSCODE_QUALITY = 0.92

export type ConvertReason =
  | 'not-zip'
  | 'encrypted'
  | 'no-images'
  | 'memory'
  | 'cancelled'
  | 'unknown'

export type PageSize = 'original' | 'a4'

export class ConversionError extends Error {
  readonly reason: ConvertReason

  constructor(reason: ConvertReason, message: string) {
    super(message)
    this.reason = reason
  }
}

interface ZipEntry {
  filename: string
  directory: boolean
  encrypted?: boolean
  getData<T>(writer: Uint8ArrayWriter): Promise<T>
}

export interface ConvertOptions {
  pageSize: PageSize
  signal?: AbortSignal
  onProgress?: (done: number, total: number) => void
}

export interface ConvertResult {
  blob: Blob
  pages: number
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
}

function notZipMessage(fileName: string): string {
  const ext = extensionOf(fileName)
  if (ext === 'cbr' || ext === 'rar') {
    return 'CBR (RAR) archives are not supported. Renaming a .cbr to .cbz does not help, because the container inside is still RAR. Convert the pages to a real CBZ first, then convert that archive to PDF.'
  }
  if (ext === 'cb7' || ext === '7z') {
    return 'CB7 (7z) archives are not supported. Extract the page images, re-pack them as a CBZ, then convert that archive to PDF.'
  }
  return 'This file is not a readable CBZ or ZIP archive. If it came from a CBR (RAR) or CB7 (7z) file, convert it to CBZ first.'
}

function sniff(bytes: Uint8Array): 'jpeg' | 'png' | 'other' {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg'
  if (
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'png'
  }
  return 'other'
}

function isOutOfMemory(error: unknown): boolean {
  if (error instanceof RangeError) return true
  const message = error instanceof Error ? error.message : ''
  return /allocation failed|out of memory|cannot allocate|Array buffer allocation/i.test(message)
}

// Only used for GIF/WebP/AVIF/BMP and for JPEG/PNG files the PDF library cannot
// read as-is. JPEG pages that can be embedded directly never reach this path.
async function transcodeToJpeg(
  bytes: Uint8Array,
): Promise<{ data: Uint8Array; width: number; height: number }> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(new Blob([bytes]))
  } catch {
    throw new ConversionError(
      'unknown',
      'One of the pages is not an image this browser can decode. Re-pack the archive with JPG or PNG pages.',
    )
  }

  const width = bitmap.width
  const height = bitmap.height
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new ConversionError('memory', 'The browser ran out of memory while preparing a page.')
  }
  context.drawImage(bitmap, 0, 0)
  bitmap.close()

  const jpeg = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', TRANSCODE_QUALITY)
  })
  canvas.width = 0
  canvas.height = 0

  if (!jpeg) {
    throw new ConversionError(
      'memory',
      'The browser could not encode a page. Very large pages can exhaust memory; try closing other tabs and converting again.',
    )
  }

  return { data: new Uint8Array(await jpeg.arrayBuffer()), width, height }
}

export async function convertCbzToPdf(
  file: File,
  options: ConvertOptions,
): Promise<ConvertResult> {
  const fail = (reason: ConvertReason, message: string): never => {
    throw new ConversionError(reason, message)
  }

  let reader: ZipReader<unknown>
  try {
    reader = new ZipReader(new BlobReader(file))
  } catch {
    return fail('not-zip', notZipMessage(file.name))
  }

  let entries: ZipEntry[]
  try {
    entries = (await reader.getEntries()) as unknown as ZipEntry[]
  } catch {
    await reader.close().catch(() => undefined)
    return fail('not-zip', notZipMessage(file.name))
  }

  const imageEntries = entries.filter(
    (entry) => !entry.directory && IMAGE_RE.test(entry.filename) && !SKIP_RE.test(entry.filename),
  )
  const encrypted = imageEntries.filter((entry) => entry.encrypted)

  if (encrypted.length > 0) {
    await reader.close().catch(() => undefined)
    return fail(
      'encrypted',
      'This archive is password-protected. Remove the password and try again; encrypted pages cannot be converted.',
    )
  }

  const pages = imageEntries.sort(
    (a, b) =>
      naturalCompare(baseName(a.filename), baseName(b.filename)) ||
      naturalCompare(a.filename, b.filename),
  )

  if (pages.length === 0) {
    await reader.close().catch(() => undefined)
    return fail(
      'no-images',
      `No page images were found in this archive. It contains ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}, but none of them are JPG, PNG, WebP, GIF, AVIF or BMP files.`,
    )
  }

  const total = pages.length
  options.onProgress?.(0, total)

  let pdf: PDFDocument
  try {
    pdf = await PDFDocument.create()
  } catch (error) {
    await reader.close().catch(() => undefined)
    return fail(
      isOutOfMemory(error) ? 'memory' : 'unknown',
      'The PDF document could not be created. Close other tabs and try again.',
    )
  }

  try {
    for (let index = 0; index < pages.length; index += 1) {
      if (options.signal?.aborted) {
        throw new ConversionError('cancelled', 'Conversion cancelled.')
      }

      const entry = pages[index]
      let bytes: Uint8Array
      try {
        bytes = await entry.getData<Uint8Array>(new Uint8ArrayWriter())
      } catch (error) {
        throw new ConversionError(
          isOutOfMemory(error) ? 'memory' : 'unknown',
          `Page ${index + 1} of "${entry.filename}" could not be read. The archive may be damaged.`,
        )
      }

      let image: PDFImage
      try {
        const kind = sniff(bytes)
        if (kind === 'jpeg') {
          // Embedded as-is: the JPEG bitstream goes straight into the PDF.
          image = await pdf.embedJpg(bytes)
        } else if (kind === 'png') {
          image = await pdf.embedPng(bytes)
        } else {
          const transcoded = await transcodeToJpeg(bytes)
          image = await pdf.embedJpg(transcoded.data)
        }
      } catch (error) {
        if (error instanceof ConversionError) throw error
        if (isOutOfMemory(error)) {
          throw new ConversionError(
            'memory',
            `The browser ran out of memory on page ${index + 1}. Try a smaller archive or close other tabs.`,
          )
        }
        // A JPEG the library cannot parse (rare) is re-encoded once.
        try {
          const transcoded = await transcodeToJpeg(bytes)
          image = await pdf.embedJpg(transcoded.data)
        } catch (fallbackError) {
          if (fallbackError instanceof ConversionError) throw fallbackError
          throw new ConversionError(
            isOutOfMemory(fallbackError) ? 'memory' : 'unknown',
            `Page ${index + 1} ("${entry.filename}") could not be embedded. The image data may be corrupt.`,
          )
        }
      }

      if (options.pageSize === 'a4') {
        const scale = Math.min(A4_WIDTH / image.width, A4_HEIGHT / image.height)
        const width = image.width * scale
        const height = image.height * scale
        const page = pdf.addPage([A4_WIDTH, A4_HEIGHT])
        page.drawImage(image, {
          x: (A4_WIDTH - width) / 2,
          y: (A4_HEIGHT - height) / 2,
          width,
          height,
        })
      } else {
        // Original size: one image pixel maps to one PDF point, no resampling.
        const page = pdf.addPage([image.width, image.height])
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
      }

      options.onProgress?.(index + 1, total)
      // Yield so the progress bar repaints and the cancel button stays usable.
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    if (options.signal?.aborted) {
      throw new ConversionError('cancelled', 'Conversion cancelled.')
    }

    const saved = await pdf.save()
    return { blob: new Blob([saved], { type: 'application/pdf' }), pages: total }
  } catch (error) {
    if (error instanceof ConversionError) throw error
    if (isOutOfMemory(error)) {
      throw new ConversionError(
        'memory',
        'The browser ran out of memory while writing the PDF. Try a smaller archive, or close other tabs and try again.',
      )
    }
    throw new ConversionError(
      'unknown',
      error instanceof Error && error.message
        ? `Conversion failed: ${error.message}`
        : 'Conversion failed for an unknown reason.',
    )
  } finally {
    await reader.close().catch(() => undefined)
  }
}

import type { PageAsset } from './types'

/**
 * One decode budget for every platform. A page is only used at its native size
 * when it already fits both limits; otherwise it is downsampled into the same
 * box. Nothing here branches on user agent, so a phone and a desktop get the
 * same pixels and the same memory profile.
 */
const MAX_DECODE_DIM = 4096
const MAX_DECODE_PIXELS = 12_000_000
const TARGET_WIDTH = 2400
const JPEG_QUALITY = 0.92

type Size = { width: number; height: number }

/**
 * Reads image dimensions from the header when possible.
 * This avoids a full-resolution decode just to decide whether a page needs downsampling.
 */
async function readImageSize(blob: Blob): Promise<Size | null> {
  const head = new Uint8Array(await blob.slice(0, 64 * 1024).arrayBuffer())
  const view = new DataView(head.buffer, head.byteOffset, head.byteLength)

  if (head.length >= 24 && head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) {
    return { width: view.getUint32(16), height: view.getUint32(20) }
  }

  if (head.length >= 10 && head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46) {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) }
  }

  if (head.length >= 26 && head[0] === 0x42 && head[1] === 0x4d) {
    const width = Math.abs(view.getInt32(18, true))
    const height = Math.abs(view.getInt32(22, true))
    if (width && height) return { width, height }
  }

  if (head.length >= 12 && head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46) {
    const chunk = String.fromCharCode(head[12], head[13], head[14], head[15])
    if (chunk === 'VP8X' && head.length >= 30) {
      return {
        width: 1 + (head[24] | (head[25] << 8) | (head[26] << 16)),
        height: 1 + (head[27] | (head[28] << 8) | (head[29] << 16)),
      }
    }
    if (chunk === 'VP8 ' && head.length >= 30) {
      return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff }
    }
    if (chunk === 'VP8L' && head.length >= 25) {
      const b0 = head[21]
      const b1 = head[22]
      const b2 = head[23]
      const b3 = head[24]
      return {
        width: 1 + (b0 | ((b1 & 0x3f) << 8)),
        height: 1 + ((b1 >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10)),
      }
    }
  }

  if (head.length >= 4 && head[0] === 0xff && head[1] === 0xd8) {
    let offset = 2
    while (offset + 9 < head.length) {
      if (head[offset] !== 0xff) {
        offset += 1
        continue
      }
      const marker = head[offset + 1]
      const isSof =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      if (isSof) {
        const height = view.getUint16(offset + 5)
        const width = view.getUint16(offset + 7)
        if (width && height) return { width, height }
        break
      }
      const length = view.getUint16(offset + 2)
      if (length < 2) break
      offset += 2 + length
    }
  }

  return null
}

function measureImage(url: string): Promise<Size> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      if (image.naturalWidth && image.naturalHeight) {
        resolve({ width: image.naturalWidth, height: image.naturalHeight })
      } else {
        reject(new Error('Image has no dimensions'))
      }
    }
    image.onerror = () => reject(new Error('Image could not be decoded'))
    image.src = url
  })
}

async function canvasToBlob(bitmap: ImageBitmap, width: number, height: number): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    if (context) {
      context.drawImage(bitmap, 0, 0, width, height)
      if (typeof canvas.convertToBlob === 'function') {
        return canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY })
      }
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available')
  context.drawImage(bitmap, 0, 0, width, height)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the downsampled page'))),
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}

async function downsample(blob: Blob, width: number, height: number): Promise<Blob> {
  if (typeof createImageBitmap === 'function') {
    let bitmap: ImageBitmap
    try {
      bitmap = await createImageBitmap(blob, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: 'high',
      })
    } catch {
      bitmap = await createImageBitmap(blob)
    }
    try {
      return await canvasToBlob(bitmap, width, height)
    } finally {
      bitmap.close()
    }
  }

  // Fallback for browsers without createImageBitmap: decode through an <img>.
  const url = URL.createObjectURL(blob)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('Image could not be decoded'))
      element.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is not available')
    context.drawImage(image, 0, 0, width, height)
    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('Could not encode the page'))),
        'image/jpeg',
        JPEG_QUALITY,
      )
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export interface ThumbAsset {
  url: string
  width: number
  height: number
}

/** The page-thumbnail grid never needs more than this, whatever the tile size. */
export const THUMB_MAX_WIDTH = 240
export const THUMB_MAX_HEIGHT = 320
const THUMB_QUALITY = 0.72

function fitThumb(width: number, height: number, targetWidth: number): Size {
  const maxWidth = Math.min(Math.max(1, targetWidth), THUMB_MAX_WIDTH)
  const ratio = Math.min(maxWidth / width, THUMB_MAX_HEIGHT / height, 1)
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  }
}

async function encodeThumb(
  source: Size,
  targetWidth: number,
  draw: (context: CanvasRenderingContext2D, size: Size) => void,
): Promise<ThumbAsset> {
  const size = fitThumb(source.width, source.height, targetWidth)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available')
  context.imageSmoothingQuality = 'medium'
  draw(context, size)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Could not encode the thumbnail'))),
      'image/jpeg',
      THUMB_QUALITY,
    )
  })
  // The tile is a few hundred pixels wide; the canvas is dropped right away so
  // thumbnails never hold on to a full-size backing store.
  canvas.width = 0
  canvas.height = 0
  return { url: URL.createObjectURL(blob), width: size.width, height: size.height }
}

/**
 * Builds a small JPEG for one page of the thumbnail grid. This is a separate
 * pipeline from `loadPageAsset`: it decodes straight to the tile size and is
 * deliberately outside the reader's page budget, so a full grid can never push
 * the reading pages out of memory.
 */
export async function loadThumbnail(blob: Blob, targetWidth: number): Promise<ThumbAsset> {
  const header = await readImageSize(blob)

  if (typeof createImageBitmap === 'function') {
    const decodeWidth = Math.min(Math.max(1, targetWidth), THUMB_MAX_WIDTH)
    let bitmap: ImageBitmap
    try {
      bitmap = await createImageBitmap(blob, {
        resizeWidth: decodeWidth,
        resizeQuality: 'medium',
      })
    } catch {
      bitmap = await createImageBitmap(blob)
    }
    try {
      return await encodeThumb(
        header ?? { width: bitmap.width, height: bitmap.height },
        targetWidth,
        (context, size) => context.drawImage(bitmap, 0, 0, size.width, size.height),
      )
    } finally {
      bitmap.close()
    }
  }

  const url = URL.createObjectURL(blob)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('Image could not be decoded'))
      element.src = url
    })
    return await encodeThumb(
      { width: image.naturalWidth, height: image.naturalHeight },
      targetWidth,
      (context, size) => context.drawImage(image, 0, 0, size.width, size.height),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Reuses a page that the reader already decoded instead of unzipping it again.
 * The object URL is same-origin, so drawing it into the tile canvas is allowed.
 */
export async function loadThumbnailFromUrl(
  url: string,
  targetWidth: number,
): Promise<ThumbAsset> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image()
    element.decoding = 'async'
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error('Image could not be decoded'))
    element.src = url
  })
  return encodeThumb(
    { width: image.naturalWidth, height: image.naturalHeight },
    targetWidth,
    (context, size) => context.drawImage(image, 0, 0, size.width, size.height),
  )
}

export async function loadPageAsset(
  index: number,
  blob: Blob,
  minWidth?: number,
): Promise<PageAsset> {
  const rawUrl = URL.createObjectURL(blob)
  const headerSize = await readImageSize(blob)

  let size = headerSize
  if (!size) {
    try {
      size = await measureImage(rawUrl)
    } catch {
      URL.revokeObjectURL(rawUrl)
      throw new Error('Image could not be decoded')
    }
  }

  const pixels = size.width * size.height
  const smallEnough =
    size.width <= MAX_DECODE_DIM && size.height <= MAX_DECODE_DIM && pixels <= MAX_DECODE_PIXELS

  if (smallEnough) {
    return { index, url: rawUrl, width: size.width, height: size.height, downsampled: false }
  }

  URL.revokeObjectURL(rawUrl)

  const targetWidth = Math.max(TARGET_WIDTH, minWidth ?? 0)
  const ratio = Math.min(
    1,
    targetWidth / size.width,
    MAX_DECODE_DIM / size.width,
    MAX_DECODE_DIM / size.height,
    Math.sqrt(MAX_DECODE_PIXELS / pixels),
  )
  const width = Math.max(1, Math.round(size.width * ratio))
  const height = Math.max(1, Math.round(size.height * ratio))
  const downsampled = await downsample(blob, width, height)

  return {
    index,
    url: URL.createObjectURL(downsampled),
    width,
    height,
    downsampled: true,
  }
}

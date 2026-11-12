// CBZ -> PDF conversion check against the dev server.
// Run: $env:CBZ_SAMPLE="D:\path\demo.cbz"; npm run test:convert
// Optional: $env:CBZ_STRESS and $env:CBZ_JPEG to point at other archives.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import { PDFDocument } from 'pdf-lib'
import { BlobReader, Uint8ArrayWriter, ZipReader } from '@zip.js/zip.js'

const root = path.resolve(import.meta.dirname, '..')
const port = Number(process.env.CONVERT_PORT || 5201)
const base = `http://localhost:${port}/`
// A fresh directory per run: Windows keeps a handle on the previous PDF for a
// moment, and deleting a locked directory would fail the whole check.
const downloadDir = path.join(root, 'test/.cache/convert-downloads', String(Date.now()))
// Original size keeps the image's physical size: 96 CSS DPI -> 72 PDF points.
const PX_TO_PT = 0.75
const close = (a, b) => Math.abs(a - b) < 0.01

const edgeCandidates = [
  process.env.EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)
const executablePath = edgeCandidates.find((candidate) => existsSync(candidate))
if (!executablePath) {
  throw new Error('No Edge or Chrome executable found. Set EDGE_PATH to run the conversion check.')
}

const sample =
  process.env.CBZ_SAMPLE || path.join('D:', 'edgeDown', 'testData', 'archive', 'demo-30pages.cbz')
if (!existsSync(sample)) {
  throw new Error(`Sample CBZ not found at ${sample}. Set CBZ_SAMPLE to a .cbz file.`)
}

const stress = process.env.CBZ_STRESS || path.join('D:', 'edgeDown', 'testData', 'archive', 'large-pages-20.cbz')
const jpegSample =
  process.env.CBZ_JPEG ||
  path.join('D:', 'edgeDown', 'testData', 'archive', 'hermano_lobo_1972_001 .cbz')

await mkdir(downloadDir, { recursive: true })

const cbrSample = path.join(root, 'test/.cache/convert-not-a-zip.cbr')
await writeFile(cbrSample, Buffer.from('Rar!\x1a\x07\x00definitely-not-a-zip', 'binary'))

const server = spawn('npm', ['run', 'dev', '--', '--port', String(port), '--strictPort'], {
  cwd: root,
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})

let serverOutput = ''
server.stdout.on('data', (chunk) => {
  serverOutput += chunk.toString()
})
server.stderr.on('data', (chunk) => {
  serverOutput += chunk.toString()
})

async function waitForServer() {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(base)
      if (response.ok) return
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  throw new Error(`Dev server did not start in time:\n${serverOutput}`)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function waitForFile(dir, before, extension, timeout = 180_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    for (const name of await readdir(dir)) {
      if (!name.endsWith(extension) || before.has(name)) continue
      const full = path.join(dir, name)
      const first = await stat(full)
      if (first.size === 0) continue
      await new Promise((resolve) => setTimeout(resolve, 300))
      const second = await stat(full)
      if (second.size === first.size) return full
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`No ${extension} download appeared in ${dir}`)
}

async function pdfInfo(buffer) {
  const document = await PDFDocument.load(buffer)
  return {
    pages: document.getPageCount(),
    sizes: document.getPages().map((page) => {
      const { width, height } = page.getSize()
      return { width, height }
    }),
  }
}

async function archiveImages(file) {
  const reader = new ZipReader(new BlobReader(new Blob([await readFile(file)])))
  const entries = (await reader.getEntries())
    .filter((entry) => !entry.directory && !entry.filename.startsWith('__MACOSX/'))
    .sort((a, b) =>
      a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' }),
    )
  const bytes = await entries[0].getData(new Uint8ArrayWriter())
  const total = entries.reduce((sum, entry) => sum + (entry.uncompressedSize ?? 0), 0)
  await reader.close()

  // PNG IHDR carries the pixel dimensions at a fixed offset.
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return {
    count: entries.length,
    totalBytes: total,
    first: isPng ? { width: view.getUint32(16), height: view.getUint32(20) } : null,
  }
}

async function pick(page, file) {
  const reset = await page.$('[data-convert-reset]')
  if (reset) {
    await reset.click()
    await page.waitForSelector('[data-convert-open]', { timeout: 15_000 })
  }
  const input = await page.$('#converter-app input[type="file"]')
  assert(input, 'converter file input not found')
  await input.uploadFile(file)
  await page.waitForSelector('[data-convert-start]', { timeout: 15_000 })
}

async function convert(page, { file, mode }) {
  const before = new Set(await readdir(downloadDir))

  await pick(page, file)
  if (mode === 'a4') {
    await page.click('#converter-app input[value="a4"]')
  }

  await page.click('[data-convert-start]')
  await page.waitForSelector('[data-convert-download]', { timeout: 180_000 })
  const summary = await page.$eval('#converter-app', (element) => element.textContent ?? '')

  // Chrome refuses the second automatic download from one site without a
  // gesture, so read the blob the link points at. The first pass still waits
  // for a real file on disk, which proves the download itself works.
  let downloaded
  try {
    downloaded = await waitForFile(downloadDir, before, '.pdf', 5_000)
  } catch {
    const saved = await page.evaluate(async () => {
      const link = document.querySelector('[data-convert-download]')
      const bytes = new Uint8Array(await (await fetch(link.href)).arrayBuffer())
      let binary = ''
      for (let index = 0; index < bytes.length; index += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
      }
      return { name: link.getAttribute('download') ?? '', base64: btoa(binary) }
    })
    downloaded = path.join(downloadDir, saved.name)
    await writeFile(downloaded, Buffer.from(saved.base64, 'base64'))
  }

  const downloadName = path.basename(downloaded)
  const expected = `${path.basename(file).replace(/\.[^.]+$/, '')}.pdf`
  assert(
    downloadName === expected,
    `download is named ${downloadName}, expected ${expected}`,
  )

  return { downloaded, summary }
}

let browser
try {
  await waitForServer()
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,960'],
  })

  const client = await browser.target().createCDPSession()
  await client.send('Browser.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir,
    eventsEnabled: true,
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  const uploads = []
  await page.setRequestInterception(true)
  page.on('request', (request) => {
    const method = request.method()
    // Any request that carries a body would be a leak; file content must never
    // leave the tab.
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      uploads.push(`${method} ${request.url()}`)
    }
    if (request.url().includes('cloud.umami.is')) request.abort()
    else request.continue()
  })

  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto(`${base}cbz-to-pdf/`, { waitUntil: 'networkidle2' })
  await page.waitForSelector('[data-convert-open]')

  // Default mode: original page size, pixels converted at 96 DPI (0.75pt each).
  const original = await convert(page, { file: sample, mode: 'original' })
  const originalBuffer = await readFile(original.downloaded)
  const originalPdf = await pdfInfo(originalBuffer)
  const source = await archiveImages(sample)

  assert(originalPdf.pages === source.count, `PDF has ${originalPdf.pages} of ${source.count} pages`)
  assert(
    source.first &&
      close(originalPdf.sizes[0].width, source.first.width * PX_TO_PT) &&
      close(originalPdf.sizes[0].height, source.first.height * PX_TO_PT),
    `original pages are not the source pixel size at 96 DPI: ${JSON.stringify(originalPdf.sizes[0])} vs ${JSON.stringify(source.first)}`,
  )
  assert(
    original.summary.includes(`${originalPdf.pages} pages`),
    `progress summary does not match the PDF: ${original.summary}`,
  )

  // A4 mode: same image data, A4 page boxes.
  const a4 = await convert(page, { file: sample, mode: 'a4' })
  const a4Buffer = await readFile(a4.downloaded)
  const a4Pdf = await pdfInfo(a4Buffer)
  assert(a4Pdf.pages === originalPdf.pages, 'A4 PDF lost pages')
  assert(
    a4Pdf.sizes.every(
      ({ width, height }) => Math.abs(width - 595.28) < 0.5 && Math.abs(height - 841.89) < 0.5,
    ),
    `A4 pages have the wrong size: ${JSON.stringify(a4Pdf.sizes.slice(0, 2))}`,
  )

  // CBR input should name the container instead of failing generically.
  await page.reload({ waitUntil: 'networkidle2' })
  await page.waitForSelector('[data-convert-open]')
  await pick(page, cbrSample)
  await page.click('[data-convert-start]')
  await page.waitForSelector('.conv__error', { timeout: 20_000 })
  const cbrError = await page.$eval('.conv__error', (element) => element.textContent ?? '')
  assert(
    cbrError.includes('CBR (RAR) archives are not supported'),
    `CBR error is not specific: ${cbrError}`,
  )

  await page.close()

  // JPEG pass: the PDF must carry the original JPEG bytes, not a re-encode.
  let jpegReport = null
  if (existsSync(jpegSample)) {
    const jpegPage = await browser.newPage()
    await jpegPage.setViewport({ width: 1280, height: 900 })
    await jpegPage.goto(`${base}cbz-to-pdf/`, { waitUntil: 'networkidle2' })
    await jpegPage.waitForSelector('[data-convert-open]')
    const jpegConverted = await convert(jpegPage, { file: jpegSample, mode: 'original' })
    const jpegBuffer = await readFile(jpegConverted.downloaded)
    const jpegPdf = await pdfInfo(jpegBuffer)
    const jpegSource = await archiveImages(jpegSample)
    assert(jpegPdf.pages === jpegSource.count, 'JPEG PDF lost pages')
    assert(
      jpegBuffer.length > jpegSource.totalBytes * 0.95,
      `PDF (${jpegBuffer.length}) is smaller than the JPEG bytes (${jpegSource.totalBytes}); pages were re-encoded`,
    )
    jpegReport = {
      pages: jpegPdf.pages,
      firstPage: jpegPdf.sizes[0],
      megabytes: Math.round(jpegBuffer.length / (1024 * 1024)),
    }
    await jpegPage.close()
  }

  // Stress pass on a separate page so the earlier runs' memory is released.
  let stressReport = null
  if (existsSync(stress)) {
    const bigPage = await browser.newPage()
    await bigPage.setViewport({ width: 1280, height: 900 })
    await bigPage.goto(`${base}cbz-to-pdf/`, { waitUntil: 'networkidle2' })
    await bigPage.waitForSelector('[data-convert-open]')
    const started = Date.now()
    const big = await convert(bigPage, { file: stress, mode: 'original' })
    const bigBuffer = await readFile(big.downloaded)
    const bigPdf = await pdfInfo(bigBuffer)
    assert(bigPdf.pages > 0, 'stress PDF has no pages')
    assert(
      close(bigPdf.sizes[0].width, 3000 * PX_TO_PT) && close(bigPdf.sizes[0].height, 4500 * PX_TO_PT),
      `stress page is not the original 3000x4500 at 96 DPI: ${JSON.stringify(bigPdf.sizes[0])}`,
    )
    stressReport = {
      pages: bigPdf.pages,
      megabytes: Math.round(bigBuffer.length / (1024 * 1024)),
      ms: Date.now() - started,
    }
    await bigPage.close()
  }

  assert(uploads.length === 0, `file content left the tab: ${uploads.join(', ')}`)
  if (errors.length > 0) throw new Error(`Page errors: ${errors.sort().join(' | ')}`)

  console.log(
    JSON.stringify(
      {
        original: {
          pages: originalPdf.pages,
          firstPage: originalPdf.sizes[0],
          summary: original.summary,
        },
        a4: { pages: a4Pdf.pages, firstPage: a4Pdf.sizes[0] },
        jpeg: jpegReport,
        cbrError,
        stress: stressReport,
        uploads,
      },
      null,
      2,
    ),
  )
  console.log('CONVERT PASS: original size, A4, no uploads, specific errors')
} finally {
  await browser?.close()
  server.kill()
  await rm(downloadDir, { recursive: true, force: true, maxRetries: 3 }).catch(() => undefined)
}

// The dev server child keeps a stdio handle on Windows, which would hold the
// process open after the assertions finish.
process.exit(0)

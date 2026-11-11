/**
 * Build the public-domain sample comic shipped with /demo/.
 *
 * Source: twelve consecutive Sunday pages of "Little Nemo in Slumberland"
 * (Winsor McCay, New York Herald, 1 Mar – 17 May 1908), from Wikimedia Commons.
 * Every file page declares {{PD-US}}; the script fetches ?action=raw for each
 * page and refuses to build unless a public-domain template is present.
 *
 * Processing (headless browser canvas, no native image dependencies):
 *   1. white-balance the scan against its paper tone,
 *   2. trim only the blank outer margin (ink bounding box, 8px pad, capped at
 *      8% per side and skipped entirely when the result looks suspicious),
 *   3. downsample to --width (default 780px) with high-quality smoothing,
 *   4. encode JPEG at --quality (default 0.58),
 *   5. pack a STORE-only CBZ.
 *
 *   node scripts/make-demo-comic.mjs
 *   node scripts/make-demo-comic.mjs --width 760 --quality 0.6 --out path.cbz
 */
import dns from 'node:dns'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import { findBrowser } from './lib/browser.mjs'
import { buildZip } from './lib/cbz.mjs'

const ROOT = process.cwd()
const CACHE_DIR = path.join(ROOT, 'scripts', '.cache', 'little-nemo')
const DEFAULT_OUT = path.join(ROOT, 'public', 'samples', 'little-nemo-1908.cbz')
const USER_AGENT =
  'cbz-reader-sample-builder/1.0 (sample comic build; jiamin.wu23@mavi.help)'
const PD_TEMPLATE = /\{\{\s*(PD-(?:US|old|1923|1996|US-expired)[^}|}]*)/gi

// Wikimedia answers fine over IPv4 here; prefer it before the 10s IPv6 timeout.
dns.setDefaultResultOrder('ipv4first')

/** Twelve consecutive Sundays with evenly sized, complete scans. */
const PAGES = [
  ['1908-03-01', 'Little Nemo 1908-03-01.jpg'],
  ['1908-03-08', 'Little Nemo 1908-03-08.jpg'],
  ['1908-03-15', 'Little Nemo 1908-03-15.jpg'],
  ['1908-03-22', 'Little Nemo 1908-03-22.jpg'],
  ['1908-03-29', 'Little Nemo 1908-03-29.jpg'],
  ['1908-04-05', 'Little Nemo 1908-04-05.jpg'],
  ['1908-04-12', 'Little Nemo 1908-04-12.jpg'],
  ['1908-04-19', 'Little Nemo 1908-04-19.jpg'],
  ['1908-04-26', 'Little Nemo 1908-04-26.jpg'],
  ['1908-05-03', 'Little Nemo 1908-05-03.jpg'],
  ['1908-05-10', 'Little Nemo 1908-05-10.jpg'],
  ['1908-05-17', 'Little Nemo 1908-05-17.jpg'],
]

function parseArgs() {
  const args = process.argv.slice(2)
  const value = (flag, fallback) => {
    const index = args.indexOf(flag)
    return index >= 0 && args[index + 1] ? args[index + 1] : fallback
  }
  return {
    out: path.resolve(value('--out', DEFAULT_OUT)),
    width: Number(value('--width', 780)),
    quality: Number(value('--quality', 0.58)),
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Wikimedia rate-limits bursts; back off instead of failing the build. */
async function request(url, attempts = 5) {
  let wait = 2000
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        redirect: 'follow',
      })
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`HTTP ${response.status}`)
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response
    } catch (error) {
      if (attempt === attempts) throw error
      console.warn(`  retrying in ${wait / 1000}s (${error.message})`)
      await sleep(wait)
      wait *= 2
    }
  }
  throw new Error('unreachable')
}

/**
 * Read the file page's raw wikitext and prove a public-domain template is
 * mounted. These pages put it in {{Information}}'s Permission field rather than
 * a separate Licensing section, so the check scans the whole page.
 */
async function verifyLicence(file) {
  const raw = `https://commons.wikimedia.org/w/index.php?title=${encodeURIComponent(
    `File:${file}`,
  )}&action=raw`
  const text = await (await request(raw)).text()
  const templates = [
    ...new Set([...text.matchAll(PD_TEMPLATE)].map((match) => match[1].trim())),
  ]
  if (templates.length === 0) {
    throw new Error(`${file} has no public-domain template on its file page`)
  }
  return templates.join(', ')
}

async function download(date, file) {
  await mkdir(CACHE_DIR, { recursive: true })
  const target = path.join(CACHE_DIR, `${date}${path.extname(file) || '.jpg'}`)
  if (!existsSync(target)) {
    const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`
    const response = await request(url)
    await writeFile(target, Buffer.from(await response.arrayBuffer()))
    await sleep(1200)
  }
  return target
}

/** Runs inside the browser: balance, trim, downsample, encode. */
async function processPage({ dataUrl, targetWidth, quality }) {
  const image = new Image()
  image.src = dataUrl
  await image.decode()

  // Paper tone from a small sample; the 98.5th percentile ignores highlights.
  const probeScale = Math.min(1, 360 / image.naturalWidth)
  const probeWidth = Math.max(1, Math.round(image.naturalWidth * probeScale))
  const probeHeight = Math.max(1, Math.round(image.naturalHeight * probeScale))
  const probe = document.createElement('canvas')
  probe.width = probeWidth
  probe.height = probeHeight
  const probeContext = probe.getContext('2d', { willReadFrequently: true })
  probeContext.drawImage(image, 0, 0, probeWidth, probeHeight)
  const sample = probeContext.getImageData(0, 0, probeWidth, probeHeight).data

  const histogram = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)]
  for (let i = 0; i < sample.length; i += 4) {
    histogram[0][sample[i]] += 1
    histogram[1][sample[i + 1]] += 1
    histogram[2][sample[i + 2]] += 1
  }
  const total = probeWidth * probeHeight
  const percentile = (channel, fraction) => {
    const target = total * fraction
    let seen = 0
    for (let value = 0; value < 256; value += 1) {
      seen += channel[value]
      if (seen >= target) return value
    }
    return 255
  }
  const white = [0, 1, 2].map((channel) => percentile(histogram[channel], 0.985))
  const gains = white.map((value) => Math.min(1.5, 252 / Math.max(1, value)))

  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  context.drawImage(image, 0, 0)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  const data = pixels.data
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i] * gains[0]
    data[i + 1] = data[i + 1] * gains[1]
    data[i + 2] = data[i + 2] * gains[2]
  }

  // Ink bounding box: trim only rows/columns that are essentially blank paper.
  const width = canvas.width
  const height = canvas.height
  const rowInk = new Uint32Array(height)
  const columnInk = new Uint32Array(width)
  const rowSamples = Math.ceil(width / 2)
  const columnSamples = Math.ceil(height / 2)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4
      const luminance = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      if (luminance < 224) {
        rowInk[y] += 1
        columnInk[x] += 1
        if (x + 1 < width) columnInk[x + 1] += 1
      }
    }
  }
  const rowThreshold = rowSamples * 0.006
  const columnThreshold = columnSamples * 0.006
  let top = 0
  let bottom = height - 1
  let left = 0
  let right = width - 1
  while (top < height && rowInk[top] <= rowThreshold) top += 1
  while (bottom > top && rowInk[bottom] <= rowThreshold) bottom -= 1
  while (left < width && columnInk[left] <= columnThreshold) left += 1
  while (right > left && columnInk[right] <= columnThreshold) right -= 1

  const pad = 8
  let box = {
    x: Math.max(0, left - pad),
    y: Math.max(0, top - pad),
    w: Math.min(width, right + 1 + pad) - Math.max(0, left - pad),
    h: Math.min(height, bottom + 1 + pad) - Math.max(0, top - pad),
  }
  const marginX = Math.floor(width * 0.08)
  const marginY = Math.floor(height * 0.08)
  const suspicious =
    left > marginX ||
    width - 1 - right > marginX ||
    top > marginY ||
    height - 1 - bottom > marginY ||
    box.w < width * 0.7 ||
    box.h < height * 0.7
  const trimmed = !suspicious
  if (!trimmed) box = { x: 0, y: 0, w: width, h: height }

  const outWidth = Math.min(targetWidth, box.w)
  const outHeight = Math.round((box.h * outWidth) / box.w)
  const out = document.createElement('canvas')
  out.width = outWidth
  out.height = outHeight
  const outContext = out.getContext('2d')
  outContext.imageSmoothingEnabled = true
  outContext.imageSmoothingQuality = 'high'
  outContext.drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, outWidth, outHeight)
  const jpeg = out.toDataURL('image/jpeg', quality)

  canvas.width = 0
  canvas.height = 0
  probe.width = 0
  probe.height = 0
  out.width = 0
  out.height = 0

  return {
    jpeg: jpeg.slice(jpeg.indexOf(',') + 1),
    width: outWidth,
    height: outHeight,
    trimmed,
    margins: { top, bottom, left, right },
  }
}

async function main() {
  const { out, width, quality } = parseArgs()
  console.log('Checking the licence of every page on Wikimedia Commons…')
  const licences = []
  for (const [date, file] of PAGES) {
    const template = await verifyLicence(file)
    licences.push(template)
    console.log(`  ${date}  {{${template}}}  ${file}`)
    await sleep(600)
  }

  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: true,
    args: ['--hide-scrollbars'],
  })

  const entries = []
  try {
    const page = await browser.newPage()
    await page.setContent('<!doctype html><html><body></body></html>', { waitUntil: 'load' })
    for (let index = 0; index < PAGES.length; index += 1) {
      const [date, file] = PAGES[index]
      const source = await download(date, file)
      const dataUrl = `data:image/jpeg;base64,${(await readFile(source)).toString('base64')}`
      const result = await page.evaluate(processPage, { dataUrl, targetWidth: width, quality })
      const jpeg = Buffer.from(result.jpeg, 'base64')
      entries.push({ name: `page-${String(index + 1).padStart(3, '0')}.jpg`, data: jpeg })
      console.log(
        `  ${String(index + 1).padStart(2, '0')}/${PAGES.length} ${date} → ` +
          `${result.width}×${result.height} ${(jpeg.length / 1024).toFixed(0)} kB` +
          `${result.trimmed ? '' : ' (margin kept)'}`,
      )
    }
  } finally {
    await browser.close()
  }

  await mkdir(path.dirname(out), { recursive: true })
  const zip = buildZip(entries)
  await writeFile(out, zip)
  const megabytes = zip.length / 1024 / 1024
  console.log(`\n${path.relative(ROOT, out)} — ${entries.length} pages, ${megabytes.toFixed(2)} MB`)
  console.log(`Licences: ${[...new Set(licences)].map((item) => `{{${item}}}`).join(', ')}`)
  if (megabytes < 1 || megabytes > 2) {
    console.warn(`Warning: archive is ${megabytes.toFixed(2)} MB, outside the 1–2 MB target.`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

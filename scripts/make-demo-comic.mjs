/**
 * Build the sample comic shipped with /demo/ from the public-domain source CBZ.
 *
 * Source: "Silent Ruin (2018)" — written by Brian David Johnson, creative
 * direction by Sandy Winkelman, illustration by Don Hudson & Kinsun Lo,
 * published by the U.S. Army Cyber Institute at West Point.
 * Commons file page (raw wikitext licensed {{PD-USGov-Military-Army}}):
 * https://commons.wikimedia.org/wiki/File:Silent_Ruin_(2018),_by_Brian_David_Johnson.pdf
 *
 * The input is the 10-page booklet the user converted from that PDF to JPEG
 * pages. Pages are already clean full-bleed scans: no colour cast, no scan
 * margin, no rotation. Processing only normalises the encoding so the archive
 * stays inside the 1–2 MB budget:
 *   - draw each page at --width (default: original 1224px),
 *   - encode JPEG at --quality (default 0.7),
 *   - pack a STORE-only CBZ with page-001.jpg … page-010.jpg names.
 *
 *   node scripts/make-demo-comic.mjs
 *   node scripts/make-demo-comic.mjs --width 1100 --quality 0.66
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import { ZipReader, Uint8ArrayReader, Uint8ArrayWriter } from '@zip.js/zip.js'
import { findBrowser } from './lib/browser.mjs'
import { buildZip } from './lib/cbz.mjs'

const ROOT = process.cwd()
const DEFAULT_IN = path.join(ROOT, 'public', 'Silent_Ruin_(2018),_by_Brian_David_Johnson.cbz')
const DEFAULT_OUT = path.join(ROOT, 'public', 'samples', 'silent-ruin-2018.cbz')
const IMAGE_NAME = /\.(jpe?g|png|webp)$/i

function parseArgs() {
  const args = process.argv.slice(2)
  const value = (flag, fallback) => {
    const index = args.indexOf(flag)
    return index >= 0 && args[index + 1] ? args[index + 1] : fallback
  }
  return {
    input: path.resolve(value('--in', DEFAULT_IN)),
    out: path.resolve(value('--out', DEFAULT_OUT)),
    width: Number(value('--width', 1224)),
    quality: Number(value('--quality', 0.7)),
  }
}

async function readPages(file) {
  const reader = new ZipReader(new Uint8ArrayReader(new Uint8Array(await readFile(file))))
  try {
    const entries = (await reader.getEntries())
      .filter((entry) => !entry.directory && IMAGE_NAME.test(entry.filename))
      .sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }))
    if (entries.length === 0) throw new Error(`No image pages found in ${file}`)
    return Promise.all(
      entries.map(async (entry) => ({
        name: entry.filename,
        data: await entry.getData(new Uint8ArrayWriter()),
      })),
    )
  } finally {
    await reader.close()
  }
}

/** Runs inside the browser: resize and re-encode one page. */
async function processPage({ dataUrl, targetWidth, quality }) {
  const image = new Image()
  image.src = dataUrl
  await image.decode()
  const scale = Math.min(1, targetWidth / image.naturalWidth)
  const width = Math.round(image.naturalWidth * scale)
  const height = Math.round(image.naturalHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, width, height)
  const jpeg = canvas.toDataURL('image/jpeg', quality)
  canvas.width = 0
  canvas.height = 0
  return { jpeg: jpeg.slice(jpeg.indexOf(',') + 1), width, height }
}

async function main() {
  const { input, out, width, quality } = parseArgs()
  const pages = await readPages(input)
  console.log(`${path.relative(ROOT, input)} — ${pages.length} source pages`)
  if (pages.length < 12) {
    console.warn(`Warning: the source has ${pages.length} pages, below the 12–20 target.`)
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
    for (let index = 0; index < pages.length; index += 1) {
      const source = pages[index]
      const dataUrl = `data:image/jpeg;base64,${Buffer.from(source.data).toString('base64')}`
      const result = await page.evaluate(processPage, { dataUrl, targetWidth: width, quality })
      const jpeg = Buffer.from(result.jpeg, 'base64')
      entries.push({ name: `page-${String(index + 1).padStart(3, '0')}.jpg`, data: jpeg })
      console.log(
        `  ${String(index + 1).padStart(2, '0')}/${pages.length} ${source.name} → ` +
          `${result.width}×${result.height} ${(jpeg.length / 1024).toFixed(0)} kB`,
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
  if (megabytes < 1 || megabytes > 2) {
    console.warn(`Warning: archive is ${megabytes.toFixed(2)} MB, outside the 1–2 MB target.`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

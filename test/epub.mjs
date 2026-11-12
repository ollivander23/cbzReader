// Smoke test for the CBZ -> EPUB converter.
//
//   node test/epub.mjs
//
// The module is plain ESM with no browser APIs, so this runs in Node against a
// real archive from public/samples. It checks the EPUB structure by reopening
// the output with zip.js, then (if EPubCheck is available) hands the file to
// the official validator.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { BlobReader, ZipReader, Uint8ArrayReader, TextWriter } from '@zip.js/zip.js'

const root = process.cwd()
const cache = path.join(root, 'test', '.cache')
await mkdir(cache, { recursive: true })

const { convertCbzToEpub } = await import(
  pathToFileURL(path.join(cache, 'epub.bundle.mjs')).href
)

const sample = path.join(root, 'public', 'samples', 'little-nemo-1908.cbz')
const bytes = await readFile(sample)
const input = new Blob([bytes], { type: 'application/vnd.comicbook+zip' })

const started = Date.now()
const result = await convertCbzToEpub(input, {
  fileName: 'little-nemo-1908.cbz',
  onProgress: () => undefined,
})
const elapsed = Date.now() - started

const outFile = path.join(cache, 'little-nemo-1908.epub')
await writeFile(outFile, new Uint8Array(await result.blob.arrayBuffer()))

console.log(`epub: ${result.pages} pages, ${(result.blob.size / 1024).toFixed(0)} KB, ${elapsed} ms`)
console.log(`title: ${result.title}`)

// ---- structural checks, independent of EPubCheck -------------------------
const zip = new ZipReader(new BlobReader(result.blob))
const entries = await zip.getEntries()
const names = entries.map((entry) => entry.filename)

const failures = []
function check(name, ok, detail = '') {
  if (!ok) failures.push(`${name}${detail ? ` (${detail})` : ''}`)
}

check('first entry is mimetype', names[0] === 'mimetype', names[0])
const mimetypeEntry = entries.find((entry) => entry.filename === 'mimetype')
check(
  'mimetype is stored uncompressed',
  !!mimetypeEntry && mimetypeEntry.compressedSize === mimetypeEntry.uncompressedSize,
)
check('META-INF/container.xml present', names.includes('META-INF/container.xml'))
check('OEBPS/content.opf present', names.includes('OEBPS/content.opf'))
check('OEBPS/nav.xhtml present', names.includes('OEBPS/nav.xhtml'))

const readText = async (entry) => entry.getData(new TextWriter())

const container = await readText(entries.find((entry) => entry.filename === 'META-INF/container.xml'))
const rootfile = /full-path="([^"]+)"/.exec(container)?.[1]
check('container points at existing rootfile', !!rootfile && names.includes(rootfile), rootfile)

const opf = await readText(entries.find((entry) => entry.filename === rootfile))
const manifest = new Map()
for (const match of opf.matchAll(/<item\s+([^>]+?)\/>/g)) {
  const attrs = match[1]
  const id = /\bid="([^"]+)"/.exec(attrs)?.[1]
  const href = /\bhref="([^"]+)"/.exec(attrs)?.[1]
  if (id && href) manifest.set(id, href)
}
const spineIds = [...opf.matchAll(/<itemref\s+idref="([^"]+)"\s*\/>/g)].map((match) => match[1])

check('spine is not empty', spineIds.length === result.pages, `spine=${spineIds.length} pages=${result.pages}`)
for (const id of spineIds) {
  check(`spine id "${id}" is in the manifest`, manifest.has(id))
}
for (const [id, href] of manifest) {
  if (id === 'nav' || id === 'ncx') continue
  check(`manifest item "${id}" -> ${href} exists`, names.includes(`OEBPS/${href}`))
}

// Every image referenced by a page XHTML must exist, and vice versa.
const pageFiles = names.filter((name) => /^OEBPS\/page-\d+\.xhtml$/.test(name))
check('one XHTML per page', pageFiles.length === result.pages, String(pageFiles.length))
let referenced = 0
for (const name of pageFiles) {
  const html = await readText(entries.find((entry) => entry.filename === name))
  const src = /<img src="([^"]+)"/.exec(html)?.[1]
  check(`${name} references an existing image`, !!src && names.includes(`OEBPS/${src}`), src)
  if (src) referenced += 1
}
check('every page has one image', referenced === result.pages)

const imageFiles = names.filter((name) => /^OEBPS\/images\//.test(name))
check('one image per page', imageFiles.length === result.pages, String(imageFiles.length))

// A fixed-layout page without a viewport renders at an arbitrary size.
const firstPage = await readText(entries.find((entry) => entry.filename === pageFiles[0]))
check('page declares a viewport', /<meta name="viewport" content="width=\d+, height=\d+"\/>/.test(firstPage))

// xml:lang must be a language tag, not free text - EPUBCheck rejects anything else.
const opfLang = /<dc:language>([^<]+)<\/dc:language>/.exec(opf)?.[1]
check('package declares dc:language', !!opfLang, opfLang)
check('page xml:lang matches dc:language', !!opfLang && firstPage.includes(`xml:lang="${opfLang}"`))

await zip.close()

if (failures.length > 0) {
  console.error('\nSTRUCTURE FAILURES:')
  for (const failure of failures) console.error(` - ${failure}`)
  process.exitCode = 1
} else {
  console.log('structure: ok')
}

// ---- official validator, when present -----------------------------------
const epubcheck = path.join(cache, 'epubcheck', 'epubcheck.jar')
try {
  await access(epubcheck)
  const output = execFileSync('java', ['-jar', epubcheck, outFile], { encoding: 'utf8' })
  console.log(output.trim())
} catch (error) {
  if (error.stdout || error.stderr) {
    console.error((error.stdout ?? '') + (error.stderr ?? ''))
    process.exitCode = 1
  } else {
    console.log('epubcheck: not installed, skipped (java -jar test/.cache/epubcheck/epubcheck.jar)')
  }
}

if (process.exitCode === 1) console.error(`\noutput: ${outFile}`)

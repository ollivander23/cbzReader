/**
 * Generate CBZ test archives with large, unmistakable page numbers.
 *
 * Pages are rendered in headless Edge/Chrome and screenshotted, so every page
 * has crisp text at any zoom level. Output goes outside the repo by default.
 *
 *   node scripts/make-samples.mjs
 *   node scripts/make-samples.mjs --out D:\somewhere\archive
 */
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const OUT_DIR = process.env.SAMPLE_OUT || 'D:\\edgeDown\\testData\\archive'
const SCALE = 2 // deviceScaleFactor: CSS size * 2 = pixel size

const SAMPLES = [
  {
    file: 'demo-30pages.cbz',
    pages: 30,
    width: 1200,
    height: 1800,
    note: '普通尺寸，验证虚拟滚动窗口与页码连续',
  },
  {
    file: 'long-120pages.cbz',
    pages: 120,
    width: 900,
    height: 1350,
    note: '长包，验证窗口滑动与滚动性能',
  },
  {
    file: 'large-pages-20.cbz',
    pages: 20,
    width: 3000,
    height: 4500,
    note: '大页，验证内存预算、降采样与大图解码',
  },
  {
    file: 'long-name_Herman-Melville-Moby-Dick-Chapter-037-Complete-Scan.cbz',
    pages: 15,
    width: 1200,
    height: 1800,
    note: '超长文件名，验证工具栏中间省略',
  },
  {
    file: 'messy-order.cbz',
    pages: 12,
    width: 1200,
    height: 1800,
    note: '乱序命名，验证自然排序',
    shuffle: true,
    entryName: (page) => `${page}.png`,
  },
  {
    file: 'extreme-6pages-5000x7500.cbz',
    pages: 6,
    width: 5000,
    height: 7500,
    note: '极端大页，验证 canvas 面积钳制',
  },
]

/** Interleave 1, 10, 2, 11, 3, 12, ... so a naive string sort is visibly wrong. */
function interleaveOrder(total) {
  const first = []
  const rest = []
  for (let i = 1; i <= total; i += 1) (i < 10 ? first : rest).push(i)
  const order = []
  for (let i = 0; i < Math.max(first.length, rest.length); i += 1) {
    if (first[i] !== undefined) order.push(first[i])
    if (rest[i] !== undefined) order.push(rest[i])
  }
  return order
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let bit = 0; bit < 8; bit += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

function crc32(buffer) {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dosStamp(date) {
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, day }
}

/** Minimal STORE-only ZIP writer: images are already compressed. */
function buildZip(entries) {
  const { time, day } = dosStamp(new Date())
  const local = []
  const central = []
  let offset = 0

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8')
    const data = entry.data
    const crc = crc32(data)

    const header = Buffer.alloc(30)
    header.writeUInt32LE(0x04034b50, 0)
    header.writeUInt16LE(20, 4)
    header.writeUInt16LE(0x0800, 6) // UTF-8 names
    header.writeUInt16LE(0, 8) // store
    header.writeUInt16LE(time, 10)
    header.writeUInt16LE(day, 12)
    header.writeUInt32LE(crc, 14)
    header.writeUInt32LE(data.length, 18)
    header.writeUInt32LE(data.length, 22)
    header.writeUInt16LE(name.length, 26)
    header.writeUInt16LE(0, 28)
    local.push(header, name, data)

    const record = Buffer.alloc(46)
    record.writeUInt32LE(0x02014b50, 0)
    record.writeUInt16LE(20, 4)
    record.writeUInt16LE(20, 6)
    record.writeUInt16LE(0x0800, 8)
    record.writeUInt16LE(0, 10)
    record.writeUInt16LE(time, 12)
    record.writeUInt16LE(day, 14)
    record.writeUInt32LE(crc, 16)
    record.writeUInt32LE(data.length, 20)
    record.writeUInt32LE(data.length, 24)
    record.writeUInt16LE(name.length, 28)
    record.writeUInt32LE(offset, 42)
    central.push(record, name)

    offset += header.length + name.length + data.length
  }

  const directory = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)

  return Buffer.concat([...local, directory, end])
}

const PAGE_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; overflow: hidden; }
  body {
    font-family: "Segoe UI", "Microsoft YaHei", system-ui, sans-serif;
    background: hsl(var(--hue) 42% 12%);
  }
  .page {
    position: relative;
    width: 100vw; height: 100vh;
    padding: 4vh 4vw;
    display: flex; flex-direction: column; justify-content: space-between;
    background:
      repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 5vh),
      repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 1px, transparent 1px 5vw),
      linear-gradient(160deg, hsl(var(--hue) 55% 26%), hsl(calc(var(--hue) + 24) 60% 10%));
    color: #fff;
  }
  .page::after {
    content: "";
    position: absolute; inset: 2.2vh 2.2vw;
    border: 0.5vh solid rgba(255,255,255,.45);
    pointer-events: none;
  }
  .row {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: 3vw; font-size: 3.2vh; font-weight: 600; letter-spacing: .02em;
    text-shadow: 0 2px 6px rgba(0,0,0,.5);
  }
  .row span:first-child { max-width: 70%; overflow-wrap: anywhere; }
  .row span:last-child { flex: 0 0 auto; font-variant-numeric: tabular-nums; }
  .num {
    flex: 1; display: flex; align-items: center; justify-content: center;
    font-size: 40vh; font-weight: 900; line-height: .82;
    color: #fff; text-shadow: 0 0 4vh rgba(0,0,0,.55);
    font-variant-numeric: tabular-nums;
  }
  .num small { font-size: .32em; font-weight: 700; opacity: .75; margin-left: 1.2vw; }
  .caption {
    text-align: center; font-size: 4.2vh; font-weight: 700; letter-spacing: .35em;
    color: hsl(calc(var(--hue) + 40) 90% 78%);
  }
</style></head>
<body>
  <div class="page">
    <div class="row"><span class="file"></span><span class="mode">CBZ TEST</span></div>
    <div class="num"><span id="num"></span><small id="of"></small></div>
    <div class="caption" id="caption"></div>
    <div class="row"><span class="file"></span><span id="dim"></span></div>
  </div>
</body></html>`

function findBrowser() {
  const candidates = [
    process.env.EDGE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean)
  const found = candidates.find((candidate) => existsSync(candidate))
  if (!found) throw new Error('No Edge or Chrome found. Set EDGE_PATH to a browser executable.')
  return found
}

function parseArgs() {
  const args = process.argv.slice(2)
  const outIndex = args.indexOf('--out')
  const out = outIndex >= 0 && args[outIndex + 1] ? args[outIndex + 1] : OUT_DIR
  const only = args.find((arg) => arg.startsWith('--only='))?.slice('--only='.length)
  return { out, only }
}

async function renderSample(browser, sample, index, total, out) {
  const label = `[${index + 1}/${total}] ${sample.file}`
  const started = Date.now()
  console.log(
    `${label} — ${sample.pages} pages @ ${sample.width}×${sample.height} (${sample.note})`,
  )

  const page = await browser.newPage()
  await page.setViewport({
    width: Math.round(sample.width / SCALE),
    height: Math.round(sample.height / SCALE),
    deviceScaleFactor: SCALE,
  })
  await page.setContent(PAGE_HTML, { waitUntil: 'load' })

  const entries = []
  const title = sample.file.replace(/\.cbz$/i, '')
  const order = sample.shuffle
    ? interleaveOrder(sample.pages)
    : Array.from({ length: sample.pages }, (_, i) => i + 1)

  for (let step = 0; step < order.length; step += 1) {
    const human = order[step]
    await page.evaluate(
      ({ human, total: count, hue, title, width, height }) => {
        document.documentElement.style.setProperty('--hue', String(hue))
        document.getElementById('num').textContent = String(human)
        document.getElementById('of').textContent = `/ ${count}`
        document.getElementById('caption').textContent = `PAGE ${human} OF ${count}`
        document.getElementById('dim').textContent = `${width}×${height}`
        for (const node of document.querySelectorAll('.file')) node.textContent = title
      },
      {
        human,
        total: sample.pages,
        hue: Math.round((human * 137.5) % 360),
        title,
        width: sample.width,
        height: sample.height,
      },
    )

    const shot = await page.screenshot({ type: 'png', captureBeyondViewport: false })
    const name = sample.entryName
      ? sample.entryName(human)
      : `page-${String(human).padStart(3, '0')}.png`
    entries.push({ name, data: Buffer.from(shot) })

    if ((step + 1) % 20 === 0 || step + 1 === order.length) {
      console.log(`  ${label} ${step + 1}/${order.length}`)
    }
  }

  await page.close()
  const zip = buildZip(entries)
  const target = path.join(out, sample.file)
  await writeFile(target, zip)

  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  console.log(`  ${label} saved ${target} (${(zip.length / 1024 / 1024).toFixed(2)} MB, ${seconds}s)`)
  return {
    file: sample.file,
    pages: sample.pages,
    size: `${sample.width}×${sample.height}`,
    bytes: zip.length,
  }
}

async function main() {
  const { out, only } = parseArgs()
  await mkdir(out, { recursive: true })
  const samples = only ? SAMPLES.filter((sample) => sample.file.includes(only)) : SAMPLES
  if (samples.length === 0) throw new Error(`No sample matched --only=${only}`)

  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: true,
    args: ['--hide-scrollbars'],
  })

  const results = []
  try {
    for (let i = 0; i < samples.length; i += 1) {
      results.push(await renderSample(browser, samples[i], i, samples.length, out))
    }
  } finally {
    await browser.close()
  }

  console.log(`\nOutput: ${out}`)
  console.log('file                                     pages   page size    size')
  for (const item of results) {
    console.log(
      `${item.file.padEnd(40)} ${String(item.pages).padStart(5)}   ${item.size.padEnd(12)} ${(
        item.bytes / 1024 / 1024
      ).toFixed(2)} MB`,
    )
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ConversionError, convertCbzToPdf, type PageSize } from './pdf'
import { track } from '../lib/track'

const props = defineProps<{ initialFile?: File | null }>()

type Phase = 'idle' | 'ready' | 'working' | 'done' | 'error'

const phase = ref<Phase>('idle')
const pageSize = ref<PageSize>('original')
const file = ref<File | null>(null)
const done = ref(0)
const total = ref(0)
const pages = ref(0)
const errorMessage = ref('')
const downloadUrl = ref('')
const downloadBytes = ref(0)
const dragging = ref(false)

const input = ref<HTMLInputElement | null>(null)
let controller: AbortController | null = null
let objectUrl = ''

const percent = computed(() =>
  total.value === 0 ? 0 : Math.min(100, Math.round((done.value / total.value) * 100)),
)
const progressText = computed(() =>
  total.value === 0 ? 'Reading the archive' : `Page ${done.value} of ${total.value}`,
)
const pdfName = computed(() => {
  const name = file.value?.name ?? 'comic'
  return `${name.replace(/\.[^.]+$/, '') || 'comic'}.pdf`
})
const sizeLabel = computed(() => {
  const mb = downloadBytes.value / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(downloadBytes.value / 1024))} KB`
})

function releaseDownload(): void {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = ''
  }
  downloadUrl.value = ''
}

function pick(): void {
  input.value?.click()
}

function accept(next: File | null | undefined): void {
  if (!next || phase.value === 'working') return
  releaseDownload()
  errorMessage.value = ''
  downloadBytes.value = 0
  done.value = 0
  total.value = 0
  pages.value = 0
  file.value = next
  phase.value = 'ready'
}

function onPick(event: Event): void {
  const target = event.target as HTMLInputElement
  accept(target.files?.[0])
  target.value = ''
}

function onDrop(event: DragEvent): void {
  dragging.value = false
  accept(event.dataTransfer?.files?.[0])
}

function download(): void {
  if (!downloadUrl.value) return
  const link = document.createElement('a')
  link.href = downloadUrl.value
  link.download = pdfName.value
  document.body.appendChild(link)
  link.click()
  link.remove()
}

async function convert(): Promise<void> {
  const source = file.value
  if (!source || phase.value === 'working') return

  controller = new AbortController()
  done.value = 0
  total.value = 0
  errorMessage.value = ''
  releaseDownload()
  phase.value = 'working'
  track('conv_start', { page_size: pageSize.value })
  const startedAt = performance.now()

  try {
    const result = await convertCbzToPdf(source, {
      pageSize: pageSize.value,
      signal: controller.signal,
      onProgress: (current, count) => {
        done.value = current
        total.value = count
      },
    })

    objectUrl = URL.createObjectURL(result.blob)
    downloadUrl.value = objectUrl
    downloadBytes.value = result.blob.size
    pages.value = result.pages
    phase.value = 'done'
    track('conv_success', {
      pages: result.pages,
      ms: Math.round(performance.now() - startedAt),
      page_size: pageSize.value,
    })
    download()
  } catch (error) {
    const reason = error instanceof ConversionError ? error.reason : 'unknown'
    track('conv_fail', { reason, page_size: pageSize.value })
    if (reason === 'cancelled') {
      phase.value = file.value ? 'ready' : 'idle'
      return
    }
    errorMessage.value =
      error instanceof ConversionError
        ? error.message
        : 'Conversion failed for an unknown reason. Try again or use a different archive.'
    phase.value = 'error'
  } finally {
    controller = null
  }
}

function cancel(): void {
  controller?.abort()
}

function reset(): void {
  controller?.abort()
  releaseDownload()
  file.value = null
  errorMessage.value = ''
  pages.value = 0
  downloadBytes.value = 0
  done.value = 0
  total.value = 0
  phase.value = 'idle'
}

onMounted(() => {
  if (props.initialFile) accept(props.initialFile)
})

onBeforeUnmount(() => {
  controller?.abort()
  releaseDownload()
})
</script>

<template>
  <div
    class="conv"
    :class="{ 'conv--drag': dragging }"
    @dragover.prevent="dragging = true"
    @dragleave="dragging = false"
    @drop.prevent="onDrop"
  >
    <div v-if="phase === 'idle'" class="conv__panel">
      <p class="conv__kicker">CBZ → PDF</p>
      <h2 class="conv__title">Convert a CBZ to PDF</h2>
      <p class="conv__lead">
        Drop a .cbz file here, or choose one from your device. The archive is unpacked and the
        PDF is built in this tab.
      </p>
      <button class="conv__primary" type="button" data-convert-open @click="pick">
        Choose a CBZ file
      </button>
      <input
        ref="input"
        class="conv__input"
        type="file"
        accept=".cbz,.zip"
        aria-label="Choose a CBZ file to convert"
        @change="onPick"
      />
      <p class="conv__fine">Nothing is uploaded. JPEG pages are embedded without re-encoding.</p>
    </div>

    <div v-else-if="phase === 'ready'" class="conv__panel">
      <p class="conv__kicker">Ready to convert</p>
      <h2 class="conv__title">{{ pdfName }}</h2>
      <p class="conv__lead conv__file">{{ file?.name }}</p>

      <fieldset class="conv__options">
        <legend class="conv__legend">Page size</legend>
        <label class="conv__option">
          <input v-model="pageSize" type="radio" value="original" name="page-size" />
          <span>
            <strong>Original size</strong>
            <small>Each page matches the image pixels exactly. Nothing is scaled.</small>
          </span>
        </label>
        <label class="conv__option">
          <input v-model="pageSize" type="radio" value="a4" name="page-size" />
          <span>
            <strong>Fit to A4</strong>
            <small>Pages are scaled to fit A4 without cropping, for printing.</small>
          </span>
        </label>
      </fieldset>

      <div class="conv__actions">
        <button class="conv__primary" type="button" data-convert-start @click="convert">
          Convert to PDF
        </button>
        <button class="conv__secondary" type="button" data-convert-reset @click="reset">
          Choose another file
        </button>
      </div>
      <p class="conv__fine">The PDF downloads as soon as it is ready.</p>
    </div>

    <div v-else-if="phase === 'working'" class="conv__panel">
      <p class="conv__kicker">Converting</p>
      <h2 class="conv__title">Building the PDF…</h2>
      <p class="conv__lead conv__file">{{ file?.name }}</p>
      <div
        class="conv__bar"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="percent"
        :aria-valuetext="progressText"
      >
        <span :style="{ width: `${percent}%` }"></span>
      </div>
      <p class="conv__fine">{{ progressText }} · {{ percent }}%</p>
      <button class="conv__secondary" type="button" data-convert-cancel @click="cancel">
        Cancel
      </button>
    </div>

    <div v-else-if="phase === 'done'" class="conv__panel">
      <p class="conv__kicker">Done</p>
      <h2 class="conv__title">Your PDF is ready</h2>
      <p class="conv__lead">
        {{ pages }} {{ pages === 1 ? 'page' : 'pages' }} · {{ sizeLabel }}
        <span v-if="pageSize === 'a4'"> · A4</span>
        <span v-else> · original page size</span>
      </p>
      <div class="conv__actions">
        <a class="conv__primary" :href="downloadUrl" :download="pdfName" data-convert-download>
          Download {{ pdfName }}
        </a>
        <button class="conv__secondary" type="button" data-convert-reset @click="reset">
          Convert another file
        </button>
      </div>
      <p class="conv__fine">The file never left your device.</p>
    </div>

    <div v-else class="conv__panel">
      <p class="conv__kicker">Could not convert</p>
      <h2 class="conv__title">This file could not be turned into a PDF</h2>
      <p class="conv__error" role="alert">{{ errorMessage }}</p>
      <button class="conv__secondary" type="button" data-convert-reset @click="reset">
        Try another file
      </button>
    </div>
  </div>
</template>

<style scoped>
.conv {
  min-height: 260px;
  border-radius: calc(var(--radius) - 4px);
  background: var(--surface);
  color: var(--ink);
  padding: 30px 26px;
  transition: outline-color 0.15s ease;
  outline: 2px dashed transparent;
  outline-offset: -10px;
}

.conv--drag {
  outline-color: var(--accent-line);
}

.conv__panel {
  max-width: 34rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: center;
  align-items: center;
}

.conv__kicker {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}

.conv__title {
  margin: 0;
  font-size: clamp(1.25rem, 3vw, 1.6rem);
  line-height: 1.25;
  word-break: break-word;
}

.conv__lead {
  margin: 0;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.6;
}

.conv__file {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--ink-soft);
  word-break: break-all;
}

.conv__input {
  display: none;
}

.conv__options {
  margin: 6px 0 0;
  padding: 0;
  border: 0;
  display: grid;
  gap: 8px;
  width: 100%;
  text-align: left;
}

.conv__legend {
  padding: 0;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft);
}

.conv__option {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  cursor: pointer;
  background: var(--card-bg);
}

.conv__option:hover {
  border-color: var(--line-strong);
}

.conv__option:has(input:checked) {
  border-color: var(--accent-line);
  background: var(--accent-soft);
}

.conv__option input {
  margin-top: 3px;
  accent-color: var(--accent);
}

.conv__option span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.conv__option strong {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.conv__option small {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.45;
}

.conv__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-top: 4px;
}

.conv__primary,
.conv__secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 20px;
  border-radius: 999px;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
}

.conv__primary {
  background: var(--btn-bg);
  color: var(--btn-ink);
}

.conv__primary:hover {
  background: var(--btn-hover);
}

.conv__secondary {
  background: transparent;
  border-color: var(--line-strong);
  color: var(--ink);
}

.conv__secondary:hover {
  background: var(--hover-fill);
}

.conv__primary:focus-visible,
.conv__secondary:focus-visible,
.conv__option input:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

.conv__bar {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: var(--line);
  overflow: hidden;
}

.conv__bar span {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 0.12s linear;
}

.conv__fine {
  margin: 0;
  font-size: 13px;
  color: var(--faint);
}

.conv__error {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--notice-line);
  background: var(--notice-bg);
  color: var(--notice-ink);
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.55;
  text-align: left;
}

@media (max-width: 760px) {
  .conv {
    min-height: 260px;
    padding: 24px 14px;
  }
}
</style>

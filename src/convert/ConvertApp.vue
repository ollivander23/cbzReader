<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ConversionError, convertCbzToPdf, type PageSize } from './pdf'
import { track } from '../lib/track'

const props = defineProps<{ initialFile?: File | null }>()

const { t } = useI18n()

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
  total.value === 0
    ? t('convert.reading')
    : t('convert.progress', { done: done.value, total: total.value }),
)

// The reason is a stable enum; the library's own message is English prose, so
// the panel shows a translated line per reason instead of echoing it.
const CONVERT_ERROR_KEYS: Record<string, string> = {
  'not-zip': 'convert.errNotZip',
  encrypted: 'convert.errEncrypted',
  'no-images': 'convert.errNoImages',
  memory: 'convert.errMemory',
}
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
    errorMessage.value = t(CONVERT_ERROR_KEYS[reason] ?? 'convert.errUnknown')
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
      <p class="conv__kicker">{{ t('convert.kicker') }}</p>
      <h2 class="conv__title">{{ t('convert.title') }}</h2>
      <p class="conv__lead">{{ t('convert.lead') }}</p>
      <button class="conv__primary" type="button" data-convert-open @click="pick">
        {{ t('convert.choose') }}
      </button>
      <input
        ref="input"
        class="conv__input"
        type="file"
        accept=".cbz,.zip"
        :aria-label="t('convert.chooseAria')"
        @change="onPick"
      />
      <p class="conv__fine">{{ t('convert.fine') }}</p>
    </div>

    <div v-else-if="phase === 'ready'" class="conv__panel">
      <p class="conv__kicker">{{ t('convert.ready') }}</p>
      <h2 class="conv__title">{{ pdfName }}</h2>
      <p class="conv__lead conv__file">{{ file?.name }}</p>

      <fieldset class="conv__options">
        <legend class="conv__legend">{{ t('convert.pageSize') }}</legend>
        <label class="conv__option">
          <input v-model="pageSize" type="radio" value="original" name="page-size" />
          <span>
            <strong>{{ t('convert.sizeOriginal') }}</strong>
            <small>{{ t('convert.sizeOriginalNote') }}</small>
          </span>
        </label>
        <label class="conv__option">
          <input v-model="pageSize" type="radio" value="a4" name="page-size" />
          <span>
            <strong>{{ t('convert.sizeA4') }}</strong>
            <small>{{ t('convert.sizeA4Note') }}</small>
          </span>
        </label>
      </fieldset>

      <div class="conv__actions">
        <button class="conv__primary" type="button" data-convert-start @click="convert">
          {{ t('convert.start') }}
        </button>
        <button class="conv__secondary" type="button" data-convert-reset @click="reset">
          {{ t('convert.startAnother') }}
        </button>
      </div>
      <p class="conv__fine">{{ t('convert.fineDownload') }}</p>
    </div>

    <div v-else-if="phase === 'working'" class="conv__panel">
      <p class="conv__kicker">{{ t('convert.working') }}</p>
      <h2 class="conv__title">{{ t('convert.building') }}</h2>
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
        {{ t('convert.cancel') }}
      </button>
    </div>

    <div v-else-if="phase === 'done'" class="conv__panel">
      <p class="conv__kicker">{{ t('convert.done') }}</p>
      <h2 class="conv__title">{{ t('convert.readyTitle') }}</h2>
      <p class="conv__lead">
        {{
          pages === 1
            ? t('convert.pagesOne', { count: pages })
            : t('convert.pagesMany', { count: pages })
        }}
        · {{ sizeLabel }}
        <span v-if="pageSize === 'a4'"> · {{ t('convert.a4Note') }}</span>
        <span v-else> · {{ t('convert.originalNote') }}</span>
      </p>
      <div class="conv__actions">
        <a class="conv__primary" :href="downloadUrl" :download="pdfName" data-convert-download>
          {{ t('convert.download', { name: pdfName }) }}
        </a>
        <button class="conv__secondary" type="button" data-convert-reset @click="reset">
          {{ t('convert.convertAnother') }}
        </button>
      </div>
      <p class="conv__fine">{{ t('convert.fineDone') }}</p>
    </div>

    <div v-else class="conv__panel">
      <p class="conv__kicker">{{ t('convert.failed') }}</p>
      <h2 class="conv__title">{{ t('convert.failedTitle') }}</h2>
      <p class="conv__error" role="alert">{{ errorMessage }}</p>
      <button class="conv__secondary" type="button" data-convert-reset @click="reset">
        {{ t('convert.tryAnother') }}
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

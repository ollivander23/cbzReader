<script setup lang="ts">
import { computed } from 'vue'
import { NAV, SITE } from '../content/site'
import { findPage, type PageContent } from '../content/pages'

const props = defineProps<{ page: PageContent }>()

const related = computed(() =>
  props.page.related.map((path) => {
    const page = findPage(path)
    return { path, label: page.h1 }
  }),
)

const year = 2026
const DEFAULT_TRUST = ['No upload', 'No account', 'Right-to-left ready', 'Remembers your page']
const trustItems = computed(() => props.page.trust ?? DEFAULT_TRUST)
</script>

<template>
  <header class="site-header">
    <div class="site-header__inner">
      <a class="brand" href="/">
        <span class="brand__mark" aria-hidden="true">CBZ</span>
        <span>{{ SITE.name }}</span>
      </a>
      <div class="site-header__actions">
        <nav class="site-nav" aria-label="Primary">
          <a
            v-for="item in NAV"
            :key="item.href"
            :href="item.href"
            :aria-current="page.path === item.href ? 'page' : undefined"
          >
            {{ item.label }}
          </a>
        </nav>
        <div class="theme-switch">
          <button
            type="button"
            class="theme-switch__trigger"
            aria-label="Switch to dark theme"
            aria-pressed="false"
            title="Switch to dark theme"
          >
            <svg class="theme-switch__icon theme-switch__icon--sun" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="8" r="3" />
              <path
                d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"
              />
            </svg>
            <svg class="theme-switch__icon theme-switch__icon--moon" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M12.5 9.6A5.5 5.5 0 0 1 6.4 3.5a5.5 5.5 0 1 0 6.1 6.1z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </header>

  <main class="wrap">
    <nav v-if="page.path !== '/'" class="crumbs" aria-label="Breadcrumb">
      <a href="/">Reader</a>
      <span aria-hidden="true">/</span>
      <span>{{ page.eyebrow }}</span>
    </nav>

    <section class="hero">
      <p class="eyebrow">{{ page.eyebrow }}</p>
      <h1>{{ page.h1 }}</h1>
      <p class="lead">{{ page.lead }}</p>
      <div v-if="page.tool" class="doors">
        <a class="door" href="#reader">
          <span class="door__kicker">CBZ / ZIP</span>
          <strong>Read in the browser</strong>
          <span class="door__note">Open the archive and turn pages right away. Nothing is uploaded.</span>
          <span class="door__cta">Pick a file</span>
        </a>
        <a class="door" href="/cbz-to-pdf/">
          <span class="door__kicker">CBZ → PDF</span>
          <strong>Convert to PDF</strong>
          <span class="door__note">Rebuild the same archive as a PDF, with original sizes or A4 pages.</span>
          <span class="door__cta">Open the converter</span>
        </a>
      </div>
      <ul class="trust">
        <li v-for="item in trustItems" :key="item">{{ item }}</li>
      </ul>
    </section>

    <section v-if="page.tool" id="recent-shelf" class="shelf" hidden aria-labelledby="recent-title">
      <div class="shelf__head">
        <h2 id="recent-title">Recently opened</h2>
        <button type="button" class="shelf__clear" data-recent-clear>Clear all</button>
      </div>
      <ul class="shelf__list" data-recent-list></ul>
      <p class="shelf__hint" data-recent-hint hidden></p>
    </section>

    <section v-if="page.tool" id="reader" class="reader-section" aria-label="CBZ reader">
      <div class="reader-frame">
        <div id="reader-app">
          <div class="reader-fallback">
            <div class="dropzone">
              <p class="dropzone__kicker">CBZ / ZIP</p>
              <h2>Open a CBZ file</h2>
              <p>Drop a .cbz file here, or choose one from your device. The archive is read locally.</p>
              <button class="btn-primary" type="button" data-open-reader>
                Choose a CBZ file
              </button>
              <input
                type="file"
                hidden
                accept=".cbz,.zip,application/vnd.comicbook+zip,application/zip"
                aria-label="Choose a CBZ file"
              />
              <p class="dropzone__fine">Nothing is uploaded. Works with CBZ and ZIP archives.</p>
              <p class="dropzone__sample"><a href="/demo/">No file handy? Open the sample</a></p>
            </div>
          </div>
        </div>
      </div>
      <p class="reader-note">
        Tip: on iPhone or iPad, open this page first, then pick the file from the Files app. iOS does
        not let websites register as file handlers.
      </p>
      <noscript>
        <p class="noscript">
          JavaScript is required to unpack and display CBZ pages. The parsing runs entirely in your
          browser; nothing is sent to a server.
        </p>
      </noscript>
    </section>

    <section v-if="page.converter" id="converter" class="converter-section" aria-label="CBZ to PDF converter">
      <div class="converter-shell">
        <div id="converter-app">
          <div class="converter-fallback">
            <p class="converter-kicker">CBZ → PDF</p>
            <h2>Convert a CBZ to PDF</h2>
            <p>
              Drop a .cbz file here, or choose one from your device. The archive is unpacked and
              the PDF is built in this tab.
            </p>
            <button class="btn-primary" type="button" data-convert-open>Choose a CBZ file</button>
            <input
              type="file"
              hidden
              accept=".cbz,.zip,application/vnd.comicbook+zip,application/zip"
              aria-label="Choose a CBZ file to convert"
            />
            <p class="converter-fine">
              Nothing is uploaded. JPEG pages are embedded without re-encoding.
            </p>
          </div>
        </div>
      </div>
      <noscript>
        <p class="noscript">
          JavaScript is required to unpack the archive and build the PDF. Everything runs in your
          browser; the file is never sent to a server.
        </p>
      </noscript>
    </section>

    <div class="content">
      <section v-for="section in page.sections" :key="section.heading">
        <h2>{{ section.heading }}</h2>
        <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
        <p v-if="section.contact && page.contact" class="contact">
          <a :href="`mailto:${page.contact}`">{{ page.contact }}</a>
        </p>
        <ul v-if="section.bullets">
          <li v-for="bullet in section.bullets" :key="bullet">{{ bullet }}</li>
        </ul>
        <aside v-if="section.note" class="section-note">
          <h3>{{ section.note.title }}</h3>
          <p v-for="paragraph in section.note.paragraphs" :key="paragraph">{{ paragraph }}</p>
          <ul v-if="section.note.bullets">
            <li v-for="bullet in section.note.bullets" :key="bullet">{{ bullet }}</li>
          </ul>
        </aside>
      </section>
    </div>

    <section v-if="page.tools" class="tools" aria-labelledby="tools-heading">
      <h2 id="tools-heading">More CBZ tools</h2>
      <p class="tools__intro">Convert an archive, look up a format detail, or fix a file that will not open.</p>
      <div class="tools__grid">
        <a v-for="tool in page.tools" :key="tool.href" class="tool-card" :href="tool.href">
          <span class="tool-card__kind">{{ tool.kind === 'tool' ? 'Tool' : 'Guide' }}</span>
          <span class="tool-card__label">{{ tool.label }}</span>
          <span class="tool-card__note">{{ tool.note }}</span>
        </a>
      </div>
    </section>

    <p v-if="page.bridge" class="bridge">
      <span>{{ page.bridge.text }}</span>
      <a :href="page.bridge.href">{{ page.bridge.label }}</a>
    </p>

    <section class="faq" aria-labelledby="faq-heading">
      <h2 id="faq-heading">Questions</h2>
      <details v-for="item in page.faq" :key="item.question">
        <summary>{{ item.question }}</summary>
        <p>{{ item.answer }}</p>
      </details>
    </section>

    <section v-if="!page.tool" class="cta">
      <div>
        <h2>Read a CBZ right now</h2>
        <p>Drop a file into the reader. It stays on your device.</p>
      </div>
      <a class="btn-primary" href="/">Open the CBZ reader</a>
    </section>

    <section v-if="related.length" class="related" aria-labelledby="related-heading">
      <h2 id="related-heading">Keep reading</h2>
      <div class="related__grid">
        <a v-for="item in related" :key="item.path" :href="item.path">
          <span>{{ item.label }}</span>
        </a>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="site-footer__inner">
      <span>&copy; {{ year }} {{ SITE.name }}. Files stay on your device.</span>
      <nav aria-label="Footer">
        <a href="/">Reader</a>
        <a href="/cbz-to-pdf/">CBZ to PDF</a>
        <a href="/how-to-open-cbz/">How to open CBZ</a>
        <a href="/manga-reader/">Manga mode</a>
        <a href="/cbz-vs-cbr/">CBZ vs CBR</a>
        <a href="/privacy/">Privacy</a>
        <a href="/terms/">Terms</a>
        <a href="/disclaimer/">Disclaimer</a>
      </nav>
    </div>
  </footer>
</template>

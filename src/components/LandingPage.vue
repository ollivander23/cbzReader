<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NAV, SITE } from '../content/site'
import { findPage, type PageContent } from '../content/pages'

const props = defineProps<{ page: PageContent }>()
const { t, tm, locale } = useI18n()

const related = computed(() =>
  props.page.related.map((path) => {
    const page = findPage(path)
    return { path, label: page.h1 }
  }),
)

const year = 2026
const isLocalized = computed(() => locale.value !== 'en')
const homeHref = computed(() => (isLocalized.value ? `/${locale.value}/` : '/'))
const isHome = computed(() => ['/', '/zh/', '/ja/'].includes(props.page.path))
const navItems = computed(() =>
  NAV.map((item) => ({
    ...item,
    label: t(item.labelKey),
    href: item.href === '/' ? homeHref.value : item.href,
  })),
)
const DEFAULT_TRUST = computed(() => tm('home.defaultTrust') as string[])
const trustItems = computed(() => props.page.trust ?? DEFAULT_TRUST.value)

function toolKindLabel(kind: 'sample' | 'tool' | 'guide'): string {
  if (kind === 'sample') return t('home.kindSample')
  if (kind === 'tool') return t('home.kindTool')
  return t('home.kindGuide')
}
</script>

<template>
  <header class="site-header">
    <div class="site-header__inner">
      <a class="brand" :href="homeHref">
        <span class="brand__mark" aria-hidden="true">CBZ</span>
        <span>{{ SITE.name }}</span>
      </a>
      <div class="site-header__actions">
        <nav class="site-nav" :aria-label="t('nav.primary')">
          <a
            v-for="item in navItems"
            :key="item.href"
            :href="item.href"
            :aria-current="page.path === item.href ? 'page' : undefined"
          >
            {{ item.label }}
          </a>
        </nav>
        <div class="lang-switch">
          <select
            class="lang-switch__select"
            :aria-label="t('header.language')"
            :data-en-href="isLocalized ? '/' : page.path"
            data-lang-switch
          >
            <option value="en" :selected="locale === 'en'">EN</option>
            <option value="zh" :selected="locale === 'zh'">中文</option>
            <option value="ja" :selected="locale === 'ja'">日本語</option>
          </select>
        </div>
        <div class="theme-switch">
          <button
            type="button"
            class="theme-switch__trigger"
            :aria-label="t('header.themeDark')"
            aria-pressed="false"
            :title="t('header.themeDark')"
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
    <nav v-if="!isHome" class="crumbs" :aria-label="t('breadcrumb.label')">
      <a :href="homeHref">{{ t('breadcrumb.reader') }}</a>
      <span aria-hidden="true">/</span>
      <span>{{ page.eyebrow }}</span>
    </nav>

    <section class="hero">
      <p v-if="!isHome" class="eyebrow">{{ page.eyebrow }}</p>
      <h1>{{ page.h1 }}</h1>
      <p class="lead">{{ page.lead }}</p>
      <div v-if="page.tool" class="doors">
        <a class="door" href="#reader">
          <span class="door__kicker">CBZ / ZIP</span>
          <strong>{{ t('home.readInBrowser') }}</strong>
          <span class="door__note">{{ t('home.readNote') }}</span>
          <span class="door__cta">{{ t('home.pickFile') }}</span>
        </a>
        <a class="door" href="/cbz-to-pdf/">
          <span class="door__kicker">CBZ → PDF</span>
          <strong>{{ t('home.convertTitle') }}</strong>
          <span class="door__note">{{ t('home.convertNote') }}</span>
          <span class="door__cta">{{ t('home.openConverter') }}</span>
        </a>
      </div>
      <a v-if="page.tool" class="sample-link" href="/demo/">
        <span class="sample-link__title">{{ t('home.sampleTitle') }}</span>
        <span class="sample-link__note">{{ t('home.sampleNote') }}</span>
      </a>
      <ul class="trust">
        <li v-for="item in trustItems" :key="item">{{ item }}</li>
      </ul>
    </section>

    <section v-if="page.tool" id="recent-shelf" class="shelf" hidden aria-labelledby="recent-title">
      <div class="shelf__head">
        <h2 id="recent-title">{{ t('home.recentTitle') }}</h2>
        <button type="button" class="shelf__clear" data-recent-clear>{{ t('home.clearAll') }}</button>
      </div>
      <ul class="shelf__list" data-recent-list></ul>
      <p class="shelf__hint" data-recent-hint hidden></p>
    </section>

    <section v-if="page.tool" id="reader" class="reader-section" :aria-label="t('home.readerLabel')">
      <div class="reader-frame">
        <div id="reader-app">
          <div class="reader-fallback">
            <div class="dropzone">
              <p class="dropzone__kicker">CBZ / ZIP</p>
              <h2>{{ t('home.openTitle') }}</h2>
              <p>{{ t('home.openLead') }}</p>
              <button class="btn-primary" type="button" data-open-reader>
                {{ t('home.choose') }}
              </button>
              <input
                type="file"
                hidden
                accept=".cbz,.zip,application/vnd.comicbook+zip,application/zip"
                :aria-label="t('home.choose')"
              />
              <p class="dropzone__fine">{{ t('home.fine') }}</p>
            </div>
          </div>
        </div>
      </div>
      <p class="reader-note">{{ t('home.tip') }}</p>
      <noscript>
        <p class="noscript">{{ t('home.noscript') }}</p>
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

    <div v-if="page.sections.length" class="content">
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
      <h2 id="tools-heading">{{ t('home.toolsHeading') }}</h2>
      <p class="tools__intro">{{ t('home.toolsIntro') }}</p>
      <div class="tools__grid">
        <a v-for="tool in page.tools" :key="tool.href" class="tool-card" :href="tool.href">
          <span class="tool-card__kind">{{ toolKindLabel(tool.kind) }}</span>
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
      <h2 id="faq-heading">{{ t('home.questions') }}</h2>
      <details v-for="item in page.faq" :key="item.question">
        <summary>{{ item.question }}</summary>
        <p>{{ item.answer }}</p>
      </details>
    </section>

    <section v-if="!page.tool" class="cta">
      <div>
        <h2>{{ t('home.ctaTitle') }}</h2>
        <p>{{ t('home.ctaLead') }}</p>
      </div>
      <a class="btn-primary" :href="homeHref">{{ t('home.ctaButton') }}</a>
    </section>

    <section v-if="related.length" class="related" aria-labelledby="related-heading">
      <h2 id="related-heading">{{ t('home.related') }}</h2>
      <div class="related__grid">
        <a v-for="item in related" :key="item.path" :href="item.path">
          <span>{{ item.label }}</span>
        </a>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="site-footer__inner">
      <span>&copy; {{ year }} {{ SITE.name }}. {{ t('footer.tagline') }}</span>
      <nav :aria-label="t('footer.label')">
        <a :href="homeHref">{{ t('nav.reader') }}</a>
        <a href="/cbz-to-pdf/">{{ t('nav.cbzToPdf') }}</a>
        <a href="/how-to-open-cbz/">{{ t('nav.howToOpen') }}</a>
        <a href="/manga-reader/">{{ t('nav.mangaMode') }}</a>
        <a href="/cbz-vs-cbr/">{{ t('nav.compare') }}</a>
        <a href="/privacy/">{{ t('footer.privacy') }}</a>
        <a href="/terms/">{{ t('footer.terms') }}</a>
        <a href="/disclaimer/">{{ t('footer.disclaimer') }}</a>
      </nav>
    </div>
  </footer>
</template>

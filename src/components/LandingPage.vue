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
</script>

<template>
  <header class="site-header">
    <div class="site-header__inner">
      <a class="brand" href="/">
        <span class="brand__mark" aria-hidden="true">CB</span>
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
            aria-label="Change color theme"
            aria-haspopup="menu"
            aria-controls="site-theme-menu"
            aria-expanded="false"
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
          <div class="theme-switch__menu" id="site-theme-menu" role="menu" aria-label="Color theme" hidden>
            <button
              type="button"
              class="theme-switch__item"
              role="menuitemradio"
              aria-checked="true"
              data-theme-value="auto"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="5.5" />
                <path d="M8 2.5v11" />
              </svg>
              <span>Auto</span>
              <span class="theme-switch__check" aria-hidden="true">✓</span>
            </button>
            <button
              type="button"
              class="theme-switch__item"
              role="menuitemradio"
              aria-checked="false"
              data-theme-value="light"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="3" />
                <path
                  d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"
                />
              </svg>
              <span>Light</span>
              <span class="theme-switch__check" aria-hidden="true">✓</span>
            </button>
            <button
              type="button"
              class="theme-switch__item"
              role="menuitemradio"
              aria-checked="false"
              data-theme-value="dark"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M12.5 9.6A5.5 5.5 0 0 1 6.4 3.5a5.5 5.5 0 1 0 6.1 6.1z" />
              </svg>
              <span>Dark</span>
              <span class="theme-switch__check" aria-hidden="true">✓</span>
            </button>
          </div>
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
      <ul class="trust">
        <li>No upload</li>
        <li>No account</li>
        <li>Right-to-left ready</li>
        <li>Remembers your page</li>
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

    <div class="content">
      <section v-for="section in page.sections" :key="section.heading">
        <h2>{{ section.heading }}</h2>
        <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
        <ul v-if="section.bullets">
          <li v-for="bullet in section.bullets" :key="bullet">{{ bullet }}</li>
        </ul>
      </section>
    </div>

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

    <section class="related" aria-labelledby="related-heading">
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
        <a href="/how-to-open-cbz/">How to open CBZ</a>
        <a href="/manga-reader/">Manga mode</a>
        <a href="/cbz-vs-cbr/">CBZ vs CBR</a>
        <a href="/privacy/">Privacy</a>
      </nav>
    </div>
  </footer>
</template>

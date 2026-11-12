import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import DemoPage from '../components/DemoPage.vue'
import LandingPage from '../components/LandingPage.vue'
import { PAGES, findPage, type PageContent } from '../content/pages'
import {
  HOME_ALTERNATES,
  LOCALIZED_CONTENT_PAGES,
  LOCALIZED_HOME_PAGES,
  alternatesForPath,
  createSiteI18n,
  htmlLang,
  localeFromPath,
  type SiteLocale,
} from '../i18n'
import { renderDemoHead, renderHead } from './head'

const siteUrl =
  ((globalThis as Record<string, unknown>).__SITE_URL__ as string | undefined) ??
  'https://your-domain.com'

export interface PrerenderAlternate {
  hreflang: string
  path: string
}

export interface PrerenderRoute {
  path: string
  lang: string
  alternates: readonly PrerenderAlternate[]
  /** Editorial date of the page, written to the sitemap as lastmod. */
  updated?: string
  noindex?: boolean
}

// Only the home page exists in three languages for now. Untranslated content
// pages expose English plus x-default, so search engines never see a language
// variant with no real content behind it.
function englishAlternates(path: string): PrerenderAlternate[] {
  return [
    { hreflang: 'en', path },
    { hreflang: 'x-default', path },
  ]
}

export const routes: PrerenderRoute[] = [
  ...PAGES.map((page) => ({
    path: page.path,
    lang: htmlLang('en'),
    alternates: alternatesForPath(page.path) ?? englishAlternates(page.path),
    updated: page.updated,
  })),
  // Translated content pages, e.g. /zh/cbz-to-pdf/ and /ja/cbz-to-pdf/.
  ...LOCALIZED_CONTENT_PAGES.map((page) => ({
    path: page.path,
    lang: htmlLang(localeFromPath(page.path)),
    alternates: alternatesForPath(page.path) ?? englishAlternates(page.path),
    updated: page.updated,
  })),
  ...(['zh', 'ja'] as const).map((locale) => ({
    path: LOCALIZED_HOME_PAGES[locale].path,
    lang: htmlLang(locale),
    alternates: alternatesForPath(LOCALIZED_HOME_PAGES[locale].path) ?? HOME_ALTERNATES,
    updated: LOCALIZED_HOME_PAGES[locale].updated,
  })),
  // A device-testing entry: prerendered so it works without JS, but kept out
  // of the sitemap and marked noindex.
  { path: '/demo/', lang: htmlLang('en'), alternates: [], noindex: true },
]

function pageForPath(path: string): PageContent {
  const localized = LOCALIZED_CONTENT_PAGES.find((page) => page.path === path)
  if (localized) return localized
  if (path === '/zh/') return LOCALIZED_HOME_PAGES.zh
  if (path === '/ja/') return LOCALIZED_HOME_PAGES.ja
  return findPage(path)
}

function localeForPath(path: string): SiteLocale {
  return localeFromPath(path)
}

export async function renderPage(path: string): Promise<{ html: string; head: string }> {
  if (path === '/demo/') {
    const demo = createSSRApp({ render: () => h(DemoPage) })
    return { html: await renderToString(demo), head: renderDemoHead(siteUrl) }
  }

  const page = pageForPath(path)
  const route = routes.find((item) => item.path === path) ?? routes[0]
  const locale = localeForPath(path)
  // A fresh instance per render keeps one locale from leaking into the next.
  const siteI18n = createSiteI18n(locale)
  const app = createSSRApp({
    render: () => h(LandingPage, { page }),
  })
  app.use(siteI18n)
  const html = await renderToString(app)
  return {
    html,
    head: renderHead(page, siteUrl, { locale, alternates: route.alternates }),
  }
}

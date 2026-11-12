import { createI18n } from 'vue-i18n'
import type { PageContent } from '../content/pages'
import en from './locales/en'
import zh, { zhCbzToPdf, zhHome } from './locales/zh'
import ja, { jaCbzToPdf, jaHome } from './locales/ja'

export const SITE_LOCALES = ['en', 'zh', 'ja'] as const
export type SiteLocale = (typeof SITE_LOCALES)[number]

export const LOCALE_STORAGE_KEY = 'cbz-reader-locale'

export const messages = { en, zh, ja }

export const LOCALIZED_HOME_PAGES: Record<'zh' | 'ja', PageContent> = {
  zh: zhHome,
  ja: jaHome,
}

/** Content pages that also exist in a translated form; home pages are above. */
export const LOCALIZED_CONTENT_PAGES: readonly PageContent[] = [zhCbzToPdf, jaCbzToPdf]

/**
 * Every page that exists in more than one language, as one equivalence group.
 * hreflang and the language switcher both read this, so translating one more page
 * means adding a row here and letting entry-server build the route from it.
 */
const LOCALIZED_GROUPS: readonly Record<SiteLocale, string>[] = [
  { en: '/', zh: '/zh/', ja: '/ja/' },
  { en: '/cbz-to-pdf/', zh: '/zh/cbz-to-pdf/', ja: '/ja/cbz-to-pdf/' },
]

export function alternatesForPath(path: string): { hreflang: string; path: string }[] | null {
  const group = LOCALIZED_GROUPS.find((entry) => Object.values(entry).includes(path))
  if (!group) return null
  return [
    { hreflang: 'en', path: group.en },
    { hreflang: 'zh', path: group.zh },
    { hreflang: 'ja', path: group.ja },
    { hreflang: 'x-default', path: group.en },
  ]
}

/** The same page in another language; falls back to that language's home page. */
export function pathForLocale(path: string, locale: SiteLocale): string {
  const group = LOCALIZED_GROUPS.find((entry) => Object.values(entry).includes(path))
  if (group) return group[locale]
  return locale === 'en' ? path : `/${locale}/`
}

/**
 * A link to a page in the requested language. Unlike pathForLocale this keeps
 * untranslated pages pointing at their English URL instead of dropping the
 * visitor on the home page, so navigation stays predictable.
 */
export function translatedHref(path: string, locale: SiteLocale): string {
  const group = LOCALIZED_GROUPS.find((entry) => Object.values(entry).includes(path))
  return group ? group[locale] : path
}

/** True when two paths are the same page in different languages. */
export function isSamePage(a: string, b: string): boolean {
  if (a === b) return true
  const group = LOCALIZED_GROUPS.find((entry) => Object.values(entry).includes(a))
  return !!group && Object.values(group).includes(b)
}

export const HOME_ALTERNATES = alternatesForPath('/') ?? []

/** Path-derived locale. Never reads Accept-Language, so shared links stay stable. */
export function localeFromPath(pathname: string): SiteLocale {
  if (pathname === '/zh' || pathname.startsWith('/zh/')) return 'zh'
  if (pathname === '/ja' || pathname.startsWith('/ja/')) return 'ja'
  return 'en'
}

export function htmlLang(locale: SiteLocale): string {
  if (locale === 'zh') return 'zh-CN'
  if (locale === 'ja') return 'ja'
  return 'en'
}

export function isLocalizedHomePath(pathname: string): boolean {
  return pathname === '/zh/' || pathname === '/ja/'
}

/** Fresh instance for each render, so prerendering one locale cannot leak into another. */
export function createSiteI18n(locale: SiteLocale) {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages,
  })
}

let currentLocale: SiteLocale = 'en'

export const i18n = createI18n({
  legacy: false,
  locale: currentLocale,
  fallbackLocale: 'en',
  messages,
})

export function setSiteLocale(locale: SiteLocale): void {
  currentLocale = locale
  ;(i18n.global.locale as unknown as { value: SiteLocale }).value = locale
}

/** Translation for framework-free modules (zip parsing, recent shelf, theme switch). */
export function translate(key: string, named?: Record<string, unknown>): string {
  return i18n.global.t(key, named ?? {}) as string
}

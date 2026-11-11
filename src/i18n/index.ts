import { createI18n } from 'vue-i18n'
import type { PageContent } from '../content/pages'
import en from './locales/en'
import zh, { zhHome } from './locales/zh'
import ja, { jaHome } from './locales/ja'

export const SITE_LOCALES = ['en', 'zh', 'ja'] as const
export type SiteLocale = (typeof SITE_LOCALES)[number]

export const LOCALE_STORAGE_KEY = 'cbz-reader-locale'

export const messages = { en, zh, ja }

export const LOCALIZED_HOME_PAGES: Record<'zh' | 'ja', PageContent> = {
  zh: zhHome,
  ja: jaHome,
}

export const HOME_ALTERNATES = [
  { hreflang: 'en', path: '/' },
  { hreflang: 'zh', path: '/zh/' },
  { hreflang: 'ja', path: '/ja/' },
  { hreflang: 'x-default', path: '/' },
] as const

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

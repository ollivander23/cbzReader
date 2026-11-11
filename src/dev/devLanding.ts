import { createApp } from 'vue'
import DemoPage from '../components/DemoPage.vue'
import LandingPage from '../components/LandingPage.vue'
import { findPage } from '../content/pages'
import {
  LOCALIZED_HOME_PAGES,
  i18n,
  localeFromPath,
  setSiteLocale,
} from '../i18n'

export function mountDevLanding(): void {
  const host = document.getElementById('landing')
  if (!host) return
  host.innerHTML = ''
  const locale = localeFromPath(window.location.pathname)
  setSiteLocale(locale)

  if (window.location.pathname.replace(/\/+$/, '') === '/demo') {
    createApp(DemoPage).use(i18n).mount(host)
    return
  }

  const page =
    locale === 'zh' || locale === 'ja'
      ? LOCALIZED_HOME_PAGES[locale]
      : findPage(window.location.pathname)
  createApp(LandingPage, { page }).use(i18n).mount(host)
}

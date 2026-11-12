import { createApp } from 'vue'
import DemoPage from '../components/DemoPage.vue'
import LandingPage from '../components/LandingPage.vue'
import { i18n, localeFromPath, pageForPath, setSiteLocale } from '../i18n'

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

  // Same resolver as the prerenderer, so dev cannot disagree with production
  // about which page a URL renders.
  const page = pageForPath(window.location.pathname)
  createApp(LandingPage, { page }).use(i18n).mount(host)
}

import { createApp } from 'vue'
import DemoPage from '../components/DemoPage.vue'
import LandingPage from '../components/LandingPage.vue'
import { findPage } from '../content/pages'

export function mountDevLanding(): void {
  const host = document.getElementById('landing')
  if (!host) return
  host.innerHTML = ''
  if (window.location.pathname.replace(/\/+$/, '') === '/demo') {
    createApp(DemoPage).mount(host)
    return
  }
  createApp(LandingPage, { page: findPage(window.location.pathname) }).mount(host)
}

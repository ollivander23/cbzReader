import { createApp } from 'vue'
import LandingPage from '../components/LandingPage.vue'
import { findPage } from '../content/pages'

export function mountDevLanding(): void {
  const host = document.getElementById('landing')
  if (!host) return
  host.innerHTML = ''
  createApp(LandingPage, { page: findPage(window.location.pathname) }).mount(host)
}

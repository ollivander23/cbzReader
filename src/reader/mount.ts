import { createApp, type App } from 'vue'
import { i18n, localeFromPath, setSiteLocale } from '../i18n'
import ReaderApp from './ReaderApp.vue'

let current: App<Element> | null = null

export function mountReader(host: HTMLElement, file?: File | null): void {
  // Picking another archive from the shelf reuses the same host, so the old
  // instance must unmount first or its document listeners stay behind.
  current?.unmount()
  current = null
  host.innerHTML = ''
  setSiteLocale(localeFromPath(location.pathname))
  const app = createApp(ReaderApp, { initialFile: file ?? null })
  app.use(i18n)
  app.mount(host)
  current = app
}

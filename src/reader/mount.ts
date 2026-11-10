import { createApp } from 'vue'
import ReaderApp from './ReaderApp.vue'

export function mountReader(host: HTMLElement, file?: File | null): void {
  host.innerHTML = ''
  createApp(ReaderApp, { initialFile: file ?? null }).mount(host)
}

import { createApp } from 'vue'
import ConvertApp from './ConvertApp.vue'

/**
 * Replaces the prerendered converter shell with the interactive app. Without
 * JavaScript the shell still explains the tool and offers the file input, but
 * conversion itself needs the client bundle.
 */
export function mountConverter(host: HTMLElement, file?: File | null): void {
  host.innerHTML = ''
  host.dataset.mounted = 'true'
  createApp(ConvertApp, { initialFile: file ?? null }).mount(host)
}

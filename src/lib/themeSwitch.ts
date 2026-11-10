import { watch } from 'vue'
import { resolvedTheme, toggleTheme } from './theme'

// Progressive enhancement for the prerendered header button: the markup ships
// with the HTML, this only adds the behaviour once JS runs. The reader menu
// edits the same shared state, so both controls stay in sync through the ref.
export function mountThemeSwitch(): void {
  const trigger = document.querySelector<HTMLButtonElement>('.theme-switch__trigger')
  if (!trigger || trigger.dataset.bound === 'true') return

  trigger.dataset.bound = 'true'

  const sync = (): void => {
    const dark = resolvedTheme.value === 'dark'
    const label = dark ? 'Switch to light theme' : 'Switch to dark theme'
    trigger.setAttribute('aria-pressed', dark ? 'true' : 'false')
    trigger.setAttribute('aria-label', label)
    trigger.title = label
  }

  // One click flips the appearance; the stored value becomes explicit
  // light/dark even when it was 'auto' before.
  trigger.addEventListener('click', () => {
    toggleTheme()
  })

  watch(resolvedTheme, sync, { immediate: true })
}

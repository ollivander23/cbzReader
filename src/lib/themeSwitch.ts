import { watch } from 'vue'
import { setTheme, themeSetting, type ThemeSetting } from './theme'

function isSetting(value: string | undefined): value is ThemeSetting {
  return value === 'auto' || value === 'light' || value === 'dark'
}

// Progressive enhancement for the prerendered header switch: the markup ships
// with the HTML, this only adds behaviour once JS runs. The reader menu edits
// the same shared state, so both controls stay in sync through the watcher.
export function mountThemeSwitch(): void {
  const root = document.querySelector<HTMLElement>('.theme-switch')
  if (!root || root.dataset.bound === 'true') return

  const trigger = root.querySelector<HTMLButtonElement>('.theme-switch__trigger')
  const menu = root.querySelector<HTMLElement>('.theme-switch__menu')
  if (!trigger || !menu) return

  const items = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-theme-value]')).filter(
    (item) => isSetting(item.dataset.themeValue),
  )
  if (!items.length) return

  root.dataset.bound = 'true'

  const isOpen = (): boolean => !menu.hidden

  const sync = (): void => {
    for (const item of items) {
      item.setAttribute(
        'aria-checked',
        item.dataset.themeValue === themeSetting.value ? 'true' : 'false',
      )
    }
  }

  const setOpen = (next: boolean, focus = true): void => {
    menu.hidden = !next
    trigger.setAttribute('aria-expanded', next ? 'true' : 'false')
    if (next && focus) {
      const active = items.find((item) => item.dataset.themeValue === themeSetting.value) ?? items[0]
      active?.focus()
    }
  }

  const choose = (item: HTMLButtonElement): void => {
    const value = item.dataset.themeValue
    if (!isSetting(value)) return
    setTheme(value)
    setOpen(false)
    trigger.focus()
  }

  trigger.addEventListener('click', () => setOpen(!isOpen()))

  for (const item of items) {
    item.addEventListener('click', () => choose(item))
  }

  document.addEventListener('pointerdown', (event) => {
    if (!isOpen()) return
    if (!root.contains(event.target as Node)) setOpen(false, false)
  })

  root.addEventListener('keydown', (event) => {
    const active = items.indexOf(document.activeElement as HTMLButtonElement)

    if (event.key === 'Escape') {
      if (!isOpen()) return
      event.preventDefault()
      setOpen(false, false)
      trigger.focus()
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen()) {
        setOpen(true)
        return
      }
      const step = event.key === 'ArrowDown' ? 1 : -1
      const start = active === -1 ? 0 : active
      items[(start + step + items.length) % items.length]?.focus()
      return
    }

    if (!isOpen()) return

    if (event.key === 'Home') {
      event.preventDefault()
      items[0]?.focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      items[items.length - 1]?.focus()
    } else if (event.key === 'Tab') {
      setOpen(false, false)
    }
  })

  watch(themeSetting, sync, { immediate: true })
}

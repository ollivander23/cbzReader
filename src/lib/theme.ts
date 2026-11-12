import { ref } from 'vue'

export type ThemeSetting = 'auto' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

// Mirrored by the blocking snippet in src/prerender/head.ts. Keep both in sync.
export const THEME_KEY = 'cbz-theme'
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#e6ecef',
  dark: '#12161b',
}

const DARK_QUERY = '(prefers-color-scheme: dark)'

// Shared by every control on the page (header switch, reader menu) so they
// never disagree. Server rendering starts from the default.
export const themeSetting = ref<ThemeSetting>('auto')
// What the page is actually painted as. 'auto' is still a valid stored value,
// but no control offers it, so the UI reads this instead of the setting.
export const resolvedTheme = ref<ResolvedTheme>('light')

function normalize(value: string | null): ThemeSetting {
  return value === 'light' || value === 'dark' ? value : 'auto'
}

export function readThemeSetting(): ThemeSetting {
  if (typeof window === 'undefined') return 'auto'
  try {
    return normalize(window.localStorage.getItem(THEME_KEY))
  } catch {
    return 'auto'
  }
}

export function writeThemeSetting(setting: ThemeSetting): void {
  try {
    window.localStorage.setItem(THEME_KEY, setting)
  } catch {
    // Private mode or a full quota: the choice simply does not persist.
  }
}

function prefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

export function resolveTheme(setting: ThemeSetting): ResolvedTheme {
  if (setting === 'auto') return prefersDark() ? 'dark' : 'light'
  return setting
}

export function applyTheme(setting: ThemeSetting): ResolvedTheme {
  const resolved = resolveTheme(setting)
  const root = document.documentElement
  root.setAttribute('data-theme', resolved)
  root.style.colorScheme = resolved
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLORS[resolved])
  resolvedTheme.value = resolved
  return resolved
}

export function watchSystemTheme(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {}
  const media = window.matchMedia(DARK_QUERY)
  const listener = () => onChange()
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

// Single write path: persist, resolve, apply, and update every control.
export function setTheme(setting: ThemeSetting): ResolvedTheme {
  themeSetting.value = setting
  writeThemeSetting(setting)
  return applyTheme(setting)
}

// The UI only offers two states. A stored 'auto' never reaches this function
// as an input: the current appearance decides the direction, so the first
// click from auto always flips what the user is looking at.
export function toggleTheme(): ResolvedTheme {
  return setTheme(resolvedTheme.value === 'dark' ? 'light' : 'dark')
}

// Applied once at boot so dev and any non-prerendered entry still get the choice.
export function initTheme(): void {
  themeSetting.value = readThemeSetting()
  applyTheme(themeSetting.value)
  watchSystemTheme(() => {
    if (themeSetting.value === 'auto') applyTheme('auto')
  })
}

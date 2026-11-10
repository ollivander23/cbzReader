export type ThemeSetting = 'auto' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

// Mirrored by the blocking snippet in src/prerender/head.ts. Keep both in sync.
export const THEME_KEY = 'cbz-theme'
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#f7f5f0',
  dark: '#0d0d12',
}

const DARK_QUERY = '(prefers-color-scheme: dark)'

function normalize(value: string | null): ThemeSetting {
  return value === 'light' || value === 'dark' ? value : 'auto'
}

export function readThemeSetting(): ThemeSetting {
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
  return resolved
}

export function watchSystemTheme(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {}
  const media = window.matchMedia(DARK_QUERY)
  const listener = () => onChange()
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

// Applied once at boot so dev and any non-prerendered entry still get the choice.
export function initTheme(): void {
  applyTheme(readThemeSetting())
  watchSystemTheme(() => {
    if (readThemeSetting() === 'auto') applyTheme('auto')
  })
}

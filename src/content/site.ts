export const SITE = {
  name: 'CBZ Reader',
  tagline: 'Read CBZ comics in your browser',
  description:
    'Open CBZ comic archives and convert CBZ to PDF in your browser. Files are unpacked on your device, never uploaded. Right-to-left manga and local reading progress.',
} as const

export const NAV = [
  { labelKey: 'nav.reader', href: '/' },
  { labelKey: 'nav.cbzToPdf', href: '/cbz-to-pdf/' },
  // { labelKey: 'nav.howToOpen', href: '/how-to-open-cbz/' },
  { labelKey: 'nav.privateProcess', href: '/private-process/' },
] as const

export function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/'
  return pathname.endsWith('/') ? pathname : `${pathname}/`
}

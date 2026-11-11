export const SITE = {
  name: 'CBZ Reader',
  tagline: 'Read CBZ comics in your browser',
  description:
    'Open CBZ comic archives and convert CBZ to PDF in your browser. Files are unpacked on your device, never uploaded. Right-to-left manga and local reading progress.',
} as const

export const NAV = [
  { label: 'Reader', href: '/' },
  { label: 'CBZ to PDF', href: '/cbz-to-pdf/' },
  { label: 'How to open CBZ', href: '/how-to-open-cbz/' },
  { label: 'Manga mode', href: '/manga-reader/' },
  { label: 'CBZ vs CBR', href: '/cbz-vs-cbr/' },
] as const

export function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/'
  return pathname.endsWith('/') ? pathname : `${pathname}/`
}

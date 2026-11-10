type TrackValue = string | number | boolean

export type TrackProps = Record<string, TrackValue | undefined>

interface UmamiClient {
  track: (event: string, data?: Record<string, TrackValue>) => void
}

declare global {
  interface Window {
    umami?: UmamiClient
  }
}

/**
 * Sends an event through the Umami script when it is present. The local dev
 * server and any blocked script leave window.umami undefined, so analytics can
 * never break reading.
 */
export function track(event: string, props?: TrackProps): void {
  if (typeof window === 'undefined') return
  const client = window.umami
  if (!client || typeof client.track !== 'function') return

  const data: Record<string, TrackValue> = {}
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value !== undefined) data[key] = value
    }
  }

  try {
    client.track(event, data)
  } catch {
    // Analytics is best-effort; a blocked or broken script must stay silent.
  }
}

export type SizeBucket = '<10MB' | '10-50MB' | '>50MB'

export function sizeBucket(bytes: number): SizeBucket {
  if (bytes < 10 * 1024 * 1024) return '<10MB'
  if (bytes < 50 * 1024 * 1024) return '10-50MB'
  return '>50MB'
}

/**
 * Only the extension is reported, never the file name. Anything odd is
 * reported as "unknown" so a malformed name cannot leak into analytics.
 */
export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot < 0 || dot === name.length - 1) return 'unknown'
  const ext = name.slice(dot + 1).toLowerCase()
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : 'unknown'
}

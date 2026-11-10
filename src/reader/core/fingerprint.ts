const SAMPLE = 64 * 1024

function toHex(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
  return out
}

function fnv1a(bytes: Uint8Array): string {
  let hash = 0x811c9dc5
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * A stable local identity for a file the user re-selects later.
 * iOS cannot hand back a file handle, so this is how progress is restored.
 */
export async function fingerprint(file: File): Promise<string> {
  const headLength = Math.min(SAMPLE, file.size)
  const tailStart = Math.max(0, file.size - SAMPLE)

  const head = new Uint8Array(await file.slice(0, headLength).arrayBuffer())
  const tail = new Uint8Array(await file.slice(tailStart, file.size).arrayBuffer())
  const meta = new TextEncoder().encode(
    `${file.name}\u0000${file.size}\u0000${file.lastModified}\u0000`,
  )

  const combined = new Uint8Array(meta.length + head.length + tail.length)
  combined.set(meta, 0)
  combined.set(head, meta.length)
  combined.set(tail, meta.length + head.length)

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const digest = await crypto.subtle.digest('SHA-256', combined)
      return toHex(new Uint8Array(digest))
    } catch {
      // Fall through to the non-crypto hash when SubtleCrypto is unavailable.
    }
  }

  return `fnv-${fnv1a(combined)}`
}

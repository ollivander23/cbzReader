import { get, set } from 'idb-keyval'

export type ReadingMode = 'single' | 'double' | 'scroll'

export interface StoredProgress {
  index: number
  mode: ReadingMode
  rtl: boolean
  updatedAt: number
}

const PREFIX = 'cbz-reader:progress:'

export async function readProgress(fingerprint: string): Promise<StoredProgress | null> {
  try {
    const value = await get<StoredProgress>(PREFIX + fingerprint)
    if (!value || typeof value.index !== 'number') return null
    return value
  } catch {
    return null
  }
}

export async function writeProgress(
  fingerprint: string,
  progress: StoredProgress,
): Promise<void> {
  try {
    await set(PREFIX + fingerprint, progress)
  } catch {
    // Private mode, quota, or a blocked IndexedDB: reading still works without persistence.
  }
}

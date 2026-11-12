const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

export function naturalCompare(a: string, b: string): number {
  return collator.compare(a, b)
}

export function baseName(path: string): string {
  const slash = path.lastIndexOf('/')
  return slash >= 0 ? path.slice(slash + 1) : path
}

export function dirName(path: string): string {
  const slash = path.lastIndexOf('/')
  return slash === -1 ? '' : path.slice(0, slash)
}

/**
 * Reading order for pages inside a comic archive. The folder is the primary key
 * on purpose: with the file name first, ch1/001.jpg and ch2/001.jpg interleave
 * and every chapter comes out shuffled. The full path breaks the last tie.
 */
export function comparePagePaths(a: string, b: string): number {
  return (
    naturalCompare(dirName(a), dirName(b)) ||
    naturalCompare(baseName(a), baseName(b)) ||
    naturalCompare(a, b)
  )
}

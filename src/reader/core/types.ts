export interface PageAsset {
  index: number
  url: string
  width: number
  height: number
  downsampled: boolean
}

export type ReaderErrorCode = 'not-zip' | 'no-images' | 'encrypted' | 'image' | 'unknown'

export class ReaderError extends Error {
  readonly code: ReaderErrorCode

  constructor(code: ReaderErrorCode, message: string) {
    super(message)
    this.name = 'ReaderError'
    this.code = code
  }
}

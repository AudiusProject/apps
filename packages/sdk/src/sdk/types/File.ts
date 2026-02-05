import * as fileType from 'file-type'
import { z } from 'zod'

/**
 * Type representing a file in Node environment
 */
const NodeFileSchema = z.object({
  buffer: z.custom<Buffer>((data: unknown) => data),
  name: z.optional(z.string()),
  type: z.optional(z.string())
})
export type NodeFile = z.infer<typeof NodeFileSchema>

const BrowserFileSchema = z.custom<File>((data: unknown) => data)
export type BrowserFile = z.infer<typeof BrowserFileSchema>

const NativeFileSchema = z.object({
  uri: z.string(),
  name: z.string().nullable(),
  type: z.string().nullable(),
  copyError: z.optional(z.string()),
  fileCopyUri: z.optional(z.string()).nullable(),
  size: z.optional(z.number()).nullable()
})
export type NativeFile = z.infer<typeof NativeFileSchema>

/**
 * Type representing a file in Node and browser environments
 */
export const CrossPlatformFileSchema = z.union([
  NodeFileSchema,
  BrowserFileSchema,
  NativeFileSchema
])
export type CrossPlatformFile = z.infer<typeof CrossPlatformFileSchema>

export const isNodeFile = (file: CrossPlatformFile): file is NodeFile => {
  if (file && (file as NodeFile).buffer) {
    return true
  }
  return false
}

export const isNativeFile = (file: CrossPlatformFile): file is NativeFile => {
  if (file && (file as NativeFile).uri) {
    return true
  }
  return false
}

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/bmp',
  'image/tiff',
  'image/gif',
  'image/webp'
]

export const ALLOWED_AUDIO_MIME_TYPES_REGEX = /audio\/.+/

const getFileType = async (file: CrossPlatformFile) => {
  if (isNativeFile(file)) {
    return { mime: file.type }
  }

  let fileTypeBrowser: any
  if (typeof window !== 'undefined' && window) {
    fileTypeBrowser = await import('file-type/browser')
    if ('default' in fileTypeBrowser) {
      fileTypeBrowser = fileTypeBrowser.default
    }
  }

  if (isNodeFile(file)) {
    return file.type
      ? { mime: file.type }
      : await fileType.fromBuffer(file.buffer)
  } else {
    return await fileTypeBrowser.fromBlob(file)
  }
}

export const ImageFile = CrossPlatformFileSchema.refine(
  async (file) => {
    const fileType = await getFileType(file)
    return fileType && ALLOWED_IMAGE_MIME_TYPES.includes(fileType.mime)
  },
  `Image file has invalid file type. Supported file types are: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`
)

export const AudioFile = CrossPlatformFileSchema.refine(async (file) => {
  const fileType = await getFileType(file)
  return fileType && ALLOWED_AUDIO_MIME_TYPES_REGEX.test(fileType.mime)
}, `Audio file has invalid file type. Supported file types are: audio/*`)

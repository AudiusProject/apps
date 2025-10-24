import WebWorker from 'services/WebWorker'
import dominantColorWorkerFile from 'workers/dominantColor.worker.js'
import generatePlaylistArtworkWorkerFile from 'workers/generatePlaylistArtwork.worker.js'
import gifPreviewWorkerFile from 'workers/gifPreview.worker.js'
import resizeImageWorkerFile from 'workers/resizeImage.worker.js'
// @ts-ignore - jimp is a raw-loaded to have workers called directly with it.
import jimp from 'workers/utils/jimp.min.workerscript'

const dominantColorWorker = new WebWorker(dominantColorWorkerFile, false, [
  jimp
])
const gifPreviewWorker = new WebWorker(gifPreviewWorkerFile, false, [jimp])
const generatePlaylistArtworkWorker = new WebWorker(
  generatePlaylistArtworkWorkerFile,
  false,
  [jimp]
)

export const ALLOWED_IMAGE_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
]

export type ResizeImageOptions = {
  maxWidth: number
  square: boolean
}
export const resizeImage = async (
  imageFile: File,
  maxWidth = 1000,
  square = true,
  key = ''
): Promise<File> => {
  if (!ALLOWED_IMAGE_FILE_TYPES.includes(imageFile.type)) {
    throw new Error('invalid file type')
  }
  const imageUrlBlob = URL.createObjectURL(imageFile)
  const worker = new WebWorker(resizeImageWorkerFile, true, [jimp])
  worker.call({ imageUrl: imageUrlBlob, maxWidth, square }, key)
  return worker.getResult()
}

export const dominantColor = async (imageUrl: string) => {
  dominantColorWorker.call({ imageUrl }, imageUrl)
  return dominantColorWorker.getResult(imageUrl)
}

export const imageToFrame = async (imageUrl: string) => {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  const p = new Promise<string>((resolve) => {
    image.onload = function () {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      canvas.getContext('2d')?.drawImage(image, 0, 0)
      resolve(canvas.toDataURL('image/jpeg'))
    }
  })
  image.src = imageUrl
  return p
}

export const gifPreview = async (imageUrl: string) => {
  gifPreviewWorker.call({ imageUrl }, imageUrl)
  const res = await gifPreviewWorker.getResult(imageUrl)
  return res
}

export const generatePlaylistArtwork = async (imageUrls: string[]) => {
  generatePlaylistArtworkWorker.call({ imageUrls }, imageUrls[0])
  const artworkFile: File = await generatePlaylistArtworkWorker.getResult(
    imageUrls[0]
  )
  const artworkUrl = URL.createObjectURL(artworkFile)

  return { file: artworkFile, url: artworkUrl }
}

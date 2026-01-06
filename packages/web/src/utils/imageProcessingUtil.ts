import WebWorker from 'services/WebWorker'

// Lazy-load worker modules to reduce initial bundle size
let dominantColorWorkerPromise: Promise<WebWorker> | null = null
let gifPreviewWorkerPromise: Promise<WebWorker> | null = null
let generatePlaylistArtworkWorkerPromise: Promise<WebWorker> | null = null
let jimpPromise: Promise<any> | null = null

// Shared jimp dependency - only load once
const getJimp = async () => {
  if (!jimpPromise) {
    // @ts-ignore - jimp is a raw-loaded to have workers called directly with it.
    jimpPromise = import('workers/utils/jimp.min.workerscript').then(
      (m) => m.default
    )
  }
  return jimpPromise
}

const getDominantColorWorker = async (): Promise<WebWorker> => {
  if (!dominantColorWorkerPromise) {
    dominantColorWorkerPromise = Promise.all([
      import('workers/dominantColor.worker.js').then((m) => m.default),
      getJimp()
    ]).then(
      ([dominantColorWorkerFile, jimp]) =>
        new WebWorker(dominantColorWorkerFile, false, [jimp])
    )
  }
  return dominantColorWorkerPromise
}

const getGifPreviewWorker = async (): Promise<WebWorker> => {
  if (!gifPreviewWorkerPromise) {
    gifPreviewWorkerPromise = Promise.all([
      import('workers/gifPreview.worker.js').then((m) => m.default),
      getJimp()
    ]).then(
      ([gifPreviewWorkerFile, jimp]) =>
        new WebWorker(gifPreviewWorkerFile, false, [jimp])
    )
  }
  return gifPreviewWorkerPromise
}

const getGeneratePlaylistArtworkWorker = async (): Promise<WebWorker> => {
  if (!generatePlaylistArtworkWorkerPromise) {
    generatePlaylistArtworkWorkerPromise = Promise.all([
      import('workers/generatePlaylistArtwork.worker.js').then(
        (m) => m.default
      ),
      getJimp()
    ]).then(
      ([generatePlaylistArtworkWorkerFile, jimp]) =>
        new WebWorker(generatePlaylistArtworkWorkerFile, false, [jimp])
    )
  }
  return generatePlaylistArtworkWorkerPromise
}

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
  // Lazy-load worker modules
  const [resizeImageWorkerFile, jimp] = await Promise.all([
    import('workers/resizeImage.worker.js').then((m) => m.default),
    getJimp()
  ])
  const worker = new WebWorker(resizeImageWorkerFile, true, [jimp])
  worker.call({ imageUrl: imageUrlBlob, maxWidth, square }, key)
  return worker.getResult()
}

export const dominantColor = async (imageUrl: string) => {
  const worker = await getDominantColorWorker()
  worker.call({ imageUrl }, imageUrl)
  return worker.getResult(imageUrl)
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
  const worker = await getGifPreviewWorker()
  worker.call({ imageUrl }, imageUrl)
  const res = await worker.getResult(imageUrl)
  return res
}

export const generatePlaylistArtwork = async (imageUrls: string[]) => {
  const worker = await getGeneratePlaylistArtworkWorker()
  worker.call({ imageUrls }, imageUrls[0])
  const artworkFile: File = await worker.getResult(imageUrls[0])
  const artworkUrl = URL.createObjectURL(artworkFile)

  return { file: artworkFile, url: artworkUrl }
}

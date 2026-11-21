import { uuid } from '@audius/common/utils'
import ReactNativeBlobUtil from 'react-native-blob-util'

import {
  compositeImage,
  createImage,
  encodeJpegBase64,
  readImage,
  resizeImage
} from './image/rgbaImage'

const {
  fs: { dirs, writeFile }
} = ReactNativeBlobUtil

const canvasWidth = 1000
const canvasHeight = 1000
const imageWidth = canvasWidth / 2
const imageHeight = canvasHeight / 2

const mimeType = 'image/jpeg'
const jpegQuality = 100

export async function generatePlaylistArtwork(imageUrls: string[]) {
  const images = await Promise.all(
    imageUrls.map((imageUrl) => readImage(imageUrl))
  )

  let newImage = images[0]

  if (images.length !== 1) {
    newImage = createImage(canvasWidth, canvasHeight)

    for (let i = 0; i < 4; i++) {
      const image = images[i]
      if (image) {
        const x = i % 2 === 0 ? 0 : imageWidth
        const y = i < 2 ? 0 : imageHeight

        compositeImage(
          newImage,
          resizeImage(image, imageWidth, imageHeight),
          x,
          y
        )
      }
    }
  }

  const fileName = uuid()
  const url = `${dirs.CacheDir}/${fileName}.jpg`
  const base64Contents = encodeJpegBase64(newImage, jpegQuality)
  await writeFile(url, base64Contents, 'base64')

  return {
    url,
    file: { uri: url, name: fileName, type: mimeType } as unknown as File
  }
}

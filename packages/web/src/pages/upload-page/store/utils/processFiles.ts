import { newTrackMetadata } from '@audius/common/schemas'
import {
  ALLOWED_MAX_AUDIO_SIZE_BYTES,
  ALLOWED_AUDIO_FILE_EXTENSIONS,
  ALLOWED_AUDIO_FILE_MIME
} from '@audius/common/utils'
import jsmediatags from 'jsmediatags'

import { resizeImage } from 'utils/imageProcessingUtil'

const readMediaTags = (file: File): Promise<any> => {
  return new Promise(function (resolve, reject) {
    jsmediatags.read(file, {
      onSuccess: function (tag: any) {
        let tags
        if (tag && tag.tags) {
          tags = tag.tags
        }
        resolve(tags)
      },
      onError: function (error) {
        reject(error)
      }
    })
  })
}

const createArtwork = async (selectedFiles: File[]) => {
  const file = selectedFiles[0]
  const convertedBlob = await resizeImage(file)
  if (!convertedBlob) throw new Error(`Unable to process image file`)
  const artwork = new File([convertedBlob], 'Artwork')
  const createdUrl = URL.createObjectURL(convertedBlob)
  return { file: artwork, url: createdUrl }
}

export const processFiles = (
  selectedFiles: File[],
  handleInvalid: (
    fileName: string,
    errorType: 'corrupted' | 'size' | 'type'
  ) => void
) => {
  return selectedFiles.map(async (file) => {
    if (file.size <= 0) {
      handleInvalid(file.name, 'corrupted')
      return null
    }
    if (file.size > ALLOWED_MAX_AUDIO_SIZE_BYTES) {
      handleInvalid(file.name, 'size')
      return null
    }
    // Check file extension (heuristic for failure)
    if (
      !ALLOWED_AUDIO_FILE_EXTENSIONS.some((ext) =>
        file.name.trim().toLowerCase().endsWith(ext)
      )
    ) {
      handleInvalid(file.name, 'type')
      return null
    }
    // If the mime type is somehow undefined or it doesn't begin with audio/ reject.
    // Backend will try to match on mime again and if it's not an audio/ match, it'll error
    if (file.type && !file.type.match(ALLOWED_AUDIO_FILE_MIME)) {
      handleInvalid(file.type, 'type')
      return null
    }
    const title = file.name.replace(/\.[^/.]+$/, '') // strip file extension
    let artwork = { file: null as File | null, url: '' }
    try {
      const tags = await readMediaTags(file)
      if (tags && tags.picture) {
        const dataArray = new Uint8Array(tags.picture.data)
        const blob = new window.Blob([dataArray])
        const artworkFile = new File([blob], 'Artwork', {
          type: tags.picture.format
        })
        artwork = await createArtwork([artworkFile])
      }
    } catch (error) {
      // Unable to read tags, but continue on anyways
      console.warn(
        `Unable to parse tags from uploaded track: ${title}\n NOTE: if a picture was attached to the track, it will not be added`,
        error
      )
    }
    const audio = new Audio()
    // @ts-ignore preview is present on `file` in the browser context
    audio.src = file.preview
    return {
      clientId: crypto.randomUUID(),
      file,
      preview: audio,
      metadata: newTrackMetadata({
        title,
        artwork,
        orig_filename: file.name
      })
    }
  })
}

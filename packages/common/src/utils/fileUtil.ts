import { Buffer } from 'buffer'

import { Track, User } from '~/models'

/** Convert a base64 string to a file object */
export const dataURLtoFile = async (
  dataUrl: string,
  fileName = 'Artwork'
): Promise<File | undefined> => {
  const arr = dataUrl.split(',')
  if (arr.length < 2) {
    return undefined
  }
  const mimeArr = arr[0].match(/:(.*?);/)
  if (!mimeArr || mimeArr.length < 2) {
    return undefined
  }
  const mime = mimeArr[1]
  const buff = Buffer.from(arr[1], 'base64')
  return new File([buff], fileName, { type: mime })
}

export const getFilename = ({
  track,
  user,
  isOriginal,
  isDownload
}: {
  track: Track
  user: User
  isOriginal?: boolean
  isDownload?: boolean
}) => {
  let filename, extension
  const existingExtension = track.orig_filename?.split('.').pop()
  const existingFilename = track.orig_filename?.replace(
    `.${existingExtension ?? ''}`,
    ''
  )

  if (track.ddex_app) {
    filename = track.title
    extension = existingExtension ?? 'wav'
  } else if (isOriginal) {
    extension = existingExtension ?? 'wav'
    if (existingFilename) {
      filename = existingFilename
    } else {
      filename = track.title
    }
  } else {
    extension = 'mp3'
    if (existingFilename) {
      filename = existingFilename
    } else {
      filename = track.title
    }
  }

  if (isDownload) {
    filename += ` - ${user.name} (Audius).${extension}`
  } else {
    filename += `.${extension}`
  }
  return filename
}

// Only reads and rewrites `filename`, so it accepts anything carrying one —
// callers that dedup before they have a URL to pair it with shouldn't have to
// invent a placeholder to satisfy `DownloadFile`.
export const dedupFilenames = (files: { filename: string }[]) => {
  const filenameCounts = new Map<string, number>()
  for (const file of files) {
    const count = filenameCounts.get(file.filename) ?? 0
    filenameCounts.set(file.filename, count + 1)
    const split = file.filename.split('.')
    const extension = split.pop()
    file.filename =
      count === 0 ? file.filename : split.join('.') + `-${count}.${extension}`
  }
}

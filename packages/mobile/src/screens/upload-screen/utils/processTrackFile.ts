import { newTrackMetadata } from '@audius/common/schemas'
import type { TrackForUpload } from '@audius/common/store'
import {
  ALLOWED_MAX_AUDIO_SIZE_BYTES,
  ALLOWED_AUDIO_FILE_EXTENSIONS,
  ALLOWED_AUDIO_FILE_MIME,
  uuid
} from '@audius/common/utils'
import type { DocumentPickerResponse } from '@react-native-documents/picker'
import { FFprobeKit } from 'ffmpeg-kit-react-native'

const getAudioDuration = async (filePath: string): Promise<number | null> => {
  try {
    const session = await FFprobeKit.execute(
      `-v error -show_entries format=duration -of json "${decodeURIComponent(
        filePath
      )}"`
    )
    const returnCode = await session.getReturnCode()

    if (returnCode.isValueSuccess()) {
      const output = await session.getOutput()
      const jsonOutput = JSON.parse(output)
      const duration = parseFloat(jsonOutput?.format?.duration)

      if (!isNaN(duration)) {
        return duration
      }
    }
    return null
  } catch (error) {
    console.error('Error probing audio file:', error)
    return null
  }
}

export const processTrackFile = async (
  trackFile: DocumentPickerResponse & { localCopyUri: string }
): Promise<TrackForUpload> => {
  const { name, size, localCopyUri, uri, type } = trackFile
  if (!size || size <= 0) {
    throw new Error(
      'File is corrupted. Please ensure it is playable and stored locally.'
    )
  }
  if (size > ALLOWED_MAX_AUDIO_SIZE_BYTES) {
    throw new Error('File too large')
  }
  // Check file extension (heuristic for failure)
  if (
    !ALLOWED_AUDIO_FILE_EXTENSIONS.some((ext) =>
      name?.trim().toLowerCase().endsWith(ext)
    )
  ) {
    throw new Error('Unsupported file type')
  }
  // If the mime type is somehow undefined or it doesn't begin with audio/ reject.
  // Backend will try to match on mime again and if it's not an audio/ match, it'll error
  if (type && !type.match(ALLOWED_AUDIO_FILE_MIME)) {
    throw new Error('File must be an audio file')
  }

  const duration = await getAudioDuration(localCopyUri ?? uri)
  const title = name?.replace(/\.[^/.]+$/, '') ?? null // strip file extension

  return {
    clientId: uuid(),
    file: { ...trackFile, uri: localCopyUri ?? uri },
    preview: null,
    metadata: newTrackMetadata({
      title,
      artwork: { file: null, url: '' },
      duration
    })
  }
}

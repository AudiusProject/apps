import { isContentUSDCPurchaseGated } from '@audius/common/models'
import type { TrackMetadataForUpload } from '@audius/common/store'

import type { FormValues } from './types'

export const getUploadMetadataFromFormValues = (
  values: FormValues,
  initialValues: FormValues | TrackMetadataForUpload
) => {
  const {
    licenseType: ignoredLicenseType,
    trackArtwork: ignoredTrackArtwork,
    isCover,
    ...formValues
  } = values

  const metadata: TrackMetadataForUpload = {
    ...formValues,
    bpm: formValues.bpm ? Number(formValues.bpm) : null
  }

  if (isCover) {
    metadata.cover_original_song_title =
      metadata.cover_original_song_title ?? ''
    metadata.cover_original_artist = metadata.cover_original_artist ?? ''
  }

  if (!metadata.is_unlisted) {
    const unlistedVisibilityFields = [
      'genre',
      'mood',
      'tags',
      'share',
      'play_count'
    ]
    const shouldOverrideVisibilityFields = !unlistedVisibilityFields.every(
      (field) => metadata.field_visibility?.[field]
    )
    if (shouldOverrideVisibilityFields) {
      metadata.field_visibility = {
        ...metadata.field_visibility,
        genre: true,
        mood: true,
        tags: true,
        share: true,
        play_count: true,
        remixes: !!metadata.field_visibility?.remixes
      }
    }
  }

  const streamConditions = metadata.stream_conditions
  let previewStartSeconds = metadata.preview_start_seconds
  let isDownloadable = metadata.is_downloadable
  let isOriginalAvailable = metadata.is_original_available

  if (isContentUSDCPurchaseGated(streamConditions)) {
    previewStartSeconds = Number(previewStartSeconds ?? 0)

    const { download_conditions: initialDownloadConditions } = initialValues
    isDownloadable = !isContentUSDCPurchaseGated(initialDownloadConditions)
      ? true
      : isDownloadable
    isOriginalAvailable = !isContentUSDCPurchaseGated(initialDownloadConditions)
      ? true
      : isOriginalAvailable
  }

  metadata.stream_conditions = streamConditions
  metadata.preview_start_seconds = previewStartSeconds
  metadata.is_downloadable = isDownloadable
  metadata.is_original_available = isOriginalAvailable

  if (streamConditions) {
    metadata.download_conditions = streamConditions
    metadata.is_download_gated = true
  }

  return metadata
}

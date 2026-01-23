import { floor, clamp } from 'lodash'

import { CommonState } from '../commonStore'

import { ProgressState, ProgressStatus } from './types'

export const getStems = (state: CommonState) => state.upload.stems
export const getUploadSuccess = (state: CommonState) => state.upload.success
export const getUploadError = (state: CommonState) => state.upload.error
export const getIsUploading = (state: CommonState) => state.upload.uploading
export const getFormState = (state: CommonState) => state.upload.formState

// Should sum to 1
const UPLOAD_WEIGHT = 0.5
const TRANSCODE_WEIGHT = 1 - UPLOAD_WEIGHT

// Should sum to 1
const AUDIO_WEIGHT = 1
const IMAGE_WEIGHT = 0

/**
 * Get the upload and transcode status of a track including its stems.
 */
const trackProgressSummary = (
  trackProgress: ProgressState,
  key: 'image' | 'audio'
) => {
  let loaded =
    trackProgress[key].status === ProgressStatus.ERROR
      ? (trackProgress[key].total ?? 0)
      : (trackProgress[key].loaded ?? 0)
  let total = trackProgress[key].total ?? 0
  let transcode =
    trackProgress[key].status === ProgressStatus.ERROR
      ? 1
      : (trackProgress[key].transcode ?? 0)

  return {
    upload: total === 0 ? 0 : loaded / total,
    transcode: key === 'audio' ? transcode : 1
  }
}

/**
 * Gets the total upload progress for a particular asset type including stems,
 * as a percentage between [0, 1]
 */
const getKeyUploadProgress = (state: CommonState, key: 'image' | 'audio') => {
  const uploadProgress = state.upload.uploadProgress
  if (uploadProgress == null) return 0

  const filteredProgress = uploadProgress.filter((progress) => key in progress)
  if (filteredProgress.length === 0) return 0

  let uploaded = 0
  let transcoded = 0
  for (const trackProgress of filteredProgress) {
    const summary = trackProgressSummary(trackProgress, key)
    uploaded += summary.upload
    transcoded += summary.transcode
    for (const stemProgress of trackProgress.stems) {
      const stemSummary = trackProgressSummary(stemProgress, key)
      uploaded += stemSummary.upload
      transcoded += stemSummary.transcode
    }
  }

  const overallProgress =
    key === 'image'
      ? uploaded
      : UPLOAD_WEIGHT * uploaded + TRANSCODE_WEIGHT * transcoded

  return overallProgress
}

export const getCombinedUploadPercentage = (state: CommonState) => {
  if (
    state.upload.formState == null ||
    state.upload.formState.tracks === undefined
  )
    return 0
  const trackCount = state.upload.formState.tracks.length
  const stemCount = state.upload.formState.tracks.reduce((acc, track) => {
    return acc + (track.metadata.stems ? track.metadata.stems.length : 0)
  }, 0)
  const totalItems = trackCount + stemCount
  if (totalItems === 0) return 0

  const imageProgress = getKeyUploadProgress(state, 'image')
  const audioProgress = getKeyUploadProgress(state, 'audio')
  const percent = floor(
    (100 * (IMAGE_WEIGHT * imageProgress + AUDIO_WEIGHT * audioProgress)) /
      totalItems
  )
  return clamp(percent, 0, 100)
}

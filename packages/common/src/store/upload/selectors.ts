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
const ART_WEIGHT = 0

/**
 * Get the upload and transcode status of a track including its stems.
 */
const trackProgressSummary = (
  trackProgress: ProgressState,
  key: 'art' | 'audio'
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
  const transcodeTotal = 1 + trackProgress.stems.length

  for (const stemProgress of trackProgress.stems) {
    loaded +=
      stemProgress[key].status === ProgressStatus.ERROR
        ? (stemProgress[key].total ?? 0)
        : (stemProgress[key].loaded ?? 0)
    total += stemProgress[key].total ?? 0
    transcode +=
      stemProgress[key].status === ProgressStatus.ERROR
        ? 1
        : (stemProgress[key].transcode ?? 0)
  }
  return {
    loaded,
    total,
    transcode: key === 'audio' ? transcode / transcodeTotal : 0
  }
}

/**
 * Gets the total upload progress for a particular asset type including stems,
 * as a percentage between [0, 1]
 */
const getKeyUploadProgress = (state: CommonState, key: 'art' | 'audio') => {
  const uploadProgress = state.upload.uploadProgress
  if (uploadProgress == null) return 0

  const filteredProgress = uploadProgress.filter((progress) => key in progress)
  if (filteredProgress.length === 0) return 0

  let loaded = 0
  let total = 0
  let transcoded = 0
  for (const trackProgress of filteredProgress) {
    const summary = trackProgressSummary(trackProgress, key)
    loaded += summary.loaded
    transcoded += summary.transcode * summary.total
    total += summary.total
  }

  const fileUploadProgress = total === 0 ? 0 : loaded / total
  const transcodeProgress = total === 0 ? 0 : transcoded / total

  const overallProgress =
    key === 'art'
      ? fileUploadProgress
      : UPLOAD_WEIGHT * fileUploadProgress +
        TRANSCODE_WEIGHT * transcodeProgress

  return overallProgress
}

export const getCombinedUploadPercentage = (state: CommonState) => {
  const artProgress = getKeyUploadProgress(state, 'art')
  const audioProgress = getKeyUploadProgress(state, 'audio')
  const percent = floor(
    100 * (ART_WEIGHT * artProgress + AUDIO_WEIGHT * audioProgress)
  )
  return clamp(percent, 0, 100)
}

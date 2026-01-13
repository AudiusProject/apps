import { cloneDeep } from 'lodash'

import { StemUploadWithFile } from '~/models'

import {
  TOGGLE_MULTI_TRACK_NOTIFICATION,
  UPLOAD_TRACKS_REQUESTED,
  UPLOAD_TRACKS_SUCCEEDED,
  UPLOAD_TRACKS_FAILED,
  UPDATE_PROGRESS,
  RESET,
  uploadTracksRequested,
  uploadTracksSucceeded,
  updateProgress,
  updateFormState,
  UPDATE_FORM_STATE
} from './actions'
import {
  ProgressState,
  ProgressStatus,
  UploadState,
  TrackForUpload,
  UploadType
} from './types'

const initialState: UploadState = {
  openMultiTrackNotification: true,
  metadata: null,
  uploadType: null,
  stems: [],
  uploading: false,
  uploadProgress: null,
  formState: null,
  success: false,

  // For multitrack upload, we allow some tracks to
  // fail without aborting the whole thing
  failedTrackIndices: [],

  // Id to take the user to after completing upload.
  // Can be either a track or playlist/album.
  completionId: null,
  error: false
}

const initialUploadState: ProgressState = {
  clientId: '',
  art: {
    status: ProgressStatus.UPLOADING,
    loaded: 0,
    total: 0,
    transcode: 0
  },
  audio: {
    status: ProgressStatus.UPLOADING,
    loaded: 0,
    total: 0,
    transcode: 0
  },
  stems: []
}
const getInitialProgress = (upload: TrackForUpload | StemUploadWithFile) => {
  const res = cloneDeep(initialUploadState)
  res.art.total =
    upload.metadata.artwork && 'file' in upload.metadata.artwork
      ? (upload.metadata.artwork?.file?.size ?? 0)
      : 0
  res.audio.total = upload.file?.size ?? 0
  res.stems =
    'stems' in upload.metadata
      ? (upload.metadata.stems
          ?.filter((stem) => 'file' in stem)
          .map((stem) => getInitialProgress(stem as StemUploadWithFile)) ?? [])
      : []
  return res
}

const actionsMap = {
  [TOGGLE_MULTI_TRACK_NOTIFICATION](
    state: UploadState,
    action: { open: boolean }
  ) {
    return {
      ...state,
      openMultiTrackNotification: action.open
    }
  },
  [UPLOAD_TRACKS_REQUESTED](
    state: UploadState,
    action: ReturnType<typeof uploadTracksRequested>
  ) {
    const newState = { ...state }
    const { tracks, uploadType } = action.payload
    newState.uploading = true
    const existingProgress = state.uploadProgress ?? []
    newState.uploadProgress = tracks?.map(
      (t, i) => existingProgress[i] ?? getInitialProgress(t)
    )
    newState.metadata =
      action.payload.uploadType === UploadType.ALBUM ||
      action.payload.uploadType === UploadType.PLAYLIST
        ? action.payload.metadata
        : null
    newState.uploadType = uploadType ?? null
    newState.error = false
    newState.success = false
    return newState
  },
  [UPLOAD_TRACKS_SUCCEEDED](
    state: UploadState,
    action: ReturnType<typeof uploadTracksSucceeded>
  ) {
    const { id } = action
    const newState = { ...state }
    newState.uploading = false
    newState.success = true
    newState.completionId = id
    newState.uploadType = null
    newState.stems = []
    return newState
  },
  [UPLOAD_TRACKS_FAILED](state: UploadState) {
    const newState = { ...state }
    newState.uploading = false
    newState.uploadType = null
    newState.metadata = null
    newState.stems = []
    newState.error = true
    return newState
  },
  [UPDATE_PROGRESS](
    state: UploadState,
    action: ReturnType<typeof updateProgress>
  ) {
    const { key, clientId, stemIndex, progress } = action.payload
    const newState = { ...state }
    newState.uploadProgress = [...(state.uploadProgress ?? [])]
    if (!newState.uploadProgress.find((p) => p && p.clientId === clientId)) {
      newState.uploadProgress.push({
        ...cloneDeep(initialUploadState),
        clientId
      })
    }
    const trackIndex = newState.uploadProgress.findIndex(
      (p) => p && p.clientId === clientId
    )

    if (
      stemIndex !== null &&
      newState.uploadProgress[trackIndex] &&
      !newState.uploadProgress[trackIndex]?.stems[stemIndex]
    ) {
      newState.uploadProgress[trackIndex].stems[stemIndex] = {
        ...cloneDeep(initialUploadState),
        art: {
          status: ProgressStatus.COMPLETE,
          loaded: 0,
          total: 0,
          transcode: 0
        }
      }
    }

    const prevProgress =
      stemIndex === null
        ? newState.uploadProgress[trackIndex]?.[key]
        : newState.uploadProgress[trackIndex]?.stems[stemIndex][key]
    const nextProgress = { ...prevProgress }
    nextProgress.status = progress.status
    if (progress.loaded && progress.total) {
      // Don't allow progress to jump backwards on retries
      nextProgress.loaded = Math.max(nextProgress.loaded ?? 0, progress.loaded)
      nextProgress.total = progress.total
    }
    if (progress.transcode) {
      nextProgress.transcode = Math.min(
        Math.max(progress.transcode, nextProgress.transcode ?? 0),
        1
      )
    }
    if (stemIndex === null) {
      newState.uploadProgress[trackIndex][key] = nextProgress
    } else {
      newState.uploadProgress[trackIndex].stems[stemIndex][key] = nextProgress
    }
    return newState
  },
  [UPDATE_FORM_STATE](
    state: UploadState,
    action: ReturnType<typeof updateFormState>
  ) {
    return {
      ...state,
      formState: action.payload
    }
  },
  [RESET](state: UploadState) {
    return {
      ...initialState,
      openMultiTrackNotification: state.openMultiTrackNotification
    }
  }
}

export default function upload(
  state = initialState,
  action: { type: keyof typeof actionsMap }
) {
  const matchingReduceFunction = actionsMap[action.type]
  if (!matchingReduceFunction) return state
  // @ts-ignore action type should be a unionType of all actions in actions.ts
  return matchingReduceFunction(state, action)
}

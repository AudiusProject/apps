import { NativeFile } from '@audius/sdk'

import { CollectionValues } from '~/schemas'

import { ID } from '../../models'

import {
  Progress,
  TrackForUpload,
  TrackMetadataForUpload,
  UploadFormState,
  UploadType
} from './types'

export const UPLOAD_TRACKS = 'UPLOAD/UPLOAD_TRACKS'
export const UPLOAD_TRACKS_REQUESTED = 'UPLOAD/UPLOAD_TRACKS_REQUESTED'
export const UPLOAD_TRACKS_SUCCEEDED = 'UPLOAD/UPLOAD_TRACKS_SUCCEEDED'
export const UPLOAD_TRACKS_FAILED = 'UPLOAD/UPLOAD_TRACKS_FAILED'
export const UPLOAD_SINGLE_TRACK_FAILED = 'UPLOAD/UPLOAD_SINGLE_TRACK_FAILED'

export const UPDATE_TRACK_AUDIO = 'UPLOAD/UPDATE_TRACK_AUDIO'

export const UPDATE_PERCENT = 'UPLOAD/UPDATE_PERCENT'
export const INCREMENT_PERCENT = 'UPLOAD/INCREMENT_PERCENT'
export const UPDATE_PROGRESS = 'UPLOAD/UPDATE_PROGRESS'
export const RESET = 'UPLOAD/RESET'
export const TOGGLE_MULTI_TRACK_NOTIFICATION =
  'UPLOAD/TOGGLE_MULTI_TRACK_NOTIFICATION'
export const UPDATE_FORM_STATE = 'UPLOAD/UPDATE_FORM_STATE'

type UploadPayload =
  | {
      uploadType: UploadType.INDIVIDUAL_TRACK | UploadType.INDIVIDUAL_TRACKS
      tracks: TrackForUpload[]
    }
  | {
      uploadType: UploadType.ALBUM | UploadType.PLAYLIST
      tracks: TrackForUpload[]
      metadata: CollectionValues
    }

export const uploadTracks = (payload: UploadPayload) => {
  return { type: UPLOAD_TRACKS, payload }
}

export const uploadSingleTrackFailed = (index: number) => {
  return { type: UPLOAD_SINGLE_TRACK_FAILED, index }
}

export const uploadTracksRequested = (payload: UploadPayload) => {
  return {
    type: UPLOAD_TRACKS_REQUESTED,
    payload
  }
}

export const uploadTracksSucceeded = (payload: { id: number | null }) => {
  return {
    type: UPLOAD_TRACKS_SUCCEEDED,
    ...payload
  }
}

export const uploadTracksFailed = () => {
  return { type: UPLOAD_TRACKS_FAILED }
}

export const updateProgress = (payload: {
  clientId: string
  stemIndex: number | null
  key: 'audio' | 'art'
  progress: Progress
}) => {
  return { type: UPDATE_PROGRESS, payload }
}

// Action for replacing track audio
export const updateTrackAudio = (payload: {
  trackId: ID
  file: File | NativeFile
  metadata?: TrackMetadataForUpload
}) => {
  return {
    type: UPDATE_TRACK_AUDIO,
    payload
  }
}

// Persists the form state in the store for resuming upload
// upon navigating back to the upload page
export const updateFormState = (payload: UploadFormState) => {
  return { type: UPDATE_FORM_STATE, payload }
}

// Actions used to reset the react state and then the store state of upload from external container

export const reset = () => {
  return { type: RESET }
}

export const toggleMultiTrackNotification = (open = false) => {
  return { type: TOGGLE_MULTI_TRACK_NOTIFICATION, open }
}

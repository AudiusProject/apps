import { NativeFile } from '@audius/sdk'

import { CollectionValues } from '~/schemas'

import {
  CollectionMetadata,
  StemUpload,
  StemUploadWithFile,
  TrackMetadata
} from '../../models'
import { Nullable } from '../../utils/typeUtils'

export enum UploadType {
  INDIVIDUAL_TRACK = 0,
  INDIVIDUAL_TRACKS = 1,
  PLAYLIST = 2,
  ALBUM = 3
}

/**
 * Represents a track file, its metadata prior to upload, and a preview.
 */
export interface TrackForUpload {
  clientId: string
  file: File | NativeFile
  preview?: any // Basically the Howler.js API, but with underscores.
  metadata: TrackMetadataForUpload
}

export interface TrackForEdit {
  metadata: TrackMetadataForUpload
  metadata_time?: number
}

export const isTrackForEdit = (
  track: TrackForUpload | TrackForEdit
): track is TrackForEdit => !('file' in track)

export const isTrackForUpload = (
  track: TrackForUpload | TrackForEdit
): track is TrackForUpload => 'file' in track

/**
 * Unlike normal Track metadata, TrackMetadataForUpload includes additional
 * files: artwork and a stems field with StemsForUpload.
 * This type is used for both Upload and Edit flows.
 */
export interface TrackMetadataForUpload
  extends Omit<TrackMetadata, 'artwork' | 'track_id'> {
  artwork?:
    | Nullable<{
        file?: Blob | NativeFile
        url: string
        source?: string
      }>
    | TrackMetadata['artwork']
  stems?: (StemUploadWithFile | StemUpload)[]
  /** During Upload, tracks will typically not have a track_id, but it might
   * be assigned ahead of time for tracks with stems.
   */
  track_id?: number
}

export enum ProgressStatus {
  /** The file is being uploaded to the storage node. */
  UPLOADING = 'UPLOADING',
  /** The file is uploaded and being processed by the storage node. (Transcoding) */
  PROCESSING = 'PROCESSING',
  /** The upload is complete. */
  COMPLETE = 'COMPLETE',
  /** The upload failed. */
  ERROR = 'ERROR'
}

export type Progress = {
  /** The current status of the upload. */
  status: ProgressStatus
  /** Bytes currently uploaded. */
  loaded?: number
  /** Total number of bytes. */
  total?: number
  /** The transcoding progress, from [0, 1]. Used for audio files only. */
  transcode?: number
}

export type ProgressState = {
  clientId: string
  /** The progress of the artwork upload. */
  art: Progress
  /** The progress of the audio track upload. */
  audio: Progress
  /** Nested progress for a track's stems (audio only). */
  stems: ProgressState[]
}

type InitialFormState = {
  uploadType: undefined
  tracks: undefined
  metadata: undefined
}

export type TrackFormState = {
  uploadType: UploadType.INDIVIDUAL_TRACK | UploadType.INDIVIDUAL_TRACKS
  tracks: TrackForUpload[]
}

export type CollectionFormState = {
  uploadType: UploadType.ALBUM | UploadType.PLAYLIST
  tracks: TrackForUpload[]
  metadata: CollectionValues
}

export type UploadFormState =
  | TrackFormState
  | CollectionFormState
  | InitialFormState

type UploadStateBase = {
  openMultiTrackNotification: boolean
  metadata: Nullable<CollectionValues>
  uploading: boolean
  uploadProgress: Nullable<ProgressState[]>
  success: boolean
  error: boolean
  completionId: Nullable<number>
  stems: StemUpload[][]
  failedTrackIndices: number[]
  formState: Nullable<UploadFormState>
}

type UploadStateForTracks = UploadStateBase & {
  uploadType: UploadType.INDIVIDUAL_TRACK | UploadType.INDIVIDUAL_TRACKS | null
}

type UploadStateForCollection = UploadStateBase & {
  uploadType: UploadType.ALBUM | UploadType.PLAYLIST | null
}

/** The type for the upload reducer state of the store. */
export type UploadState = UploadStateForCollection | UploadStateForTracks

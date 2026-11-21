import { type Genre, type Mood, NativeFile } from '@audius/sdk'

import { CollectionValues } from '~/schemas'

import { StemUpload, StemUploadWithFile, TrackMetadata } from '../../models'
import { Nullable } from '../../utils/typeUtils'

export enum UploadType {
  INDIVIDUAL_TRACK = 0,
  INDIVIDUAL_TRACKS = 1,
  PLAYLIST = 2,
  ALBUM = 3
}

export interface TrackForUpload {
  clientId: string
  file: File | NativeFile
  preview?: any
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

export interface TrackMetadataForUpload
  extends Omit<TrackMetadata, 'artwork' | 'track_id' | 'genre' | 'mood'> {
  genre?: Genre | '' | string
  mood?: Mood | string | null
  artwork?:
    | Nullable<{
        file?: Blob | NativeFile
        url: string
        source?: string
      }>
    | TrackMetadata['artwork']
  stems?: (StemUploadWithFile | StemUpload)[]
  track_id?: number
}

export enum ProgressStatus {
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export type Progress = {
  status: ProgressStatus
  loaded?: number
  total?: number
  transcode?: number
}

export type ProgressState = {
  clientId: string
  image: Progress
  audio: Progress
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

export type UploadState = UploadStateForCollection | UploadStateForTracks

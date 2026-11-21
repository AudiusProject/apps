import {
  TrackMetadataForUpload,
  TrackForUpload,
  TrackForEdit
} from '@audius/common/store'

export type SingleTrackEditValues = Omit<TrackMetadataForUpload, 'remixOf'> & {
  remix_of: {
    tracks: { parent_track_id: number }[]
  } | null
}

export type TrackEditFormValues = {
  tracks: (TrackForUpload | TrackForEdit)[]
  trackMetadatas: SingleTrackEditValues[]
  trackMetadatasIndex: number
}

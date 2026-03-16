import { Track } from '@audius/sdk/services'
import { Dispatch } from 'redux'

import { ID } from '~/models/Identifiers'
import { StemUploadWithFile } from '~/models/Stems'
import { Stem } from '~/models/Track'
import { stemsUploadActions } from '~/store/stems-upload'
import { TrackMetadataForUpload } from '~/store/upload'
import { uuid } from '~/utils/uid'

const { startStemUploads } = stemsUploadActions

type TrackWithStems = {
  _stems?: Stem[]
  track_id: number
} & Partial<Track>

/**
 * Handles stem updates for a track, including new uploads and removals
 * @param track The track being updated with new metadata
 * @param currentTrack The existing track data
 * @param inProgressStemUploads Any stem uploads that are currently in progress
 * @param dispatch Redux dispatch function
 */
export const handleStemUpdates = (
  metadata: Partial<TrackMetadataForUpload>,
  currentTrack: TrackWithStems,
  inProgressStemUploads: any[] = [],
  deleteTrack: (trackId: ID) => void,
  dispatch: Dispatch
) => {
  if (!metadata.stems) return

  const existingStems = currentTrack._stems || []

  // Calculate stems to upload (new stems)
  const addedStems = metadata.stems.filter((stem) => {
    return !existingStems.find((existingStem) => {
      return existingStem.track_id === stem.metadata.track_id
    })
  })

  const addedStemsWithFiles = addedStems.filter(
    (stem) => 'file' in stem
  ) as StemUploadWithFile[]

  // Calculate stems to remove
  const removedStems = existingStems
    .filter((existingStem) => {
      return !metadata.stems?.find(
        (stem) => stem.metadata.track_id === existingStem.track_id
      )
    })
    .filter((existingStem) => {
      return !inProgressStemUploads.find(
        (upload) => upload.metadata.track_id === existingStem.track_id
      )
    })

  // Handle stem uploads
  if (addedStemsWithFiles.length > 0) {
    dispatch(
      startStemUploads({
        parentId: currentTrack.track_id,
        uploads: addedStemsWithFiles,
        batchUID: uuid()
      })
    )
  }

  // Handle stem removals
  removedStems.forEach((stem) => {
    deleteTrack(stem.track_id)
  })
}

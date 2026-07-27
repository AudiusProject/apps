import { Dispatch } from 'redux'

import { ID } from '~/models/Identifiers'
import { StemUploadWithFile } from '~/models/Stems'
import { stemsUploadActions } from '~/store/stems-upload'
import { TrackMetadataForUpload } from '~/store/upload'
import { uuid } from '~/utils/uid'

const { startStemUploads } = stemsUploadActions

/**
 * The shape this module needs off an already-published stem. Both the
 * `StemTrack`s returned by `useStems` and the lighter `Stem` records satisfy
 * it.
 */
type ExistingStem = {
  track_id: ID
}

/**
 * Reconciles the stem list submitted by an edit form against the stems already
 * published on the track: uploads the ones that were added, deletes the ones
 * that were removed.
 *
 * `existingStems` must be the *server* view of the track's stems (from the
 * stems query), not anything derived from the submitted metadata. Passing an
 * empty list means "no removals can be detected" — which is the safe failure
 * mode, and what this did unconditionally when it read the never-populated
 * `_stems` field off the cached track.
 *
 * @param metadata The track metadata being submitted
 * @param trackId The track being updated — parent for any new stem uploads
 * @param existingStems The stems currently published on the track
 * @param inProgressStemUploads Any stem uploads that are currently in progress
 * @param deleteTrack Callback used to delete a removed stem's track
 * @param dispatch Redux dispatch function
 */
export const handleStemUpdates = (
  metadata: Partial<TrackMetadataForUpload>,
  trackId: ID,
  existingStems: ExistingStem[],
  inProgressStemUploads: any[] = [],
  deleteTrack: (trackId: ID) => void,
  dispatch: Dispatch
) => {
  if (!metadata.stems) return

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
        parentId: trackId,
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

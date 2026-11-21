import { Dispatch } from 'redux'

import { ID } from '~/models/Identifiers'
import { StemUploadWithFile } from '~/models/Stems'
import { stemsUploadActions } from '~/store/stems-upload'
import { TrackMetadataForUpload } from '~/store/upload'
import { uuid } from '~/utils/uid'

const { startStemUploads } = stemsUploadActions

type ExistingStem = {
  track_id: ID
}

export const handleStemUpdates = (
  metadata: Partial<TrackMetadataForUpload>,
  trackId: ID,
  existingStems: ExistingStem[],
  inProgressStemUploads: any[] = [],
  deleteTrack: (trackId: ID) => void,
  dispatch: Dispatch
) => {
  if (!metadata.stems) return

  const addedStems = metadata.stems.filter((stem) => {
    return !existingStems.find((existingStem) => {
      return existingStem.track_id === stem.metadata.track_id
    })
  })

  const addedStemsWithFiles = addedStems.filter(
    (stem) => 'file' in stem
  ) as StemUploadWithFile[]

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

  if (addedStemsWithFiles.length > 0) {
    dispatch(
      startStemUploads({
        parentId: trackId,
        uploads: addedStemsWithFiles,
        batchUID: uuid()
      })
    )
  }

  removedStems.forEach((stem) => {
    deleteTrack(stem.track_id)
  })
}

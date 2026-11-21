import { useCallback } from 'react'

import { useTrack, useUser } from '~/api'
import type { ID } from '~/models'
import type { TrackMetadataForUpload } from '~/store'

type EnterContestArtwork = {
  url: string
  file: any
}

export const useEnterContest = (trackId: ID | undefined) => {
  const { data: originalTrack } = useTrack(trackId)
  const { data: originalUser } = useUser(originalTrack?.owner_id)

  const buildInitialMetadata = useCallback(
    (
      artwork?: EnterContestArtwork
    ): Partial<TrackMetadataForUpload> | undefined => {
      if (!trackId) return undefined
      return {
        ...(artwork ? { artwork } : {}),
        genre: originalTrack?.genre ?? '',
        remix_of: {
          tracks: [
            {
              parent_track_id: trackId,
              user: originalUser,
              has_remix_author_reposted: false,
              has_remix_author_saved: false
            }
          ]
        }
      }
    },
    [trackId, originalUser, originalTrack?.genre]
  )

  return { originalTrack, originalUser, buildInitialMetadata }
}

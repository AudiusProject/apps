import { useMemo } from 'react'

import { useCollection } from '@audius/common/api'
import { PlaylistLibraryID } from '@audius/common/models'
import { playbackSelectors } from '@audius/common/store'
import { useSelector } from 'react-redux'

const { getTrackId, getPlaying, getCollectionId } = playbackSelectors

/**
 * Used to determine if a track from a specific playlist is currently playing.
 */
export const usePlaylistPlayingStatus = (id: PlaylistLibraryID) => {
  const currentTrackId = useSelector(getTrackId)
  const isPlaying = useSelector(getPlaying)
  const playingCollectionId = useSelector(getCollectionId)

  const { data: collectionTrackIds } = useCollection(
    typeof id === 'string' ? null : id,
    {
      select: (collection) => new Set(collection?.trackIds),
      // ensure read only so we dont fetch all collections in left-nav
      enabled: false
    }
  )

  return useMemo(() => {
    if (!collectionTrackIds || !currentTrackId || !isPlaying) return false

    const hasTrack = collectionTrackIds.has(currentTrackId)
    const isSource = playingCollectionId === id

    return hasTrack && isSource
  }, [collectionTrackIds, currentTrackId, isPlaying, playingCollectionId, id])
}

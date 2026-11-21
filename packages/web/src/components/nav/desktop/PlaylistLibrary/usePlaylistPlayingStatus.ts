import { useMemo } from 'react'

import { useCollection } from '@audius/common/api'
import { PlaylistLibraryID } from '@audius/common/models'
import { playbackSelectors } from '@audius/common/store'
import { useSelector } from 'react-redux'

const { getTrackId, getPlaying, getCollectionId } = playbackSelectors

export const usePlaylistPlayingStatus = (id: PlaylistLibraryID) => {
  const currentTrackId = useSelector(getTrackId)
  const isPlaying = useSelector(getPlaying)
  const playingCollectionId = useSelector(getCollectionId)

  const { data: collectionTrackIds } = useCollection(
    typeof id === 'string' ? null : id,
    {
      select: (collection) => new Set(collection?.trackIds),
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

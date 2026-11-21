import { getCollectionQueryKey } from '@audius/common/api'
import { ID, Kind } from '@audius/common/models'
import { Uid } from '@audius/common/utils'
import { QueryClient } from '@tanstack/react-query'

type DraftCollection = {
  trackIds?: ID[]
  track_count?: number
  playlist_contents: {
    track_ids: { track: ID; time: number; uid?: string }[]
  }
}

export const addTrackToDraftCollection = (
  queryClient: QueryClient,
  collectionId: ID,
  trackId: ID
) => {
  queryClient.setQueryData<DraftCollection>(
    getCollectionQueryKey(collectionId),
    (prev) => {
      if (!prev) return prev
      if (prev.trackIds?.includes(trackId)) return prev
      const time = Math.round(Date.now() / 1000)
      const uid = new Uid(Kind.TRACKS, trackId, 'collection').toString()
      const nextTrackIds = [...(prev.trackIds ?? []), trackId]
      return {
        ...prev,
        trackIds: nextTrackIds,
        track_count: nextTrackIds.length,
        playlist_contents: {
          ...prev.playlist_contents,
          track_ids: [
            ...prev.playlist_contents.track_ids,
            { track: trackId, time, uid }
          ]
        }
      }
    }
  )
}

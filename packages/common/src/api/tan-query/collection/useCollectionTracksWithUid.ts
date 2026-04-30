import { useMemo } from 'react'

import { TrackMetadata } from '~/models'

import { TQCollection } from '../models'
import { useTracks } from '../tracks/useTracks'

export type CollectionTrack = TrackMetadata

/**
 * Returns the tracks belonging to a collection, in playlist order.
 * NOTE: not an actual query hook, more of a selector.
 */
export const useOrderedCollectionTracks = (
  collection:
    | Pick<TQCollection, 'playlist_contents' | 'trackIds' | 'playlist_id'>
    | undefined,
  enabled: boolean = true
) => {
  const { byId, isPending } = useTracks(collection?.trackIds, {
    enabled
  })

  return useMemo(() => {
    if (isPending) {
      return []
    }
    return (collection?.playlist_contents?.track_ids ?? [])
      .map((t) => {
        const trackId = t?.track
        if (!byId?.[trackId]) {
          console.error(`Found empty track ${trackId}`)
          return null
        }
        return byId[trackId]
      })
      .filter(Boolean) as CollectionTrack[]
  }, [isPending, collection?.playlist_contents?.track_ids, byId])
}

import { useMemo } from 'react'

import { useCollection, useTracks, useUsers } from '@audius/common/api'
import type { ID, UID } from '@audius/common/models'
import type { EnhancedCollectionTrack } from '@audius/common/store'
import { removeNullable, Uid } from '@audius/common/utils'
import { uniq } from 'lodash'

export const useEnhancedCollectionTracks = (uid: UID) => {
  const collectionId = useMemo(() => Uid.fromString(uid)?.id as ID, [uid])
  const { data: playlistTracks } = useCollection(collectionId, {
    select: (collection) => collection.playlist_contents.track_ids
  })

  const { data: tracks, byId: tracksById } = useTracks(
    uniq(playlistTracks?.map((t) => t.track))
  )

  const { byId: usersById } = useUsers(uniq(tracks?.map((t) => t.owner_id)))

  const collectionTracks = useMemo(() => {
    if (!playlistTracks || !tracks || !usersById) return []

    const collectionSource = Uid.fromString(uid).source

    return playlistTracks
      .map((t, i) => {
        const trackUid = Uid.fromString(t.uid ?? '')
        trackUid.source = `${collectionSource}:${trackUid.source}`
        trackUid.count = i

        const track = tracksById[t.track]
        if (!track) {
          console.error(`Found empty track ${t.track}`)
          return null
        }

        const user = usersById[track.owner_id]
        if (!user) {
          console.error(`Found empty user ${track.owner_id}`)
          return null
        }

        return {
          ...track,
          uid: trackUid.toString(),
          user
        }
      })
      .filter(removeNullable) as EnhancedCollectionTrack[]
  }, [playlistTracks, tracks, usersById, uid, tracksById])

  return collectionTracks
}

import { queryTracks } from '@audius/common/api'
import { CollectionMetadata, ID, Kind } from '@audius/common/models'
import { makeUid } from '@audius/common/utils'
import { chunk } from 'lodash'
import { all, call } from 'typed-redux-saga'

const TRACKS_BATCH_LIMIT = 200

export function* queryTracksForCollections(
  collections: CollectionMetadata[],
  excludedTrackIdSet: Set<ID>
) {
  const allTrackIds = collections.reduce((acc, cur) => {
    const trackIds = cur.playlist_contents.track_ids.map((t) => t.track)
    return [...acc, ...trackIds]
  }, [] as ID[])
  const filteredTrackIds = [
    ...new Set(allTrackIds.filter((id) => !excludedTrackIdSet.has(id)))
  ]
  const chunkedTracks = yield* all(
    chunk(filteredTrackIds, TRACKS_BATCH_LIMIT).map((chunkedTrackIds) =>
      call(queryTracks, chunkedTrackIds)
    )
  )

  const tracks = chunkedTracks.flat(1)

  const unfetchedIdSet = new Set()
  for (let i = 0; i < tracks.length; i++) {
    if (!tracks[i]) {
      unfetchedIdSet.add(filteredTrackIds[i])
    }
  }

  return collections.map((c) => {
    const filteredIds = c.playlist_contents.track_ids.filter(
      (t) => !unfetchedIdSet.has(t.track)
    )
    const withUids = filteredIds.map((t) => ({
      ...t,
      uid: t.uid || makeUid(Kind.TRACKS, t.track, `collection:${c.playlist_id}`)
    }))

    return {
      ...c,
      playlist_contents: {
        track_ids: withUids
      }
    }
  })
}

import { call, all } from 'typed-redux-saga'

import { Track } from '~/models'
import { ID } from '~/models/Identifiers'
import { getContext } from '~/store/effects'
import { getSDK } from '~/store/sdkUtils'
import { removeNullable, Uid } from '~/utils'

import { TQTrack } from '../models'
import { QUERY_KEYS } from '../queryKeys'
import { getTrackQueryFn, getTrackQueryKey } from '../tracks/useTrack'
import { entityCacheOptions } from '../utils/entityCacheOptions'

import { queryCurrentUserId } from './queryAccount'
import { queryCollection } from './queryCollection'

export function* queryTrack(id: ID | null | undefined) {
  if (!id) return null
  const queryClient = yield* getContext('queryClient')
  const sdk = yield* getSDK()
  const currentUserId = yield* call(queryCurrentUserId)
  const dispatch = yield* getContext('dispatch')

  const queryData = yield* call([queryClient, queryClient.fetchQuery], {
    queryKey: getTrackQueryKey(id),
    queryFn: async () =>
      getTrackQueryFn(id!, currentUserId, queryClient, sdk, dispatch),
    ...entityCacheOptions
  })

  return queryData as TQTrack | undefined
}

export function* queryTracks(ids: ID[]): Generator<any, Track[], any> {
  if (!ids.length) return [] as Track[]

  // Query each track in parallel using queryTrack
  const tracks = yield* all(ids.map((id) => call(queryTrack, id)))

  // Filter out null and undefined results and return as Track[]
  return tracks.filter(removeNullable)
}

export function* queryAllTracks() {
  const queryClient = yield* getContext('queryClient')
  const queries = queryClient.getQueriesData<TQTrack>({
    queryKey: [QUERY_KEYS.track]
  })
  return queries.reduce(
    (acc, [_key, track]) => {
      if (track?.track_id) {
        acc[track.track_id] = track
      }
      return acc
    },
    {} as Record<ID, TQTrack>
  )
}

export function* queryTrackByUid(uid: string | null | undefined) {
  if (!uid) return null
  const trackId = Number(Uid.fromString(uid).id)
  return yield* queryTrack(trackId)
}

export function* queryCollectionTracks(
  collectionId: ID | null | undefined
): Generator<any, Track[], any> {
  if (!collectionId) return [] as Track[]

  // Get collection data
  const collection = yield* call(queryCollection, collectionId)
  if (!collection) return [] as Track[]

  // Extract track IDs from collection
  const trackIds = collection.playlist_contents.track_ids.map(
    ({ track }: { track: ID }) => track
  )

  // Query all tracks in parallel
  return yield* call(queryTracks, trackIds)
}

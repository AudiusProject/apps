import { repostActivityFromSDK } from '@audius/common/adapters'
import {
  ID,
  Track,
  UserTrackMetadata,
  OptionalId,
  UserCollectionMetadata
} from '@audius/common/models'
import { transformAndCleanList } from '@audius/common/src/adapters/utils'
import { getSDK } from '@audius/common/store'
import { full } from '@audius/sdk'
import { all } from 'redux-saga/effects'

import { processAndCacheCollections } from 'common/store/cache/collections/utils'
import { processAndCacheTracks } from 'common/store/cache/tracks/utils'
import { waitForRead } from 'utils/sagaHelpers'

const getTracksAndCollections = (
  feed: (UserTrackMetadata | UserCollectionMetadata)[]
) =>
  feed.reduce(
    (
      acc: [UserTrackMetadata[], UserCollectionMetadata[]],
      cur: UserTrackMetadata | UserCollectionMetadata
    ) =>
      ('track_id' in cur
        ? [[...acc[0], cur], acc[1]]
        : [acc[0], [...acc[1], cur]]) as [
        UserTrackMetadata[],
        UserCollectionMetadata[]
      ],
    [[], []]
  )

type RetrieveUserRepostsArgs = {
  handle: string
  currentUserId: ID | null
  offset?: number
  limit?: number
}

export function* retrieveUserReposts({
  handle,
  currentUserId,
  offset,
  limit
}: RetrieveUserRepostsArgs): Generator<any, Track[], any> {
  yield* waitForRead()
  const sdk = yield* getSDK()

  const { data: repostsSDKData } = yield sdk.full.users.getRepostsByHandle({
    handle,
    userId: OptionalId.parse(currentUserId),
    limit,
    offset
  })
  const reposts = transformAndCleanList(
    repostsSDKData,
    // `getTracksAndCollections` below expects a list of just the items
    (activity: full.ActivityFull) => repostActivityFromSDK(activity)?.item
  )

  const [tracks, collections] = getTracksAndCollections(reposts)
  const trackIds = tracks.map((t) => t.track_id)
  const [processedTracks, processedCollections] = yield all([
    processAndCacheTracks(tracks),
    processAndCacheCollections(
      collections,
      /* shouldRetrieveTracks */ false,
      trackIds
    )
  ])
  const processedTracksMap = processedTracks.reduce(
    (acc: any, cur: any) => ({ ...acc, [cur.track_id]: cur }),
    {}
  )
  const processedCollectionsMap = processedCollections.reduce(
    (acc: any, cur: any) => ({ ...acc, [cur.playlist_id]: cur }),
    {}
  )
  const processed = reposts.map((m: any) =>
    m.track_id
      ? processedTracksMap[m.track_id]
      : processedCollectionsMap[m.playlist_id]
  )

  return processed
}

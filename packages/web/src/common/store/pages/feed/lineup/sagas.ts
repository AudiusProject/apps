import {
  transformAndCleanList,
  userFeedItemFromSDK
} from '@audius/common/adapters'
import {
  primeTrackDataSaga,
  primeCollectionDataSaga,
  queryCurrentUserId
} from '@audius/common/api'
import {
  FeedFilter,
  Kind,
  Collection,
  UserCollectionMetadata,
  ID,
  TrackMetadata,
  LineupTrack
} from '@audius/common/models'
import {
  feedPageLineupActions as feedActions,
  feedPageSelectors,
  CommonState,
  getSDK
} from '@audius/common/store'
import { Id, type GetUserFeedFilterEnum } from '@audius/sdk/services'
import { all, call, select } from 'typed-redux-saga'

import { LineupSagas } from 'common/store/lineup/sagas'
import { waitForRead } from 'utils/sagaHelpers'

import { getFollowIds } from '../../signon/selectors'
const { getFeedFilter } = feedPageSelectors

type FeedItem = LineupTrack | Collection

const filterMap: { [k in FeedFilter]: GetUserFeedFilterEnum } = {
  [FeedFilter.ALL]: 'all',
  [FeedFilter.ORIGINAL]: 'original',
  [FeedFilter.REPOST]: 'repost'
}

function* getTracks({
  offset,
  limit
}: {
  offset: number
  limit: number
}): Generator<any, FeedItem[] | null, any> {
  yield* waitForRead()
  const currentUserId = yield* call(queryCurrentUserId)
  if (!currentUserId) return []
  const filterEnum: FeedFilter = yield* select(getFeedFilter)
  const sdk = yield* getSDK()
  const filter = filterMap[filterEnum]

  // If the user has followee user ids set, use those to fetch the feed.
  // It implies that the feed is otherwise going to be empty so we give a
  // hint to the API.
  const followeeUserIds = yield* select(getFollowIds)

  const userId = Id.parse(currentUserId)
  const { data = [] } = yield* call([sdk.users, sdk.users.getUserFeed], {
    id: userId,
    userId,
    filter,
    limit,
    offset,
    followeeUserId: followeeUserIds.length ? followeeUserIds : undefined,
    withUsers: true
  })
  const feed = transformAndCleanList(data, userFeedItemFromSDK).map(
    ({ item }) => item
  )
  if (feed === null) return null
  const filteredFeed = feed.filter((record) => !record.user.is_deactivated)
  const [tracks, collections] = getTracksAndCollections(filteredFeed)

  // Process (e.g. cache and remove entries)
  const [processedTracks, processedCollections] = (yield* all([
    primeTrackDataSaga(tracks),
    primeCollectionDataSaga(collections)
  ])) as [LineupTrack[], Collection[]]
  const processedTracksMap = processedTracks.reduce<Record<ID, LineupTrack>>(
    (acc, cur) => ({ ...acc, [cur.track_id]: cur }),
    {}
  )
  const processedCollectionsMap = processedCollections.reduce<
    Record<ID, Collection>
  >((acc, cur) => ({ ...acc, [cur.playlist_id]: cur }), {})
  const processedFeed: FeedItem[] = filteredFeed.map((m) =>
    (m as LineupTrack).track_id
      ? processedTracksMap[(m as LineupTrack).track_id]
      : processedCollectionsMap[(m as UserCollectionMetadata).playlist_id]
  )

  return processedFeed
}

const getTracksAndCollections = (
  feed: Array<TrackMetadata | UserCollectionMetadata>
) =>
  feed.reduce<[LineupTrack[], UserCollectionMetadata[]]>(
    (acc, cur) =>
      (cur as LineupTrack).track_id
        ? [[...acc[0], cur as LineupTrack], acc[1]]
        : [acc[0], [...acc[1], cur as UserCollectionMetadata]],
    [[], []]
  )

const keepActivityTimeStamp = (
  entry: (LineupTrack | Collection) & { uid: string } // LineupSaga adds a UID to each entry
) => ({
  uid: entry.uid,
  kind: (entry as LineupTrack).track_id ? Kind.TRACKS : Kind.COLLECTIONS,
  id: (entry as LineupTrack).track_id || (entry as Collection).playlist_id,
  activityTimestamp: entry.activity_timestamp
})

class FeedSagas extends LineupSagas<FeedItem> {
  constructor() {
    super(
      feedActions.prefix,
      feedActions,
      (store: CommonState) => store.pages.feed.feed,
      getTracks,
      keepActivityTimeStamp,
      undefined,
      undefined
    )
  }
}

export default function sagas() {
  return new FeedSagas().getSagas()
}

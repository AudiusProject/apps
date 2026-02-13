import {
  transformAndCleanList,
  userTrackMetadataFromSDK
} from '@audius/common/adapters'
import { primeTrackDataSaga, queryTracks } from '@audius/common/api'
import { TimeRange, ID, Track } from '@audius/common/models'
import { StringKeys } from '@audius/common/services'
import {
  trendingPageLineupSelectors,
  trendingPageActions,
  trendingPageSelectors,
  getContext,
  getSDK
} from '@audius/common/store'
import { Genre, Nullable } from '@audius/common/utils'
import { OptionalId } from '@audius/sdk'
import { keccak_256 } from 'js-sha3'
import { call, put, select } from 'typed-redux-saga'

import { waitForRead } from 'utils/sagaHelpers'
const { getLastFetchedTrendingGenre, getTrendingGenre } = trendingPageSelectors
const { setLastFetchedTrendingGenre } = trendingPageActions
const { getTrendingEntries } = trendingPageLineupSelectors

type RetrieveTrendingArgs = {
  timeRange: TimeRange
  genre: Nullable<Genre>
  offset: number
  limit: number
  currentUserId: Nullable<ID> | undefined
}

export function* retrieveTrending({
  timeRange,
  genre,
  offset,
  limit,
  currentUserId
}: RetrieveTrendingArgs): Generator<any, Track[], any> {
  yield* waitForRead()
  const sdk = yield* getSDK()
  const remoteConfigInstance = yield* getContext('remoteConfigInstance')

  yield call(remoteConfigInstance.waitForRemoteConfig)
  const TF = new Set(
    remoteConfigInstance.getRemoteVar(StringKeys.TF)?.split(',') ?? []
  )

  const version = remoteConfigInstance.getRemoteVar(
    StringKeys.TRENDING_EXPERIMENT
  )

  const cachedTracks: ReturnType<ReturnType<typeof getTrendingEntries>> =
    yield select(getTrendingEntries(timeRange))

  const lastGenre = yield select(getLastFetchedTrendingGenre)
  yield put(setLastFetchedTrendingGenre(genre))

  const useCached = lastGenre === genre && cachedTracks.length > offset + limit

  if (useCached) {
    const trackIds = cachedTracks.slice(offset, limit + offset).map((t) => t.id)
    const tracks: Track[] = yield* call(queryTracks, trackIds)
    return tracks.filter((t: Track) => !t.is_unlisted)
  }

  const args = {
    genre: genre ?? undefined,
    offset,
    limit,
    time: timeRange,
    userId: OptionalId.parse(currentUserId)
  }

  const { data = [] } = version
    ? yield sdk.full.tracks.getTrendingTracksWithVersion({ ...args, version })
    : yield sdk.full.tracks.getTrendingTracks(args)
  let apiTracks = transformAndCleanList(data, userTrackMetadataFromSDK)

  // DN may return hidden tracks in trending because of its cache
  // i.e. when a track is in trending and the owner makes it hidden,
  // it will still be returned in the trending api for a little while.
  // We check the store to see if any of the returned tracks are locally hidden,
  // if so, we filter them out.
  const tracks: Track[] = yield* call(
    queryTracks,
    apiTracks.map((t) => t.track_id)
  )
  apiTracks = apiTracks.filter(
    (t) =>
      !tracks.find((track: Track) => track.track_id === t.track_id)?.is_unlisted
  )

  if (TF.size > 0) {
    apiTracks = apiTracks.filter((t) => {
      const shaId = keccak_256(t.track_id.toString())
      return !TF.has(shaId)
    })
  }

  const currentGenre = yield select(getTrendingGenre)

  // If we changed genres, do nothing
  if (currentGenre !== genre) return []

  return yield* call(primeTrackDataSaga, apiTracks)
}

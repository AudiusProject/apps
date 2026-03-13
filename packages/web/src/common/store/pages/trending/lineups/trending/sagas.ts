import { queryCurrentUserId } from '@audius/common/api'
import { TimeRange, Track, Collection } from '@audius/common/models'
import {
  trendingPageLineupActions,
  trendingPageSelectors
} from '@audius/common/store'
import { call, select } from 'typed-redux-saga'

import { LineupSagas } from 'common/store/lineup/sagas'
import { waitForReachability } from 'store/reachability/sagas'

import { retrieveTrending } from './retrieveTrending'
const { getTrendingGenre } = trendingPageSelectors
const {
  TRENDING_WEEK_PREFIX,
  TRENDING_MONTH_PREFIX,
  TRENDING_ALL_TIME_PREFIX,
  trendingWeekActions,
  trendingMonthActions,
  trendingAllTimeActions
} = trendingPageLineupActions

function getTracks(timeRange: TimeRange) {
  return function* ({ offset, limit }: { offset: number; limit: number }) {
    // Trending is a public page and should not block on account status initialization.
    // Waiting only for reachability avoids account-loading races during sign-in.
    yield* waitForReachability()
    const genreAtStart = yield* select(getTrendingGenre)
    let userId: number | null | undefined
    try {
      userId = yield* call(queryCurrentUserId)
    } catch (e: any) {
      console.warn(`Trending user context unavailable: ${e?.message ?? e}`)
      userId = undefined
    }
    try {
      const tracks = yield* retrieveTrending({
        timeRange,
        limit,
        offset,
        genre: genreAtStart,
        currentUserId: userId ?? undefined
      })
      return tracks
    } catch (e: any) {
      console.error(`Trending error: ${e.message}`)
      return []
    }
  }
}

class TrendingWeekSagas extends LineupSagas<Track | Collection> {
  constructor() {
    super(
      TRENDING_WEEK_PREFIX,
      trendingWeekActions,
      (store) => store.pages.trending.trendingWeek,
      getTracks(TimeRange.WEEK)
    )
  }
}

class TrendingMonthSagas extends LineupSagas<Track | Collection> {
  constructor() {
    super(
      TRENDING_MONTH_PREFIX,
      trendingMonthActions,
      (store) => store.pages.trending.trendingMonth,
      getTracks(TimeRange.MONTH)
    )
  }
}

class TrendingAllTimeSagas extends LineupSagas<Track | Collection> {
  constructor() {
    super(
      TRENDING_ALL_TIME_PREFIX,
      trendingAllTimeActions,
      (store) => store.pages.trending.trendingAllTime,
      getTracks(TimeRange.ALL_TIME)
    )
  }
}

export default function sagas() {
  return [
    ...new TrendingWeekSagas().getSagas(),
    ...new TrendingMonthSagas().getSagas(),
    ...new TrendingAllTimeSagas().getSagas()
  ]
}

import { History } from 'history'

import { LineupActions, asLineup } from '~/store/lineup/reducer'
import {
  SET_TRENDING_GENRE,
  SET_TRENDING_TIME_RANGE,
  SET_LAST_FETCHED_TRENDING_GENRE,
  SetTrendingGenreAction,
  SetTrendingTimeRangeAction,
  SetLastFetchedTrendingGenreAction,
  TrendingPageAction
} from '~/store/pages/trending/actions'
import {
  TRENDING_WEEK_PREFIX,
  TRENDING_MONTH_PREFIX,
  TRENDING_ALL_TIME_PREFIX
} from '~/store/pages/trending/lineup/actions'
import { GENRES, Genre } from '~/utils/genres'

import { TimeRange, Track } from '../../../models'

import {
  trendingWeek,
  trendingMonth,
  trendingAllTime,
  makeInitialState
} from './lineup/reducer'
import { TrendingPageState } from './types'

const actionsMap = {
  [SET_TRENDING_TIME_RANGE](
    state: TrendingPageState,
    action: SetTrendingTimeRangeAction
  ) {
    return {
      ...state,
      trendingTimeRange: action.timeRange
    }
  },
  [SET_TRENDING_GENRE](
    state: TrendingPageState,
    action: SetTrendingGenreAction
  ) {
    return {
      ...state,
      trendingGenre: action.genre
    }
  },
  [SET_LAST_FETCHED_TRENDING_GENRE](
    state: TrendingPageState,
    action: SetLastFetchedTrendingGenreAction
  ) {
    return {
      ...state,
      lastFetchedTrendingGenre: action.genre
    }
  }
}

const trendingWeekReducer = asLineup(TRENDING_WEEK_PREFIX, trendingWeek)
const trendingMonthReducer = asLineup(TRENDING_MONTH_PREFIX, trendingMonth)
const trendingAllTimeReducer = asLineup(
  TRENDING_ALL_TIME_PREFIX,
  trendingAllTime
)

const reducer =
  (history?: History) =>
  (
    state: TrendingPageState,
    action: TrendingPageAction | LineupActions<Track>
  ) => {
    if (!state) {
      const initialState = {
        lastFetchedTrendingGenre: null,
        trendingWeek: makeInitialState(TRENDING_WEEK_PREFIX),
        trendingMonth: makeInitialState(TRENDING_MONTH_PREFIX),
        trendingAllTime: makeInitialState(TRENDING_ALL_TIME_PREFIX),
        trendingGenre: null,
        trendingTimeRange: TimeRange.WEEK
      }

      if (history) {
        const urlParams = new URLSearchParams(history.location.search)
        const genre = urlParams.get('genre') as Genre | null
        const timeRange = urlParams.get('timeRange') as TimeRange | null
        return {
          ...initialState,
          trendingTimeRange:
            timeRange && Object.values(TimeRange).includes(timeRange)
              ? timeRange
              : TimeRange.WEEK,
          trendingGenre:
            genre && Object.values(GENRES).includes(genre) ? genre : null
        }
      }

      return initialState
    }
    const trendingWeek = trendingWeekReducer(
      state.trendingWeek,
      action as LineupActions<Track>
    )
    if (trendingWeek !== state.trendingWeek) return { ...state, trendingWeek }

    const trendingMonth = trendingMonthReducer(
      state.trendingMonth,
      action as LineupActions<Track>
    )
    if (trendingMonth !== state.trendingMonth)
      return { ...state, trendingMonth }

    const trendingAllTime = trendingAllTimeReducer(
      state.trendingAllTime,
      action as LineupActions<Track>
    )
    if (trendingAllTime !== state.trendingAllTime) {
      return { ...state, trendingAllTime }
    }

    // Handle each action type separately
    switch (action.type) {
      case SET_TRENDING_GENRE:
        return actionsMap[SET_TRENDING_GENRE](
          state,
          action as SetTrendingGenreAction
        )
      case SET_TRENDING_TIME_RANGE:
        return actionsMap[SET_TRENDING_TIME_RANGE](
          state,
          action as SetTrendingTimeRangeAction
        )
      case SET_LAST_FETCHED_TRENDING_GENRE:
        return actionsMap[SET_LAST_FETCHED_TRENDING_GENRE](
          state,
          action as SetLastFetchedTrendingGenreAction
        )
      default:
        return state
    }
  }

export default reducer

import { History } from 'history'

import {
  SET_TRENDING_GENRE,
  SET_TRENDING_TIME_RANGE,
  SET_TRENDING_CATEGORY,
  SET_LAST_FETCHED_TRENDING_GENRE,
  SetTrendingGenreAction,
  SetTrendingTimeRangeAction,
  SetTrendingCategoryAction,
  SetLastFetchedTrendingGenreAction,
  TrendingPageAction
} from '~/store/pages/trending/actions'
import { parseTrendingGenreFromUrl } from '~/utils/genres'

import { TimeRange } from '../../../models'

import { TrendingPageState } from './types'

const actionsMap = {
  [SET_TRENDING_TIME_RANGE](
    state: TrendingPageState,
    action: SetTrendingTimeRangeAction
  ) {
    return { ...state, trendingTimeRange: action.timeRange }
  },
  [SET_TRENDING_CATEGORY](
    state: TrendingPageState,
    action: SetTrendingCategoryAction
  ) {
    return { ...state, trendingCategory: action.category }
  },
  [SET_TRENDING_GENRE](
    state: TrendingPageState,
    action: SetTrendingGenreAction
  ) {
    return { ...state, trendingGenre: action.genre }
  },
  [SET_LAST_FETCHED_TRENDING_GENRE](
    state: TrendingPageState,
    action: SetLastFetchedTrendingGenreAction
  ) {
    return { ...state, lastFetchedTrendingGenre: action.genre }
  }
}

const reducer =
  (history?: History) =>
  (state: TrendingPageState, action: TrendingPageAction) => {
    if (!state) {
      const initialState: TrendingPageState = {
        lastFetchedTrendingGenre: null,
        trendingGenre: null,
        trendingTimeRange: TimeRange.WEEK,
        trendingCategory: 'tracks'
      }

      if (history) {
        const urlParams = new URLSearchParams(history.location.search)
        const genreParam = urlParams.get('genre')
        const timeRange = urlParams.get('timeRange') as TimeRange | null
        return {
          ...initialState,
          trendingTimeRange:
            timeRange && Object.values(TimeRange).includes(timeRange)
              ? timeRange
              : TimeRange.WEEK,
          trendingGenre: parseTrendingGenreFromUrl(genreParam)
        }
      }

      return initialState
    }

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
      case SET_TRENDING_CATEGORY:
        return actionsMap[SET_TRENDING_CATEGORY](
          state,
          action as SetTrendingCategoryAction
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

import { CommonState } from '~/store/commonStore'

import { TimeRange } from '../../../models'

export const getDiscoverTrendingWeekLineup = (state: CommonState) =>
  state.pages.trending.trendingWeek

export const getDiscoverTrendingMonthLineup = (state: CommonState) =>
  state.pages.trending.trendingMonth

export const getDiscoverTrendingAllTimeLineup = (state: CommonState) =>
  state.pages.trending.trendingAllTime

export const makeGetTrendingLineup =
  (timeRange: TimeRange) => (state: CommonState) => {
    return {
      [TimeRange.WEEK]: state.pages.trending.trendingWeek,
      [TimeRange.MONTH]: state.pages.trending.trendingMonth,
      [TimeRange.ALL_TIME]: state.pages.trending.trendingAllTime
    }[timeRange]
  }

export const getCurrentDiscoverTrendingLineup = (state: CommonState) => {
  const timeRange = state.pages.trending.trendingTimeRange
  return makeGetTrendingLineup(timeRange)(state)
}

export const getTrendingTimeRange = (state: CommonState) =>
  state.pages.trending.trendingTimeRange

export const getTrendingGenre = (state: CommonState) =>
  state.pages.trending.trendingGenre

export const getLastFetchedTrendingGenre = (state: CommonState) =>
  state.pages.trending.lastFetchedTrendingGenre

import { CommonState } from '~/store/commonStore'

export const getTrendingTimeRange = (state: CommonState) =>
  state.pages.trending.trendingTimeRange

export const getTrendingGenre = (state: CommonState) =>
  state.pages.trending.trendingGenre

export const getTrendingCategory = (state: CommonState) =>
  state.pages.trending.trendingCategory

export const getLastFetchedTrendingGenre = (state: CommonState) =>
  state.pages.trending.lastFetchedTrendingGenre

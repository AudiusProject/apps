import { Genre } from '~/utils'

import { TimeRange } from '../../../models'

export const SET_TRENDING_GENRE = 'TRENDING/SET_TRENDING_GENRE'
export const SET_TRENDING_TIME_RANGE = 'TRENDING/SET_TRENDING_TIME_RANGE'
export const SET_LAST_FETCHED_TRENDING_GENRE =
  'TRENDING/SET_LAST_FETCHED_TRENDING_GENRE'

export type SetTrendingGenreAction = {
  type: typeof SET_TRENDING_GENRE
  genre: Genre | null
}

export type SetTrendingTimeRangeAction = {
  type: typeof SET_TRENDING_TIME_RANGE
  timeRange: TimeRange
}

export type SetLastFetchedTrendingGenreAction = {
  type: typeof SET_LAST_FETCHED_TRENDING_GENRE
  genre: Genre | null
}

export type TrendingPageAction =
  | SetTrendingGenreAction
  | SetTrendingTimeRangeAction
  | SetLastFetchedTrendingGenreAction

export const setTrendingGenre = (genre: Genre | null) => ({
  type: SET_TRENDING_GENRE,
  genre
})

export const setTrendingTimeRange = (timeRange: TimeRange) => ({
  type: SET_TRENDING_TIME_RANGE,
  timeRange
})

export const setLastFetchedTrendingGenre = (genre: Genre | null) => ({
  type: SET_LAST_FETCHED_TRENDING_GENRE,
  genre
})

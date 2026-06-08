import { TimeRange } from '@audius/common/models'
import { GENRES, Genre } from '@audius/common/utils'

import { URL_PARAM_KEYS } from './constants'

type TrendingUrlParams = {
  genre: string | null
  timeRange: TimeRange | null
  week: string | null
}

const WEEK_YYYY_MM_DD_REGEX = /^\d{4}-\d{2}-\d{2}$/

// ========== URL Utils ==========

/**
 * Parse URL parameters for trending page
 */
export const parseUrlParams = (): TrendingUrlParams => {
  const urlParams = new URLSearchParams(window.location.search)
  const genre = urlParams.get(URL_PARAM_KEYS.GENRE)
  const timeRange = urlParams.get(URL_PARAM_KEYS.TIME_RANGE) as TimeRange | null

  const week = urlParams.get(URL_PARAM_KEYS.WINNERS_WEEK)

  return {
    genre,
    timeRange,
    week: isValidWinnersWeek(week) ? week : null
  }
}

/**
 * Validate YYYY-MM-DD format for winners week param
 */
export const isValidWinnersWeek = (week: string | null): boolean =>
  week !== null && WEEK_YYYY_MM_DD_REGEX.test(week)

/**
 * Validate if a genre string is a valid genre
 */
export const isValidGenre = (genre: string | null): boolean => {
  return genre !== null && Object.values(GENRES).includes(genre as any)
}

/**
 * Validate if a time range string is a valid time range
 */
export const isValidTimeRange = (timeRange: string | null): boolean => {
  return (
    timeRange !== null &&
    Object.values(TimeRange).includes(timeRange as TimeRange)
  )
}

/**
 * Update a URL parameter
 */
export const updateUrlParam = (
  key: string,
  value: string | null,
  replaceRoute: (route: { search: string }) => void
) => {
  const urlParams = new URLSearchParams(window.location.search)

  if (value) {
    urlParams.set(key, value)
  } else {
    urlParams.delete(key)
  }

  replaceRoute({ search: `?${urlParams.toString()}` })
}

/**
 * Update genre URL parameter
 */
export const updateGenreUrlParam = (
  genre: Genre | null,
  replaceRoute: (route: { search: string }) => void
) => {
  updateUrlParam(URL_PARAM_KEYS.GENRE, genre, replaceRoute)
}

/**
 * Update time range URL parameter
 */
export const updateTimeRangeUrlParam = (
  timeRange: TimeRange,
  replaceRoute: (route: { search: string }) => void
) => {
  updateUrlParam(URL_PARAM_KEYS.TIME_RANGE, timeRange, replaceRoute)
}

/**
 * Update winners week URL parameter
 */
export const updateWinnersWeekParam = (
  week: string | null,
  replaceRoute: (route: { search: string }) => void
) => {
  updateUrlParam(URL_PARAM_KEYS.WINNERS_WEEK, week, replaceRoute)
}

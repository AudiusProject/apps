import { RefObject } from 'react'

import { TimeRange, Track, LineupState, UID } from '@audius/common/models'
import { QueueSource } from '@audius/common/store'
import { GENRES, Genre } from '@audius/common/utils'

import { TIME_RANGE_ACTION_MAP, URL_PARAM_KEYS } from './constants'
import { TrendingUrlParams } from './providerTypes'

const WEEK_YYYY_MM_DD_REGEX = /^\d{4}-\d{2}-\d{2}$/

// ========== Lineup Utils ==========

/**
 * Dynamically dispatch call to a lineup action based on a timeRange
 */
export const callLineupAction = (
  timeRange: TimeRange,
  action: string,
  ...args: any[]
) => {
  const timeRangeMap = TIME_RANGE_ACTION_MAP
  return (timeRangeMap[timeRange] as any)[action](...args)
}

/**
 * Create lineup props for a given lineup
 */
export const createLineupProps = (
  lineup: any,
  playingUid: UID | null,
  source: QueueSource | null,
  currentTrack: Track | null,
  playing: boolean,
  buffering: boolean,
  containerRef: RefObject<HTMLDivElement> | undefined
) => {
  return {
    lineup,
    playingUid: playingUid || ('' as UID),
    playingSource: source || '',
    playingTrackId: currentTrack ? currentTrack.track_id : null,
    playing,
    buffering,
    scrollParent: containerRef?.current || null,
    selfLoad: true
  }
}

/**
 * Get lineup for a specific time range
 */
export const getLineupForTimeRange = (
  timeRange: TimeRange,
  trendingWeek: LineupState<Track>,
  trendingMonth: LineupState<Track>,
  trendingAllTime: LineupState<Track>,
  getLineupProps: (lineup: any) => any
) => {
  switch (timeRange) {
    case TimeRange.WEEK:
      return getLineupProps(trendingWeek)
    case TimeRange.MONTH:
      return getLineupProps(trendingMonth)
    case TimeRange.ALL_TIME:
      return getLineupProps(trendingAllTime)
    default:
      return getLineupProps(trendingAllTime)
  }
}

// ========== Scroll Utils ==========

/**
 * Scroll to top for a given time range lineup
 */
export const scrollToTop = (
  timeRange: TimeRange,
  getLineupForRange: (timeRange: TimeRange) => {
    scrollParent: HTMLDivElement | null
  }
) => {
  const lineup = getLineupForRange(timeRange)
  if (lineup.scrollParent && lineup.scrollParent.scrollTo) {
    lineup.scrollParent.scrollTo(0, 0)
  }
}

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

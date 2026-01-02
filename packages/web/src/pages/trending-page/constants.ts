import { TimeRange } from '@audius/common/models'
import { trendingPageLineupActions } from '@audius/common/store'

import { createSeoDescription } from 'ssr/metaTags'

// Static messages used throughout the trending page
export const TRENDING_MESSAGES = {
  trendingTitle: 'Trending',
  pageTitle: "Listen to what's trending on the Audius platform",
  trendingDescription: createSeoDescription(
    "Listen to what's trending on the Audius platform"
  )
} as const

// URL parameter keys for trending page
export const URL_PARAM_KEYS = {
  GENRE: 'genre',
  TIME_RANGE: 'timeRange'
} as const

// Time range to lineup actions mapping
const {
  trendingActions,
  trendingAllTimeActions,
  trendingMonthActions,
  trendingWeekActions
} = trendingPageLineupActions

export const TIME_RANGE_ACTION_MAP = {
  [TimeRange.WEEK]: trendingWeekActions,
  [TimeRange.MONTH]: trendingMonthActions,
  [TimeRange.ALL_TIME]: trendingAllTimeActions
} as const

// Default time range for trending page
export const DEFAULT_TIME_RANGE = TimeRange.WEEK

// Trending page specific actions (not time-range specific)
export const TRENDING_ACTIONS = trendingActions

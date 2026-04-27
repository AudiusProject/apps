import { TimeRange } from '@audius/common/models'

import { getTrendingContext } from 'ssr/metaTags'

// Static messages used throughout the trending page
const trendingContext = getTrendingContext()
export const TRENDING_MESSAGES = {
  trendingTitle: trendingContext.title,
  pageTitle: trendingContext.title,
  trendingDescription: trendingContext.description
} as const

// URL parameter keys for trending page
export const URL_PARAM_KEYS = {
  GENRE: 'genre',
  TIME_RANGE: 'timeRange',
  WINNERS_WEEK: 'week'
} as const

// Default time range for trending page
export const DEFAULT_TIME_RANGE = TimeRange.WEEK

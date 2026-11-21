import { TimeRange } from '@audius/common/models'

import { getTrendingContext } from 'ssr/metaTags'

const trendingContext = getTrendingContext()
export const TRENDING_MESSAGES = {
  trendingTitle: trendingContext.title,
  pageTitle: trendingContext.title,
  trendingDescription: trendingContext.description
} as const

export const URL_PARAM_KEYS = {
  GENRE: 'genre',
  TIME_RANGE: 'timeRange',
  WINNERS_WEEK: 'week'
} as const

export const DEFAULT_TIME_RANGE = TimeRange.WEEK

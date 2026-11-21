import { Genre } from '~/utils'

import { TimeRange } from '../../../models'

export type TrendingCategory = 'tracks' | 'underground' | 'winners'

export type TrendingPageState = {
  trendingTimeRange: TimeRange
  trendingGenre: Genre | null
  lastFetchedTrendingGenre: Genre | null
  trendingCategory: TrendingCategory
}

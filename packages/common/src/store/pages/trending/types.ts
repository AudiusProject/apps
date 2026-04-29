import { Genre } from '~/utils'

import { TimeRange } from '../../../models'

export type TrendingCategory = 'tracks' | 'underground' | 'winners'

export type TrendingPageState = {
  trendingTimeRange: TimeRange
  trendingGenre: Genre | null
  lastFetchedTrendingGenre: Genre | null
  /** Mobile: selected tab for trending (Tracks vs Underground vs Winners). */
  trendingCategory: TrendingCategory
}

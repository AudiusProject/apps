import { Genre } from '~/utils'

import { LineupState, TimeRange, Track } from '../../../models'

export type TrendingCategory = 'tracks' | 'underground'

export type TrendingPageState = {
  trendingWeek: LineupState<Track>
  trendingMonth: LineupState<Track>
  trendingAllTime: LineupState<Track>
  trendingTimeRange: TimeRange
  trendingGenre: Genre | null
  lastFetchedTrendingGenre: Genre | null
  /** Mobile: selected tab for trending (Tracks vs Underground). */
  trendingCategory: TrendingCategory
}

import { TimeRange, ID, Lineup, Track, User } from '@audius/common/models'
import { Genre } from '@audius/sdk'

type ExtraTrendingLineupProps = {}

export interface TrendingPageContentProps {
  trendingTitle: string
  pageTitle: string
  trendingDescription: string
  trending: Lineup<any>
  trendingWeek: Lineup<any, ExtraTrendingLineupProps>
  trendingMonth: Lineup<any, ExtraTrendingLineupProps>
  trendingAllTime: Lineup<any, ExtraTrendingLineupProps>

  fetchSuggestedFollowUsers: () => void
  followUsers: (userIDs: ID[]) => void
  suggestedFollows: User[]
  playTrendingTrack: (trackId: ID) => void
  pauseTrendingTrack: () => void
  refreshTrendingInView: (overwrite: boolean) => void
  hasAccount: boolean
  goToTrending: () => void
  goToSignUp: () => void
  goToGenreSelection: () => void
  setTrendingInView: (inView: boolean) => void
  switchView: () => void
  getLineupProps: (lineup: Lineup<any>) => {
    lineup: Lineup<any>
    playingSource: string
    playingTrackId: ID | null
    playing: boolean
    buffering: boolean
    scrollParent: HTMLElement | null
    selfLoad: boolean
  }
  resetTrendingLineup: () => void

  trendingGenre: Genre | null
  trendingTimeRange: TimeRange
  lastFetchedTrendingGenre: string | null
  setTrendingGenre: (genre: string | null) => void
  setTrendingTimeRange: (timeRange: TimeRange) => void

  makeLoadMore: (
    timeRange: TimeRange
  ) => (offset: number, limit: number, overwrite: boolean) => void
  makePlayTrack: (timeRange: TimeRange) => (trackId: ID) => void
  makePauseTrack: (timeRange: TimeRange) => () => void
  makeSetInView: (timeRange: TimeRange) => (inView: boolean) => void
  makeRefreshTrendingInView: (
    timeRange: TimeRange
  ) => (overwrite: boolean) => void
  makeResetTrending: (timeRange: TimeRange) => () => void

  getLineupForRange: (timeRange: TimeRange) => {
    lineup: Lineup<Track>
    playingSource: any
    playingTrackId: ID | null
    playing: boolean
    buffering: boolean
    scrollParent: HTMLElement | null
    selfLoad: boolean
  }
  scrollToTop: (timeRange: TimeRange) => void
}

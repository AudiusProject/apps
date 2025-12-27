import { TimeRange, Track, LineupState, UID } from '@audius/common/models'
import { QueueSource } from '@audius/common/store'
import { Genre } from '@audius/common/utils'
import { Dispatch } from 'redux'

// Core state props from Redux
export interface TrendingPageStateProps {
  trendingWeek: LineupState<Track>
  trendingMonth: LineupState<Track>
  trendingAllTime: LineupState<Track>
  uid: UID | null
  source: QueueSource | null
  playing: boolean
  buffering: boolean
  trendingTimeRange: TimeRange
  trendingGenre: Genre | null
  lastFetchedTrendingGenre: Genre | null
}

// Action props from Redux dispatch
export interface TrendingPageDispatchProps {
  dispatch: Dispatch
  openSignOn: (signIn: boolean) => void
  resetTrendingLineup: () => void
  goToRoute: (route: string) => void
  replaceRoute: (route: { search: string }) => void
  refreshTrendingInView: (overwrite: boolean) => void
  playTrendingTrack: (uid: UID) => void
  pauseTrendingTrack: () => void
  setTrendingGenre: (genre: string | null) => void
  setTrendingTimeRange: (timeRange: TimeRange) => void
  makeRefreshTrendingInView: (
    timeRange: TimeRange
  ) => (overwrite: boolean) => void
  makeLoadMore: (
    timeRange: TimeRange
  ) => (offset: number, limit: number, overwrite: boolean) => void
  makePlayTrack: (timeRange: TimeRange) => (uid: UID) => void
  makePauseTrack: (timeRange: TimeRange) => () => void
  makeSetInView: (timeRange: TimeRange) => (inView: boolean) => void
  makeResetTrending: (timeRange: TimeRange) => () => void
}

// URL parameter types
export interface TrendingUrlParams {
  genre: string | null
  timeRange: TimeRange | null
}

// Hook return types
export interface TrendingPageHookReturn {
  trendingGenre: Genre | null
  trendingTimeRange: TimeRange
  lastFetchedTrendingGenre: Genre | null
  hasAccount: boolean
  isMobile: boolean
  currentTrack: Track | null
}

export interface TrendingActionsReturn {
  goToSignUp: () => void
  goToGenreSelection: () => void
  setTrendingGenre: (genre: string | null) => void
  setTrendingTimeRange: (timeRange: TimeRange) => void
  makeLoadMore: (
    timeRange: TimeRange
  ) => (offset: number, limit: number, overwrite: boolean) => void
  makePlayTrack: (timeRange: TimeRange) => (uid: UID) => void
  makePauseTrack: (timeRange: TimeRange) => () => void
  makeSetInView: (timeRange: TimeRange) => (inView: boolean) => void
  makeRefreshTrendingInView: (
    timeRange: TimeRange
  ) => (overwrite: boolean) => void
  makeResetTrending: (timeRange: TimeRange) => () => void
  playTrendingTrack: (uid: UID) => void
  pauseTrendingTrack: () => void
  refreshTrendingInView: (overwrite: boolean) => void
  resetTrendingLineup: () => void
  replaceRoute: (route: { search: string }) => void
}

export interface TrendingLineupsReturn {
  trendingWeek: LineupState<Track>
  trendingMonth: LineupState<Track>
  trendingAllTime: LineupState<Track>
  getLineupProps: (lineup: any) => {
    lineup: any
    playingUid: UID
    playingSource: string
    playingTrackId: number | null
    playing: boolean
    buffering: boolean
    scrollParent: HTMLDivElement | null
    selfLoad: boolean
  }
  getLineupForRange: (timeRange: TimeRange) => {
    lineup: any
    playingUid: UID
    playingSource: string
    playingTrackId: number | null
    playing: boolean
    buffering: boolean
    scrollParent: HTMLDivElement | null
    selfLoad: boolean
  }
  scrollToTop: (timeRange: TimeRange) => void
}

export interface TrendingUrlParamsReturn {
  updateGenreUrlParam: (genre: Genre | null) => void
  updateTimeRangeUrlParam: (timeRange: TimeRange) => void
}

// Lineup action factory type
export type LineupActionFactory = {
  [action: string]: (...args: any[]) => any
}

// Time range to actions mapping
export interface TimeRangeActionMap {
  [TimeRange.WEEK]: LineupActionFactory
  [TimeRange.MONTH]: LineupActionFactory
  [TimeRange.ALL_TIME]: LineupActionFactory
}

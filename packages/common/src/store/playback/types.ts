import { FeedTab, ID, Track, User } from '../../models'

export const PLAYBACK_RATE_LS_KEY = 'playbackRate'

export type PlaybackRate =
  | '0.5x'
  | '0.8x'
  | '1x'
  | '1.1x'
  | '1.2x'
  | '1.5x'
  | '2x'
  | '2.5x'
  | '3x'

export const playbackRateValueMap: Record<PlaybackRate, number> = {
  '0.5x': 0.5,
  '0.8x': 0.8,
  '1x': 1.0,
  '1.1x': 1.1,
  '1.2x': 1.2,
  '1.5x': 1.5,
  '2x': 2.0,
  '2.5x': 2.5,
  '3x': 3.0
}

export enum PlayerBehavior {
  FULL_OR_PREVIEW = 'FULL_OR_PREVIEW',
  PREVIEW_OR_FULL = 'PREVIEW_OR_FULL'
}

export enum RepeatMode {
  OFF = 'OFF',
  ALL = 'ALL',
  SINGLE = 'SINGLE'
}

export enum QueueSource {
  COLLECTION_TRACKS = 'COLLECTION_TRACKS',
  DISCOVER_FEED = 'DISCOVER_FEED',
  DISCOVER_TRENDING = 'DISCOVER_TRENDING',
  DISCOVER_TRENDING_WEEK = 'DISCOVER_TRENDING_WEEK',
  DISCOVER_TRENDING_MONTH = 'DISCOVER_TRENDING_MONTH',
  DISCOVER_TRENDING_ALL_TIME = 'DISCOVER_TRENDING_ALL_TIME',
  HISTORY_TRACKS = 'HISTORY_TRACKS',
  PROFILE_FEED = 'PROFILE_FEED',
  PROFILE_TRACKS = 'PROFILE_TRACKS',
  SAVED_TRACKS = 'SAVED_TRACKS',
  SEARCH_TRACKS = 'SEARCH_TRACKS',
  TRACK_TRACKS = 'TRACK_TRACKS',
  RECOMMENDED_TRACKS = 'RECOMMENDED_TRACKS',
  CHAT_TRACKS = 'CHAT_TRACKS',
  CHAT_PLAYLIST_TRACKS = 'CHAT_PLAYLIST_TRACKS',
  EXPLORE_PREMIUM_TRACKS = 'EXPLORE_PREMIUM_TRACKS',
  PICK_WINNERS_TRACKS = 'PICK_WINNERS_TRACKS',
  DISCOVER_TRENDING_WINNERS = 'DISCOVER_TRENDING_WINNERS',
  EXPLORE = 'EXPLORE'
}

export type Queueable = {
  id: ID | string
  artistId?: ID
  source: QueueSource
  playerBehavior?: PlayerBehavior
}

export type QueueItem = {
  trackId: ID | null
  source: QueueSource | null
  track: Track | null
  user: User | null
}

export type PlaybackTrack = {
  trackId: ID
  source: string
  collectionId?: ID
  feedType?: FeedTab
  playerBehavior?: PlayerBehavior
}

export type PlaybackQuerySource = {
  queryKey: unknown[]
}

export type PlaybackState = {
  queue: PlaybackTrack[]
  index: number

  playingIndex: number
  playingTrackId: ID | null

  playing: boolean
  buffering: boolean
  previewing: boolean

  seek: number | null
  seekCounter: number

  counter: number

  playbackRate: PlaybackRate

  repeat: RepeatMode
  shuffle: boolean
  shuffleOriginalQueue: PlaybackTrack[]
  shuffleOriginalIndices: number[]

  querySource: PlaybackQuerySource | null

  retries: number

  overshot: boolean
  undershot: boolean
}

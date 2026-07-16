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

// Free-form-ish source tag attached to every queued track. Pages dispatch
// playFrom with one of these so that mobile offline-download checks and
// PlaylistLibrary current-track highlighting can switch on it.
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

// Lightweight queue-entry descriptor used by chat playback and a few page
// helpers that build add-to-queue lists. The saga adapts to PlaybackTrack at
// the boundary.
export type Queueable = {
  id: ID | string
  artistId?: ID
  source: QueueSource
  playerBehavior?: PlayerBehavior
}

// Minimal "currently playing" descriptor. Identity is (trackId, source) — for
// tile-highlight comparisons callers also have the queue index available.
export type QueueItem = {
  trackId: ID | null
  source: QueueSource | null
  track: Track | null
  user: User | null
}

// A single entry in the playback queue. Identity is the queue index — the
// queue may contain duplicates, and (queue.length, index) disambiguates them.
export type PlaybackTrack = {
  trackId: ID
  // Free-form-ish source tag (e.g. 'trending-week', 'profile:handle:tracks').
  // Used for analytics, mobile offline-download checks, and PlaylistLibrary
  // current-track highlighting.
  source: string
  // The collection (playlist/album) id this entry was queued from, if any.
  // Set by collection-page when building its queue; consumed by analytics
  // (PLAYBACK_PLAY events).
  collectionId?: ID
  // The feed view (FOR_YOU / LATEST) this entry was queued from, if any.
  // Set by the feed lineup when building its queue; consumed by analytics
  // (PLAYBACK_PLAY events). Stamped at queue time so passive plays report
  // the view the track actually came from even if the user switches tabs.
  feedType?: FeedTab
  playerBehavior?: PlayerBehavior
}

// Points the saga at the tanquery that produced this queue so it can paginate
// in more tracks when we approach the end of the queue.
export type PlaybackQuerySource = {
  queryKey: unknown[]
}

export type PlaybackState = {
  queue: PlaybackTrack[]
  // -1 when the queue is empty / nothing loaded yet.
  index: number

  // Identity of the audio currently *loaded* into the engine. Set on
  // playSucceeded; lags behind queue[index] during the brief load gap so
  // tile-highlight comparisons keep the previously-playing tile active until
  // the new track actually starts.
  playingIndex: number
  playingTrackId: ID | null

  playing: boolean
  buffering: boolean
  previewing: boolean

  seek: number | null
  seekCounter: number

  // Increments on every "new play" — used by listen-recording to distinguish
  // a replay of the same track from a fresh one.
  counter: number

  playbackRate: PlaybackRate

  repeat: RepeatMode
  shuffle: boolean
  // The pre-shuffle queue, captured when shuffle is enabled. Empty when
  // shuffle is off. Mutations (add/remove/reorder) keep this in sync so
  // disabling shuffle restores a coherent original order.
  shuffleOriginalQueue: PlaybackTrack[]
  // Parallel array to `queue` while shuffle is on:
  // shuffleOriginalIndices[i] is the position of queue[i] in
  // shuffleOriginalQueue. Empty when shuffle is off.
  shuffleOriginalIndices: number[]

  querySource: PlaybackQuerySource | null

  retries: number

  // True when next() was a no-op because we're at end of queue with
  // repeat=OFF. The saga reads this to reset rather than re-load the same
  // track. Cleared on play/playFrom/playTrackAt and any successful advance.
  overshot: boolean
  // Same idea for previous() at start of queue.
  undershot: boolean
}

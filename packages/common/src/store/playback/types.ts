import { ID, Track, UID, User } from '../../models'

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

// Legacy queue-entry shape. Chat playback and a few page helpers still build
// add-to-queue lists in this form; the saga adapts them to PlaybackTrack at
// the boundary. Worth keeping as a public shape so callers don't leak the
// trackId-vs-id rename into their own data flow.
export type Queueable = {
  id: ID | string
  uid: UID
  artistId?: ID
  source: QueueSource
  playerBehavior?: PlayerBehavior
}

// Minimal "currently playing" descriptor.
export type QueueItem = {
  uid: UID | null
  source: QueueSource | null
  track: Track | null
  user: User | null
}

// A single entry in the playback queue. Identity is (queue[index], trackId).
// The queue may contain duplicates; index disambiguates them.
export type PlaybackTrack = {
  trackId: ID
  // Free-form-ish source tag (e.g. 'trending-week', 'profile:handle:tracks').
  // Used for analytics, mobile offline-download checks, and PlaylistLibrary
  // current-track highlighting.
  source: string
  playerBehavior?: PlayerBehavior
  // UID matching what the rendered tile uses, so tile-highlight comparisons
  // (playingUid === entry.uid) match. The saga generates one if absent.
  uid?: UID
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
  playingUid: UID | null
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
  shuffleOrder: number[]
  shuffleIndex: number

  querySource: PlaybackQuerySource | null

  retries: number

  // True when next() was a no-op because we're at end of queue with
  // repeat=OFF. The saga reads this to reset rather than re-load the same
  // track. Cleared on play/playFrom/playTrackAt and any successful advance.
  overshot: boolean
  // Same idea for previous() at start of queue.
  undershot: boolean
}

import { ID } from '../../models'
import { PlaybackRate, PlayerBehavior } from '../player/types'
import { RepeatMode } from '../queue/types'

// A single entry in the playback queue. Unlike the legacy queue there is no
// compound UID — identity is (queue[index], trackId). The queue may contain
// duplicates; index disambiguates them.
export type PlaybackTrack = {
  trackId: ID
  // Free-form string identifying the origin of this track (e.g. 'trending-week',
  // 'profile:handle:tracks'). Used for analytics and for the saga to know
  // which tanquery to paginate.
  source: string
  playerBehavior?: PlayerBehavior
  // Optional legacy UID. While the old queue/player slice is still kept as a
  // shadow (so PlayBar / Now Playing / mobile selectors keep working), we need
  // the shadow queue entries to carry the same UIDs as the rendered lineup
  // tiles — otherwise tile-highlight comparisons (playingUid === entry.uid)
  // won't match. This field is a temporary compat bridge; remove it once the
  // legacy queue slice is deleted.
  legacyUid?: string
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

  playing: boolean
  buffering: boolean
  previewing: boolean

  seek: number | null
  seekCounter: number

  // Increments on every "new play" — used by listen-recording logic to
  // distinguish a replay of the same track from a fresh one.
  counter: number

  playbackRate: PlaybackRate

  repeat: RepeatMode
  shuffle: boolean
  shuffleOrder: number[]
  shuffleIndex: number

  querySource: PlaybackQuerySource | null

  retries: number

  // True when next() was a no-op because we're at end of queue with
  // repeat=OFF. Saga reads this to reset the player instead of looping
  // back to the same track. Cleared on play/playFrom/playTrackAt and on
  // any successful advance.
  overshot: boolean
  // Same idea for previous() at start of queue.
  undershot: boolean
}

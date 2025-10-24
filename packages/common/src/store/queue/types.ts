import { ID, UID, Track, User } from '../../models'
import type { PlayerBehavior } from '../player/types'

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
  EXPLORE = 'EXPLORE'
}

export type Queueable = {
  id: ID | string
  uid: UID
  artistId?: ID
  source: QueueSource
  playerBehavior?: PlayerBehavior
}

export type QueueItem = {
  uid: UID | null
  source: QueueSource | null
  track: Track | null
  user: User | null
}

export type QueueState = {
  order: Queueable[]

  // Maps track UIDs to the index
  positions: { [uid: string]: number }

  // Active index
  index: number

  repeat: RepeatMode

  shuffle: boolean
  shuffleIndex: number
  // Ordering of the indexes of the queue to shuffle through
  shuffleOrder: number[]

  // Whether or not a `next` was fired on the queue that overshoots
  // the length of the queue (`next` from the last track).
  // Reset to false on the next play.
  overshot: boolean

  // Whether or not a `previous` was fired on the queue that undershoots
  // the length of the queue (`previous` from the first track).
  // Reset to false on the next play.
  undershot: boolean
}

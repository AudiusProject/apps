import {
  FollowRow,
  PlaylistRow,
  RepostRow,
  SaveRow,
  TrackRow,
  UserRow,
} from './db'

export type EntityUserDoc = {
  handle: string
  name: string
  location: string
  follower_count: number
  created_at: Date
  updated_at: Date
}

export type PlaylistDoc = PlaylistRow & {
  suggest: string
  tracks: TrackDoc[]
  save_count: number
  routes: string[]
  permalink: string
  saved_by: number[]
  repost_count: number
  reposted_by: number[]
  total_play_count: number
  user: EntityUserDoc
  dominant_mood: string
  purchaseable: boolean
}

export type UserDoc = UserRow & {
  suggest: string
  tracks: TrackRow[]
  track_count: number
  following_ids: number[]
  following_count: number
  subscribed_ids: number[]
}

export type TrackDoc = TrackRow & {
  suggest: string
  reposted_by: number[]
  saved_by: number[]
  routes: string[]
  permalink: string
  tag_list: string[]
  repost_count: number
  save_count: number
  favorite_count: number
  comment_count: number
  play_count: any
  downloadable: boolean
  purchaseable: boolean
  purchaseable_download: boolean
  user: EntityUserDoc
  duration: number
  stem_ids: number[]
  has_stems: boolean
}

export type RepostDoc = RepostRow & {
  item_key: string
  repost_id: string
}

export type SaveDoc = SaveRow & {
  item_key: string
  save_id: string
}

export type FollowDoc = FollowRow & {
  follow_id: string
}

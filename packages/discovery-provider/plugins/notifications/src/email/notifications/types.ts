export enum DeviceType {
  Mobile = 'mobile',
  Browser = 'browser'
}

export enum EntityType {
  Track = 'track',
  Playlist = 'playlist',
  Album = 'album'
}

export enum DMEntityType {
  Message = 'message',
  Reaction = 'messageReaction'
}

export type User = {
  // User's name to display in email
  name: string
  // URL to the user's profile pic
  imageUrl: string
}

export type Entity = {
  // User's name to display in email
  type: EntityType
  // Display name of the track/playlist/album
  name: string
}

export type Announcement = {
  text: string
}

export type BaseNotification = {
  users: User[]
  entity: Entity
}

export type Follow = BaseNotification & { type: 'follow' }
export type Repost = BaseNotification & { type: 'repost' }
export type Milestone = {
  type: 'milestone'
  value: number
  achievement: string
  entity: Entity
}

export type MilestoneFollow = {
  type: 'milestone'
  value: number
  achievement: string
}

export type TrendingTrack = {
  type: 'trendingTrack'
  entity: Entity
  rank: number
}

export type UserSubscription = {
  type: 'userSubscription'
  entity: Entity
  rank: number
}

export type Notification = Announcement | Follow | Repost

export type ChallengeId =
  | 'referred'
  | 'referrals'
  | 'ref-v'
  | 'connect-verified'
  | 'listen-streak'
  | 'mobile-install'
  | 'p'
  | 'u'
  | 'send-first-tip'
  | 'first-playlist'

export type NotificationType =
  | 'favorite'
  | 'repost'
  | 'save'
  | 'follow'
  | 'announcement'
  | 'milestone'
  | 'trendingTrack'
  | 'createTrack'
  | 'create'
  | 'chllenge_reward'
  | 'remix'
  | 'cosign'
  | 'tip_receive'
  | 'tip_send'
  | 'reaction'
  | 'supporter_rank_up'
  | 'supporting_rank_up'
  | 'track_added_to_playlist'

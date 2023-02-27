import { ChallengeId, EntityType, DMEntityType } from '../email/notifications/types'
import { NotificationRow } from './dn'

export type DMNotification = {
  sender_user_id: number
  receiver_user_id: number
  timestamp: Date
}

export type DMReactionNotification = {
  sender_user_id: number
  receiver_user_id: number
  reaction: string
  timestamp: Date
}

export type DMEmailNotification = {
  type: DMEntityType
  sender_user_id: number
  receiver_user_id: number
  multiple?: boolean
}

export type AppEmailNotification = {
  receiver_user_id: number
} & NotificationRow

export type EmailNotification = AppEmailNotification | DMEmailNotification

export type EmailUser = {
  user_id: number
  name: string
  profile_picture_sizes: string
  profile_picture: string
  creator_node_endpoint: string
  imageUrl: string
}

export type FollowNotification = {
  follower_user_id: number
  followee_user_id: number
}

export type FollowNotificationEmail = {
  type: 'follow'
  data: FollowNotification
  followerUser: EmailUser
}

export type RepostNotification = {
  type: EntityType
  user_id: number
  repost_item_id: number
}

export type SaveNotification = {
  type: EntityType
  user_id: number
  save_item_id: number
}

export type MilestoneNotification = {
  type: EntityType
  threshold: number
}

export type RemixNotification = {
  parent_track_id: number
  track_id: number
}

export type CosignRemixNotification = {
  parent_track_id: number
  track_id: number
}

export type CreateTrackNotification = {
  track_id: number
}

export type CreatePlaylistNotification = {
  is_album: boolean
  playlist_id: number
}

export type TipReceiveNotification = {
  amount: number
  sender_user_id: number
  receiver_user_id: number
}

export type TipSendNotification = {
  amount: number
  sender_user_id: number
  receiver_user_id: number
}

export type ChallengeRewardNotification = {
  amount: number
  specifier: string
  challenge_id: ChallengeId
}

export type ReactionNotification = {
  reacted_to: string
  reaction_type: string
  reaction_value: number
  sender_wallet: string
  receiver_user_id: number
  sender_user_id: number
  tip_amount: string
}

export type SupporterRankUpNotification = {
  rank: number
  sender_user_id: number
  receiver_user_id: number
}

export type SupportingRankUpNotification = {
  rank: number
  sender_user_id: number
  receiver_user_id: number
}

export type SupporterDethronedNotification = {
  sender_user_id: number
  receiver_user_id: number
  dethroned_user_id: number
}

export enum MilestoneType {
  FOLLOWER_COUNT = 'FOLLOWER_COUNT',
  TRACK_REPOST_COUNT = 'TRACK_REPOST_COUNT',
  TRACK_SAVE_COUNT = 'TRACK_SAVE_COUNT',
  PLAYLIST_REPOST_COUNT = 'PLAYLIST_REPOST_COUNT',
  PLAYLIST_SAVE_COUNT = 'PLAYLIST_SAVE_COUNT',
}

export type AddTrackToPlaylistNotification = {
  track_id: number
  playlist_id: number
}

export type FollowerMilestoneNotification = {
  type: MilestoneType.FOLLOWER_COUNT
  user_id: number
  threshold: number
}

export type TrackMilestoneNotification = {
  type: MilestoneType.TRACK_REPOST_COUNT | MilestoneType.TRACK_SAVE_COUNT
  track_id: number
  threshold: number
}

export type PlaylistMilestoneNotification = {
  type: MilestoneType.PLAYLIST_REPOST_COUNT | MilestoneType.PLAYLIST_SAVE_COUNT
  playlist_id: number
  threshold: number
}

export type TierChangeNotification = {
  new_tier: string
  new_tier_value: number
  current_value: string
}

export type NotificationData =
  | DMNotification
  | DMReactionNotification
  | FollowNotification
  | RepostNotification
  | SaveNotification
  | MilestoneNotification
  | RemixNotification
  | CosignRemixNotification
  | CreateTrackNotification
  | CreatePlaylistNotification
  | TipReceiveNotification
  | TipSendNotification
  | ChallengeRewardNotification
  | ReactionNotification
  | SupporterRankUpNotification
  | SupportingRankUpNotification
  | FollowerMilestoneNotification
  | TrackMilestoneNotification
  | PlaylistMilestoneNotification
  | TierChangeNotification
  | SupporterDethronedNotification
  | AddTrackToPlaylistNotification
